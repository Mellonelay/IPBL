-- Resumable official-IPBL backfill worker contract.
-- The operational SHA-256 of CRON_SECRET is provisioned separately and is never committed.
-- SECURITY DEFINER functions use an empty search_path and validate the secret hash.

create extension if not exists pgcrypto with schema extensions;

create table if not exists private.backfill_worker_config (
  singleton boolean primary key default true check (singleton),
  secret_sha256 text not null check (secret_sha256 ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);
revoke all on table private.backfill_worker_config from public, anon, authenticated;

alter table public.backfill_failures
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_code text;

create unique index if not exists backfill_segments_run_division_window_uidx
  on public.backfill_segments (run_id, division_id, window_start, window_end);
create unique index if not exists source_observations_source_hash_uidx
  on public.source_observations (source, payload_sha256);
create index if not exists backfill_segments_division_idx
  on public.backfill_segments (division_id, window_start);
create index if not exists source_observations_division_idx
  on public.source_observations (division_id, received_at desc);
create index if not exists team_aliases_division_idx
  on public.team_aliases (division_id, source, source_team_id);

CREATE OR REPLACE FUNCTION private.refresh_ipbl_backfill_run(p_run_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_total integer;
  v_verified integer;
  v_quarantined integer;
  v_open integer;
begin
  select
    count(*)::integer,
    count(*) filter (where status in ('verified', 'confirmed_empty'))::integer,
    count(*) filter (where status = 'quarantined')::integer,
    count(*) filter (where status in ('pending', 'running', 'retryable_failure'))::integer
  into v_total, v_verified, v_quarantined, v_open
  from public.backfill_segments
  where run_id = p_run_id;

  update public.backfill_runs
  set segment_count = coalesce(v_total, 0),
      verified_segment_count = coalesce(v_verified, 0),
      quarantined_segment_count = coalesce(v_quarantined, 0),
      status = case
        when coalesce(v_open, 0) > 0 then 'running'
        when coalesce(v_quarantined, 0) > 0 then 'partial'
        else 'verified'
      end,
      completed_at = case when coalesce(v_open, 0) = 0 then now() else null end
  where id = p_run_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.require_ipbl_backfill_secret(p_secret text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_expected text;
  v_actual text;
begin
  select secret_sha256 into v_expected
  from private.backfill_worker_config
  where singleton = true;

  if v_expected is null then
    raise exception 'backfill worker is not configured' using errcode = '28000';
  end if;

  v_actual := encode(extensions.digest(convert_to(coalesce(p_secret, ''), 'UTF8'), 'sha256'), 'hex');
  if length(coalesce(p_secret, '')) < 20 or v_actual <> v_expected then
    raise exception 'unauthorized backfill worker' using errcode = '28000';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ipbl_backfill_status(p_secret text, p_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  perform private.require_ipbl_backfill_secret(p_secret);
  perform private.refresh_ipbl_backfill_run(p_run_id);
  select jsonb_build_object(
    'run', jsonb_build_object(
      'id', r.id, 'kind', r.run_kind, 'status', r.status,
      'started_at', r.started_at, 'completed_at', r.completed_at,
      'segment_count', r.segment_count, 'verified_segment_count', r.verified_segment_count,
      'quarantined_segment_count', r.quarantined_segment_count
    ),
    'segments', (select coalesce(jsonb_object_agg(status, count_value), '{}'::jsonb)
      from (select status, count(*)::integer count_value from public.backfill_segments where run_id = p_run_id group by status) counts),
    'data', jsonb_build_object(
      'games', (select count(*)::integer from public.games),
      'periods', (select count(*)::integer from public.game_periods),
      'observations', (select count(*)::integer from public.source_observations),
      'failures', (select count(*)::integer from public.backfill_failures f join public.backfill_segments s on s.id=f.segment_id where s.run_id=p_run_id and f.resolved_at is null)
    ),
    'divisions', (select coalesce(jsonb_agg(jsonb_build_object(
      'tag', d.tag, 'segments', c.segment_count, 'verified', c.verified_count,
      'quarantined', c.quarantined_count, 'games', c.game_count
    ) order by d.tag), '[]'::jsonb)
    from public.divisions d
    join lateral (
      select count(*)::integer segment_count,
             count(*) filter (where s.status in ('verified','confirmed_empty'))::integer verified_count,
             count(*) filter (where s.status='quarantined')::integer quarantined_count,
             (select count(*)::integer from public.games g where g.division_id=d.id) game_count
      from public.backfill_segments s where s.run_id=p_run_id and s.division_id=d.id
    ) c on c.segment_count>0)
  ) into v_result from public.backfill_runs r where r.id=p_run_id;
  if v_result is null then raise exception 'run not found'; end if;
  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ipbl_claim_backfill_segments(p_secret text, p_run_id uuid, p_worker_id text, p_limit integer DEFAULT 6, p_lease_seconds integer DEFAULT 300)
 RETURNS TABLE(segment_id uuid, division_tag text, window_start date, window_end date, attempt_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_ipbl_backfill_secret(p_secret);
  if length(coalesce(p_worker_id, '')) < 3 then raise exception 'invalid worker id'; end if;

  return query
  with picked as (
    select s.id
    from public.backfill_segments s
    join public.divisions d on d.id = s.division_id
    where s.run_id = p_run_id
      and s.attempt_count < 5
      and (
        s.status in ('pending', 'retryable_failure')
        or (s.status = 'running' and coalesce(s.lease_expires_at, '-infinity'::timestamptz) < now())
      )
    order by s.window_start, d.tag
    for update of s skip locked
    limit greatest(1, least(coalesce(p_limit, 6), 12))
  ), claimed as (
    update public.backfill_segments s
    set status = 'running',
        attempt_count = s.attempt_count + 1,
        lease_owner = p_worker_id,
        lease_expires_at = now() + make_interval(secs => greatest(60, least(coalesce(p_lease_seconds, 300), 900))),
        started_at = coalesce(s.started_at, now()),
        completed_at = null,
        last_error_code = null
    from picked
    where s.id = picked.id
    returning s.id, s.division_id, s.window_start, s.window_end, s.attempt_count
  )
  select c.id, d.tag, c.window_start, c.window_end, c.attempt_count
  from claimed c
  join public.divisions d on d.id = c.division_id
  order by c.window_start, d.tag;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ipbl_commit_backfill_segment(p_secret text, p_segment_id uuid, p_worker_id text, p_observations jsonb, p_games jsonb, p_periods jsonb, p_metrics jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_segment public.backfill_segments%rowtype;
  v_run_id uuid;
  v_observation jsonb;
  v_game jsonb;
  v_period jsonb;
  v_home_team_id uuid;
  v_away_team_id uuid;
  v_game_id uuid;
  v_observed integer := 0;
  v_accepted integer := 0;
  v_quarantined integer := 0;
  v_status text;
begin
  perform private.require_ipbl_backfill_secret(p_secret);
  select * into v_segment from public.backfill_segments where id = p_segment_id for update;
  if v_segment.id is null then raise exception 'segment not found'; end if;
  if v_segment.status <> 'running' or v_segment.lease_owner <> p_worker_id then raise exception 'segment lease mismatch'; end if;
  if coalesce(v_segment.lease_expires_at, '-infinity'::timestamptz) < now() then raise exception 'segment lease expired'; end if;
  v_run_id := v_segment.run_id;

  for v_observation in select value from jsonb_array_elements(coalesce(p_observations, '[]'::jsonb)) loop
    v_observed := v_observed + 1;
    insert into public.source_observations (
      source, entity_kind, source_record_id, official_game_id, division_id,
      source_event_at, source_updated_at, received_at, payload,
      payload_sha256, parser_version, acceptance_state, rejection_code
    ) values (
      'official_ipbl', coalesce(nullif(v_observation->>'entity_kind', ''), 'result'),
      nullif(v_observation->>'source_record_id', ''), nullif(v_observation->>'official_game_id', '')::bigint,
      v_segment.division_id, nullif(v_observation->>'source_event_at', '')::timestamptz,
      nullif(v_observation->>'source_updated_at', '')::timestamptz,
      coalesce(nullif(v_observation->>'received_at', '')::timestamptz, now()),
      coalesce(v_observation->'payload', '{}'::jsonb), v_observation->>'payload_sha256',
      coalesce(nullif(v_observation->>'parser_version', ''), 'official-calendar-v1'),
      coalesce(nullif(v_observation->>'acceptance_state', ''), 'pending'),
      nullif(v_observation->>'rejection_code', '')
    ) on conflict (source, payload_sha256) do nothing;
    if coalesce(v_observation->>'acceptance_state', '') = 'quarantined' then v_quarantined := v_quarantined + 1; end if;
  end loop;

  for v_game in select value from jsonb_array_elements(coalesce(p_games, '[]'::jsonb)) loop
    select ta.team_id into v_home_team_id from public.team_aliases ta
    where ta.division_id = v_segment.division_id and ta.source = 'official_ipbl'
      and ta.source_team_id = v_game->>'home_source_team_id' and ta.alias_status = 'verified';
    select ta.team_id into v_away_team_id from public.team_aliases ta
    where ta.division_id = v_segment.division_id and ta.source = 'official_ipbl'
      and ta.source_team_id = v_game->>'away_source_team_id' and ta.alias_status = 'verified';

    if v_home_team_id is null or v_away_team_id is null or v_home_team_id = v_away_team_id then
      v_quarantined := v_quarantined + 1;
      insert into public.backfill_failures (
        segment_id, source, source_record_id, official_game_id,
        failure_code, safe_message, evidence, retryable
      ) values (
        p_segment_id, 'official_ipbl', v_game->>'official_game_id', nullif(v_game->>'official_game_id', '')::bigint,
        'unresolved_team_identity', 'Official team identity did not resolve uniquely.',
        jsonb_build_object('home_source_team_id', v_game->>'home_source_team_id', 'away_source_team_id', v_game->>'away_source_team_id'), false
      );
      continue;
    end if;

    insert into public.games as current_game (
      official_game_id, division_id, home_team_id, away_team_id,
      scheduled_at, source_local_date, source_local_time, status,
      verification_state, home_score, away_score, full_score,
      canonical_source, source_event_at, source_updated_at,
      received_at, canonicalized_at, evidence_version, normalizer_version
    ) values (
      (v_game->>'official_game_id')::bigint, v_segment.division_id, v_home_team_id, v_away_team_id,
      nullif(v_game->>'scheduled_at', '')::timestamptz, nullif(v_game->>'source_local_date', '')::date,
      nullif(v_game->>'source_local_time', '')::time, v_game->>'status',
      coalesce(nullif(v_game->>'verification_state', ''), 'verified'),
      nullif(v_game->>'home_score', '')::integer, nullif(v_game->>'away_score', '')::integer,
      nullif(v_game->>'full_score', ''), 'official_ipbl',
      nullif(v_game->>'source_event_at', '')::timestamptz, nullif(v_game->>'source_updated_at', '')::timestamptz,
      coalesce(nullif(v_game->>'received_at', '')::timestamptz, now()), now(),
      coalesce(nullif(v_game->>'evidence_version', '')::integer, 1),
      coalesce(nullif(v_game->>'normalizer_version', ''), 'official-calendar-v1')
    ) on conflict (official_game_id) do update set
      division_id = excluded.division_id, home_team_id = excluded.home_team_id, away_team_id = excluded.away_team_id,
      scheduled_at = excluded.scheduled_at, source_local_date = excluded.source_local_date,
      source_local_time = excluded.source_local_time, status = excluded.status,
      verification_state = excluded.verification_state, home_score = excluded.home_score,
      away_score = excluded.away_score, full_score = excluded.full_score,
      canonical_source = excluded.canonical_source, source_event_at = excluded.source_event_at,
      source_updated_at = excluded.source_updated_at, received_at = excluded.received_at,
      canonicalized_at = excluded.canonicalized_at,
      evidence_version = greatest(current_game.evidence_version, excluded.evidence_version),
      normalizer_version = excluded.normalizer_version
    where coalesce(excluded.source_updated_at, excluded.source_event_at, excluded.received_at)
       >= coalesce(current_game.source_updated_at, current_game.source_event_at, current_game.received_at)
    returning id into v_game_id;
    if v_game_id is null then select id into v_game_id from public.games where official_game_id = (v_game->>'official_game_id')::bigint; end if;
    v_accepted := v_accepted + 1;
  end loop;

  for v_period in select value from jsonb_array_elements(coalesce(p_periods, '[]'::jsonb)) loop
    select id into v_game_id from public.games where official_game_id = (v_period->>'official_game_id')::bigint;
    if v_game_id is not null then
      insert into public.game_periods as current_period (
        game_id, period_number, period_type, home_score, away_score,
        evidence_complete, canonical_source, source_event_at, received_at
      ) values (
        v_game_id, (v_period->>'period_number')::smallint,
        coalesce(nullif(v_period->>'period_type', ''), 'quarter'),
        (v_period->>'home_score')::integer, (v_period->>'away_score')::integer,
        coalesce(nullif(v_period->>'evidence_complete', '')::boolean, true),
        'official_ipbl', nullif(v_period->>'source_event_at', '')::timestamptz,
        coalesce(nullif(v_period->>'received_at', '')::timestamptz, now())
      ) on conflict (game_id, period_number) do update set
        period_type = excluded.period_type, home_score = excluded.home_score,
        away_score = excluded.away_score, evidence_complete = excluded.evidence_complete,
        canonical_source = excluded.canonical_source, source_event_at = excluded.source_event_at,
        received_at = excluded.received_at, updated_at = now()
      where excluded.received_at >= current_period.received_at;
    end if;
  end loop;

  v_status := case when v_observed = 0 then 'confirmed_empty' when v_quarantined > 0 then 'quarantined' else 'verified' end;
  update public.backfill_segments set
    status = v_status, observed_game_count = v_observed, accepted_game_count = v_accepted,
    quarantined_game_count = v_quarantined,
    verified_through_date = case when v_status in ('verified', 'confirmed_empty') then window_end else null end,
    cursor_state = coalesce(p_metrics, '{}'::jsonb), lease_owner = null, lease_expires_at = null,
    completed_at = now(), last_error_code = case when v_status = 'quarantined' then 'quarantined_evidence' else null end
  where id = p_segment_id;

  if v_status in ('verified', 'confirmed_empty') then
    update public.backfill_failures set resolved_at = now(), resolution_code = 'segment_reprocessed'
    where segment_id = p_segment_id and resolved_at is null;
  end if;

  perform private.refresh_ipbl_backfill_run(v_run_id);
  return jsonb_build_object('segment_id', p_segment_id, 'status', v_status, 'observed', v_observed, 'accepted', v_accepted, 'quarantined', v_quarantined);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ipbl_fail_backfill_segment(p_secret text, p_segment_id uuid, p_worker_id text, p_error_code text, p_safe_message text, p_retryable boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_segment public.backfill_segments%rowtype;
  v_status text;
begin
  perform private.require_ipbl_backfill_secret(p_secret);
  select * into v_segment from public.backfill_segments where id = p_segment_id for update;
  if v_segment.id is null then raise exception 'segment not found'; end if;
  if v_segment.status <> 'running' or v_segment.lease_owner <> p_worker_id then
    raise exception 'segment lease mismatch';
  end if;

  v_status := case
    when p_retryable and v_segment.attempt_count < 5 then 'retryable_failure'
    else 'quarantined'
  end;

  insert into public.backfill_failures (
    segment_id, source, failure_code, safe_message, retryable
  ) values (
    p_segment_id, 'official_ipbl', coalesce(nullif(p_error_code, ''), 'source_error'),
    left(coalesce(p_safe_message, 'Official source request failed.'), 500),
    v_status = 'retryable_failure'
  );

  update public.backfill_segments
  set status = v_status,
      last_error_code = coalesce(nullif(p_error_code, ''), 'source_error'),
      lease_owner = null,
      lease_expires_at = null,
      completed_at = case when v_status = 'quarantined' then now() else null end
  where id = p_segment_id;

  perform private.refresh_ipbl_backfill_run(v_segment.run_id);
  return jsonb_build_object('segment_id', p_segment_id, 'status', v_status);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ipbl_start_backfill(p_secret text, p_run_kind text, p_from date, p_to date, p_division_tags text[] DEFAULT NULL::text[], p_requested_by text DEFAULT 'vercel'::text, p_normalizer_version text DEFAULT 'official-calendar-v1'::text, p_evidence_version integer DEFAULT 1)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_run_id uuid;
  v_count integer;
begin
  perform private.require_ipbl_backfill_secret(p_secret);

  if p_run_kind not in ('last_30_days', 'current_season', 'historical', 'reconciliation') then
    raise exception 'invalid run kind';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'invalid date range';
  end if;
  if (p_to - p_from) > 62 then
    raise exception 'date range exceeds 63 days';
  end if;

  insert into public.backfill_runs (
    run_kind, status, normalizer_version, evidence_version,
    requested_by, started_at, metadata
  ) values (
    p_run_kind, 'running', p_normalizer_version, p_evidence_version,
    p_requested_by, now(), jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'division_tags', coalesce(to_jsonb(p_division_tags), 'null'::jsonb)
    )
  ) returning id into v_run_id;

  insert into public.backfill_segments (run_id, division_id, window_start, window_end)
  select v_run_id, d.id, day_value::date, day_value::date
  from public.divisions d
  cross join generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') day_value
  where d.active
    and (p_division_tags is null or cardinality(p_division_tags) = 0 or d.tag = any(p_division_tags))
    and (d.valid_from is null or d.valid_from <= day_value::date)
    and (d.valid_to is null or d.valid_to >= day_value::date)
  on conflict (run_id, division_id, window_start, window_end) do nothing;

  select count(*)::integer into v_count
  from public.backfill_segments
  where run_id = v_run_id;

  update public.backfill_runs
  set segment_count = v_count,
      status = case when v_count > 0 then 'running' else 'failed' end,
      completed_at = case when v_count = 0 then now() else null end
  where id = v_run_id;

  if v_count = 0 then
    raise exception 'no eligible backfill segments';
  end if;

  return v_run_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ipbl_team_history_worker(p_secret text, p_team_id bigint, p_division_tag text, p_limit integer DEFAULT 1000)
 RETURNS SETOF public.team_history_games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_ipbl_backfill_secret(p_secret);
  return query
  select h.*
  from public.team_history_games h
  where h.division_tag = p_division_tag
    and (h.home_source_team_id = p_team_id or h.away_source_team_id = p_team_id)
  order by h.scheduled_at desc
  limit greatest(1, least(coalesce(p_limit, 1000), 2000));
end;
$function$
;

revoke execute on function private.require_ipbl_backfill_secret(text) from public, anon, authenticated;
revoke execute on function private.refresh_ipbl_backfill_run(uuid) from public, anon, authenticated;
revoke execute on function public.ipbl_start_backfill(text, text, date, date, text[], text, text, integer) from public, authenticated;
revoke execute on function public.ipbl_claim_backfill_segments(text, uuid, text, integer, integer) from public, authenticated;
revoke execute on function public.ipbl_commit_backfill_segment(text, uuid, text, jsonb, jsonb, jsonb, jsonb) from public, authenticated;
revoke execute on function public.ipbl_fail_backfill_segment(text, uuid, text, text, text, boolean) from public, authenticated;
revoke execute on function public.ipbl_backfill_status(text, uuid) from public, authenticated;
revoke execute on function public.ipbl_team_history_worker(text, bigint, text, integer) from public, authenticated;

grant execute on function public.ipbl_start_backfill(text, text, date, date, text[], text, text, integer) to anon;
grant execute on function public.ipbl_claim_backfill_segments(text, uuid, text, integer, integer) to anon;
grant execute on function public.ipbl_commit_backfill_segment(text, uuid, text, jsonb, jsonb, jsonb, jsonb) to anon;
grant execute on function public.ipbl_fail_backfill_segment(text, uuid, text, text, text, boolean) to anon;
grant execute on function public.ipbl_backfill_status(text, uuid) to anon;
grant execute on function public.ipbl_team_history_worker(text, bigint, text, integer) to anon;
