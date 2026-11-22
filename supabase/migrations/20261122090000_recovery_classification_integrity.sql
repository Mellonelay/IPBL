-- Source-only until an independently verified production backup or PITR checkpoint is available.
-- Idempotent function replacement: preserves all canonical games, raw observations and segment rows.
-- Rollback: restore ipbl_commit_backfill_segment function body from migration
-- 20261122000000_recovery_order_and_unverified_empty.sql after checking lease state.
-- This intentionally quarantines zero-accepted days until an authoritative
-- division/day empty-completeness proof can safely certify them.
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
    if coalesce(v_observation->>'acceptance_state', '') = 'quarantined'
       or v_observation->>'rejection_code' = 'unparseable_row' then
      v_quarantined := v_quarantined + 1;
    end if;
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

  v_status := case when v_accepted = 0 then 'quarantined' when v_quarantined > 0 then 'quarantined' else 'verified' end;
  update public.backfill_segments set
    status = v_status, observed_game_count = v_observed, accepted_game_count = v_accepted,
    quarantined_game_count = v_quarantined,
    verified_through_date = case when v_status in ('verified', 'confirmed_empty') then window_end else null end,
    cursor_state = coalesce(p_metrics, '{}'::jsonb), lease_owner = null, lease_expires_at = null,
    completed_at = now(), last_error_code = case when v_accepted = 0 then 'unverified_no_accepted_games' when v_status = 'quarantined' then 'quarantined_evidence' else null end
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
