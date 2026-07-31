-- IPBL canonical evidence schema.
-- Remote application is intentionally separate from this migration.
-- Apply only to direct Supabase project hdrkrtfpcuzsbegytrei after explicit remote-migration approval.

create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique,
  label text not null,
  division_group text not null check (division_group in ('men', 'women')),
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  short_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_aliases (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  division_id uuid references public.divisions(id) on delete restrict,
  source text not null,
  source_team_id text not null,
  alias_name text not null,
  normalized_alias text not null,
  alias_status text not null default 'verified'
    check (alias_status in ('verified', 'quarantined', 'retired')),
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, division_id, source_team_id)
);

create unique index team_aliases_verified_name_uq
  on public.team_aliases (source, division_id, normalized_alias)
  where alias_status = 'verified';
create index team_aliases_team_idx on public.team_aliases (team_id, source);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  official_game_id bigint not null unique,
  division_id uuid not null references public.divisions(id) on delete restrict,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  pair_low_id uuid generated always as (least(home_team_id, away_team_id)) stored,
  pair_high_id uuid generated always as (greatest(home_team_id, away_team_id)) stored,
  scheduled_at timestamptz,
  source_local_date date,
  source_local_time time,
  status text not null,
  verification_state text not null default 'pending'
    check (verification_state in ('pending', 'verified', 'reconciled', 'quarantined', 'rejected')),
  home_score integer,
  away_score integer,
  full_score text,
  canonical_source text not null,
  source_event_at timestamptz,
  source_updated_at timestamptz,
  received_at timestamptz not null default now(),
  canonicalized_at timestamptz,
  evidence_version integer not null default 1 check (evidence_version > 0),
  normalizer_version text not null,
  correction_version integer not null default 0 check (correction_version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id),
  check ((home_score is null) = (away_score is null)),
  check (home_score is null or home_score >= 0),
  check (away_score is null or away_score >= 0)
);

create index games_division_schedule_idx
  on public.games (division_id, scheduled_at desc, official_game_id desc);
create index games_team_home_schedule_idx
  on public.games (home_team_id, scheduled_at desc, official_game_id desc);
create index games_team_away_schedule_idx
  on public.games (away_team_id, scheduled_at desc, official_game_id desc);
create index games_h2h_verified_finished_idx
  on public.games (pair_low_id, pair_high_id, scheduled_at desc, official_game_id desc)
  where verification_state in ('verified', 'reconciled')
    and status in ('Result', 'ResultConfirmed', 'Finished', 'Completed');

create table public.game_periods (
  game_id uuid not null references public.games(id) on delete cascade,
  period_number smallint not null check (period_number > 0),
  period_type text not null default 'quarter'
    check (period_type in ('quarter', 'overtime')),
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  evidence_complete boolean not null default true,
  canonical_source text not null,
  source_event_at timestamptz,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_id, period_number)
);

create table public.source_observations (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  entity_kind text not null check (entity_kind in ('game', 'period', 'live_state', 'fixture', 'result')),
  source_record_id text,
  official_game_id bigint,
  division_id uuid references public.divisions(id) on delete restrict,
  source_event_at timestamptz,
  source_updated_at timestamptz,
  received_at timestamptz not null default now(),
  payload jsonb not null,
  payload_sha256 text not null,
  parser_version text not null,
  acceptance_state text not null default 'pending'
    check (acceptance_state in ('pending', 'accepted', 'rejected', 'quarantined')),
  rejection_code text,
  created_at timestamptz not null default now()
);

create unique index source_observations_dedupe_uq
  on public.source_observations (source, entity_kind, coalesce(source_record_id, ''), payload_sha256);
create index source_observations_game_time_idx
  on public.source_observations (official_game_id, received_at desc)
  where official_game_id is not null;
create index source_observations_source_time_idx
  on public.source_observations (source, received_at desc);

create table public.current_live_state (
  game_id uuid primary key references public.games(id) on delete cascade,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  period_number smallint check (period_number > 0),
  clock_text text,
  live_status text not null,
  state_source text not null,
  source_event_at timestamptz,
  received_at timestamptz not null,
  canonicalized_at timestamptz not null default now(),
  evidence_version integer not null default 1 check (evidence_version > 0),
  updated_at timestamptz not null default now()
);

create table public.source_health (
  source text not null,
  scope text not null default 'global',
  health_status text not null
    check (health_status in ('healthy', 'degraded', 'unavailable', 'unknown')),
  checked_at timestamptz not null,
  last_success_at timestamptz,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (source, scope)
);

create table public.backfill_runs (
  id uuid primary key default gen_random_uuid(),
  run_kind text not null check (run_kind in ('last_30_days', 'current_season', 'historical', 'reconciliation')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'verified', 'partial', 'failed', 'cancelled')),
  normalizer_version text not null,
  evidence_version integer not null default 1 check (evidence_version > 0),
  requested_by text not null,
  started_at timestamptz,
  completed_at timestamptz,
  segment_count integer not null default 0 check (segment_count >= 0),
  verified_segment_count integer not null default 0 check (verified_segment_count >= 0),
  quarantined_segment_count integer not null default 0 check (quarantined_segment_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.backfill_segments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.backfill_runs(id) on delete cascade,
  division_id uuid not null references public.divisions(id) on delete restrict,
  window_start date not null,
  window_end date not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'verified', 'confirmed_empty', 'retryable_failure', 'quarantined')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  cursor_state jsonb not null default '{}'::jsonb,
  observed_game_count integer not null default 0 check (observed_game_count >= 0),
  accepted_game_count integer not null default 0 check (accepted_game_count >= 0),
  quarantined_game_count integer not null default 0 check (quarantined_game_count >= 0),
  verified_through_date date,
  last_error_code text,
  lease_owner text,
  lease_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (window_end >= window_start),
  unique (run_id, division_id, window_start, window_end)
);

create index backfill_segments_queue_idx
  on public.backfill_segments (status, lease_expires_at, window_start)
  where status in ('pending', 'retryable_failure');

create table public.backfill_failures (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.backfill_segments(id) on delete cascade,
  source text not null,
  source_record_id text,
  official_game_id bigint,
  failure_code text not null,
  safe_message text,
  evidence jsonb not null default '{}'::jsonb,
  retryable boolean not null default true,
  created_at timestamptz not null default now()
);

create index backfill_failures_segment_idx
  on public.backfill_failures (segment_id, created_at desc);

create trigger divisions_set_updated_at before update on public.divisions
for each row execute function private.set_updated_at();
create trigger teams_set_updated_at before update on public.teams
for each row execute function private.set_updated_at();
create trigger team_aliases_set_updated_at before update on public.team_aliases
for each row execute function private.set_updated_at();
create trigger games_set_updated_at before update on public.games
for each row execute function private.set_updated_at();
create trigger game_periods_set_updated_at before update on public.game_periods
for each row execute function private.set_updated_at();
create trigger current_live_state_set_updated_at before update on public.current_live_state
for each row execute function private.set_updated_at();
create trigger source_health_set_updated_at before update on public.source_health
for each row execute function private.set_updated_at();
create trigger backfill_runs_set_updated_at before update on public.backfill_runs
for each row execute function private.set_updated_at();
create trigger backfill_segments_set_updated_at before update on public.backfill_segments
for each row execute function private.set_updated_at();

create view public.team_history_games
with (security_invoker = true)
as
select
  d.tag as division_tag,
  g.official_game_id,
  g.scheduled_at,
  to_char(g.source_local_date, 'DD.MM.YYYY') as source_local_date,
  to_char(g.source_local_time, 'HH24:MI') as source_local_time,
  g.status,
  g.home_score as score1,
  g.away_score as score2,
  coalesce(g.full_score, periods.generated_full_score) as full_score,
  periods.quarter_totals,
  case when home_alias.source_team_id ~ '^[0-9]+$' then home_alias.source_team_id::bigint end as home_source_team_id,
  ht.short_name as home_short_name,
  ht.canonical_name as home_name,
  case when away_alias.source_team_id ~ '^[0-9]+$' then away_alias.source_team_id::bigint end as away_source_team_id,
  at.short_name as away_short_name,
  at.canonical_name as away_name,
  g.verification_state,
  g.canonical_source,
  g.canonicalized_at,
  g.updated_at
from public.games g
join public.divisions d on d.id = g.division_id
join public.teams ht on ht.id = g.home_team_id
join public.teams at on at.id = g.away_team_id
left join public.team_aliases home_alias
  on home_alias.team_id = g.home_team_id
 and home_alias.division_id = g.division_id
 and home_alias.source = 'official_ipbl'
 and home_alias.alias_status = 'verified'
left join public.team_aliases away_alias
  on away_alias.team_id = g.away_team_id
 and away_alias.division_id = g.division_id
 and away_alias.source = 'official_ipbl'
 and away_alias.alias_status = 'verified'
left join lateral (
  select
    string_agg(p.home_score::text || ':' || p.away_score::text, ',' order by p.period_number) as generated_full_score,
    string_agg('Q' || p.period_number::text || ' ' || (p.home_score + p.away_score)::text, ' · ' order by p.period_number)
      filter (where p.period_type = 'quarter') as quarter_totals
  from public.game_periods p
  where p.game_id = g.id
) periods on true
where g.verification_state in ('verified', 'reconciled')
  and g.status in ('Result', 'ResultConfirmed', 'Finished', 'Completed')
  and g.home_score is not null
  and g.away_score is not null;

create view public.h2h_matchup_summary
with (security_invoker = true)
as
with period_coverage as (
  select
    game_id,
    count(*) as period_count,
    count(*) filter (where evidence_complete) as complete_period_count
  from public.game_periods
  group by game_id
)
select
  g.division_id,
  g.pair_low_id,
  g.pair_high_id,
  count(*) as sample_size,
  min(coalesce(g.scheduled_at, g.source_local_date::timestamptz)) as observed_from,
  max(coalesce(g.scheduled_at, g.source_local_date::timestamptz)) as observed_to,
  count(*) filter (where pc.period_count >= 4 and pc.period_count = pc.complete_period_count) as complete_period_game_count,
  count(*) filter (where pc.period_count is null or pc.period_count < 4 or pc.period_count <> pc.complete_period_count) as missing_period_game_count,
  array_agg(distinct g.canonical_source order by g.canonical_source) as source_coverage,
  max(g.updated_at) as last_updated_at
from public.games g
left join period_coverage pc on pc.game_id = g.id
where g.verification_state in ('verified', 'reconciled')
  and g.status in ('Result', 'ResultConfirmed', 'Finished', 'Completed')
group by g.division_id, g.pair_low_id, g.pair_high_id;

create view public.team_recent_form
with (security_invoker = true)
as
select
  g.division_id,
  g.home_team_id as team_id,
  g.away_team_id as opponent_team_id,
  g.official_game_id,
  g.scheduled_at,
  g.source_local_date,
  g.home_score as points_for,
  g.away_score as points_against,
  case when g.home_score > g.away_score then 'win' when g.home_score < g.away_score then 'loss' else 'draw' end as outcome,
  g.canonical_source,
  g.updated_at
from public.games g
where g.verification_state in ('verified', 'reconciled')
  and g.status in ('Result', 'ResultConfirmed', 'Finished', 'Completed')
  and g.home_score is not null
union all
select
  g.division_id,
  g.away_team_id,
  g.home_team_id,
  g.official_game_id,
  g.scheduled_at,
  g.source_local_date,
  g.away_score,
  g.home_score,
  case when g.away_score > g.home_score then 'win' when g.away_score < g.home_score then 'loss' else 'draw' end,
  g.canonical_source,
  g.updated_at
from public.games g
where g.verification_state in ('verified', 'reconciled')
  and g.status in ('Result', 'ResultConfirmed', 'Finished', 'Completed')
  and g.away_score is not null;

create view public.quarter_tendency_summary
with (security_invoker = true)
as
with team_periods as (
  select g.division_id, g.home_team_id as team_id, p.period_number,
    p.home_score as team_points, p.away_score as opponent_points,
    p.evidence_complete, g.source_local_date, g.updated_at
  from public.games g join public.game_periods p on p.game_id = g.id
  where g.verification_state in ('verified', 'reconciled') and p.period_type = 'quarter'
  union all
  select g.division_id, g.away_team_id, p.period_number,
    p.away_score, p.home_score, p.evidence_complete, g.source_local_date, g.updated_at
  from public.games g join public.game_periods p on p.game_id = g.id
  where g.verification_state in ('verified', 'reconciled') and p.period_type = 'quarter'
)
select
  division_id,
  team_id,
  period_number,
  count(*) as sample_size,
  count(*) filter (where evidence_complete) as complete_sample_size,
  avg(team_points)::numeric(10,3) as average_team_points,
  avg(opponent_points)::numeric(10,3) as average_opponent_points,
  avg(team_points + opponent_points)::numeric(10,3) as average_total_points,
  min(source_local_date) as observed_from,
  max(source_local_date) as observed_to,
  max(updated_at) as last_updated_at
from team_periods
group by division_id, team_id, period_number;

create view public.source_agreement_summary
with (security_invoker = true)
as
select
  official_game_id,
  division_id,
  count(*) as observation_count,
  count(distinct source) as source_count,
  count(*) filter (where acceptance_state = 'accepted') as accepted_count,
  count(*) filter (where acceptance_state = 'quarantined') as quarantined_count,
  min(received_at) as first_observed_at,
  max(received_at) as last_observed_at,
  array_agg(distinct source order by source) as source_coverage
from public.source_observations
where official_game_id is not null
group by official_game_id, division_id;

create view public.results_games
with (security_invoker = true)
as
select
  d.tag as division_tag,
  d.label as division_label,
  g.official_game_id,
  g.scheduled_at,
  g.source_local_date,
  g.source_local_time,
  g.status,
  g.home_score,
  g.away_score,
  g.full_score,
  ht.canonical_name as home_team_name,
  at.canonical_name as away_team_name,
  g.canonical_source,
  g.verification_state,
  g.canonicalized_at,
  g.updated_at
from public.games g
join public.divisions d on d.id = g.division_id
join public.teams ht on ht.id = g.home_team_id
join public.teams at on at.id = g.away_team_id
where g.verification_state in ('verified', 'reconciled')
  and g.status in ('Result', 'ResultConfirmed', 'Finished', 'Completed');

alter table public.divisions enable row level security;
alter table public.teams enable row level security;
alter table public.team_aliases enable row level security;
alter table public.games enable row level security;
alter table public.game_periods enable row level security;
alter table public.source_observations enable row level security;
alter table public.current_live_state enable row level security;
alter table public.source_health enable row level security;
alter table public.backfill_runs enable row level security;
alter table public.backfill_segments enable row level security;
alter table public.backfill_failures enable row level security;

revoke all on table public.divisions, public.teams, public.team_aliases, public.games,
  public.game_periods, public.source_observations, public.current_live_state,
  public.source_health, public.backfill_runs, public.backfill_segments,
  public.backfill_failures from anon, authenticated;
grant select, insert, update, delete on table public.divisions, public.teams,
  public.team_aliases, public.games, public.game_periods, public.source_observations,
  public.current_live_state, public.source_health, public.backfill_runs,
  public.backfill_segments, public.backfill_failures to service_role;

revoke all on table public.team_history_games, public.h2h_matchup_summary,
  public.team_recent_form, public.quarter_tendency_summary,
  public.source_agreement_summary, public.results_games from anon, authenticated;
grant select on table public.team_history_games, public.h2h_matchup_summary,
  public.team_recent_form, public.quarter_tendency_summary,
  public.source_agreement_summary, public.results_games to service_role;

insert into public.divisions (tag, label, division_group, valid_from, valid_to)
values
  ('ipbl-66-m-pro-a', 'Pro Men A', 'men', null::date, null::date),
  ('ipbl-66-m-pro-b', 'Pro Men B', 'men', null::date, null::date),
  ('ipbl-66-m-pro-c', 'Pro Men C', 'men', null::date, null::date),
  ('ipbl-66-m-pro-d', 'Pro Men D', 'men', null::date, null::date),
  ('ipbl-66-m-pro-g', 'Pro Men G', 'men', null::date, null::date),
  ('ipbl-66-m-pro-u', 'Pro Men U', 'men', '2026-05-26'::date, null::date),
  ('ipbl-66-m-pro-z', 'Pro Men Z', 'men', '2026-06-13'::date, null::date),
  ('ipbl-66-m-pro-l', 'Pro Men L', 'men', '2026-06-14'::date, null::date),
  ('ipbl-66-w-pro-a', 'Pro Women A', 'women', null::date, null::date),
  ('ipbl-66-w-pro-b', 'Pro Women B', 'women', null::date, null::date),
  ('ipbl-66-w-pro-c', 'Pro Women C', 'women', null::date, null::date),
  ('ipbl-66-w-pro-d', 'Pro Women D', 'women', '2026-04-01'::date, null::date),
  ('ipbl-66-w-pro-g', 'Pro Women G', 'women', '2026-05-02'::date, null::date),
  ('ipbl-66-w-pro-k', 'Pro Women K', 'women', '2026-04-01'::date, null::date)
on conflict (tag) do update set
  label = excluded.label,
  division_group = excluded.division_group,
  valid_from = excluded.valid_from,
  valid_to = excluded.valid_to,
  active = true;

with seed(source_team_id, canonical_name, division_tag) as (
values
  (76038, 'Barnaul', 'ipbl-66-m-pro-a'),
  (76040, 'Novosibirsk', 'ipbl-66-m-pro-a'),
  (76041, 'Sochi', 'ipbl-66-m-pro-a'),
  (76039, 'St. Petersburg', 'ipbl-66-m-pro-a'),
  (76051, 'Kazan', 'ipbl-66-m-pro-b'),
  (76050, 'Krasnodar', 'ipbl-66-m-pro-b'),
  (76049, 'Samara', 'ipbl-66-m-pro-b'),
  (76052, 'Tyumen', 'ipbl-66-m-pro-b'),
  (76057, 'Kaliningrad', 'ipbl-66-m-pro-c'),
  (76058, 'Moscow', 'ipbl-66-m-pro-c'),
  (76060, 'Plavsk', 'ipbl-66-m-pro-c'),
  (76059, 'Voronezh', 'ipbl-66-m-pro-c'),
  (76068, 'Krasnoyarsk', 'ipbl-66-m-pro-d'),
  (76067, 'Nizhny Novgorod', 'ipbl-66-m-pro-d'),
  (76066, 'Rostov-on-Don', 'ipbl-66-m-pro-d'),
  (76065, 'Volgograd', 'ipbl-66-m-pro-d'),
  (76073, 'Astrakhan', 'ipbl-66-m-pro-g'),
  (76074, 'Gelendzhik', 'ipbl-66-m-pro-g'),
  (76075, 'Kachkanar', 'ipbl-66-m-pro-g'),
  (76076, 'Tver', 'ipbl-66-m-pro-g'),
  (76061, 'Ryazan', 'ipbl-66-m-pro-u'),
  (76064, 'Salavat', 'ipbl-66-m-pro-u'),
  (76062, 'Serov', 'ipbl-66-m-pro-u'),
  (76063, 'Smolensk', 'ipbl-66-m-pro-u'),
  (76055, 'Anapa', 'ipbl-66-m-pro-z'),
  (76054, 'Magadan', 'ipbl-66-m-pro-z'),
  (76072, 'Adler', 'ipbl-66-m-pro-l'),
  (76069, 'Kurgan', 'ipbl-66-m-pro-l'),
  (76071, 'Surgut', 'ipbl-66-m-pro-l'),
  (76070, 'Yakutsk', 'ipbl-66-m-pro-l'),
  (76021, 'Bryansk', 'ipbl-66-w-pro-a'),
  (76023, 'Izhevsk', 'ipbl-66-w-pro-a'),
  (76022, 'Magnitogorsk', 'ipbl-66-w-pro-a'),
  (76020, 'Novokuznetsk', 'ipbl-66-w-pro-a'),
  (76012, 'Cheboksary', 'ipbl-66-w-pro-b'),
  (76014, 'Tambov', 'ipbl-66-w-pro-b'),
  (76015, 'Tomsk', 'ipbl-66-w-pro-b'),
  (76013, 'Yaroslavl', 'ipbl-66-w-pro-b'),
  (76029, 'Kaluga', 'ipbl-66-w-pro-c'),
  (76030, 'Murino', 'ipbl-66-w-pro-c'),
  (76031, 'Norilsk', 'ipbl-66-w-pro-c'),
  (76028, 'Vladivostok', 'ipbl-66-w-pro-c'),
  (76026, 'Berezniki', 'ipbl-66-w-pro-d'),
  (76025, 'Ekaterinburg', 'ipbl-66-w-pro-d'),
  (76027, 'Khimki', 'ipbl-66-w-pro-d'),
  (76024, 'Toliatti', 'ipbl-66-w-pro-d'),
  (76034, 'Ivanovo', 'ipbl-66-w-pro-g'),
  (76032, 'Kostroma', 'ipbl-66-w-pro-g'),
  (76035, 'Penza', 'ipbl-66-w-pro-g'),
  (76036, 'Stary Oskol', 'ipbl-66-w-pro-g'),
  (76018, 'Kursk', 'ipbl-66-w-pro-k'),
  (76017, 'Orenburg', 'ipbl-66-w-pro-k'),
  (76016, 'Severodvinsk', 'ipbl-66-w-pro-k'),
  (76019, 'Vologda', 'ipbl-66-w-pro-k')
), inserted_teams as (
  insert into public.teams (canonical_name, short_name)
  select distinct canonical_name, canonical_name from seed
  on conflict (canonical_name) do update set
    short_name = excluded.short_name,
    active = true
  returning id, canonical_name
)
insert into public.team_aliases (
  team_id, division_id, source, source_team_id,
  alias_name, normalized_alias, alias_status
)
select
  t.id,
  d.id,
  'official_ipbl',
  s.source_team_id::text,
  s.canonical_name,
  lower(regexp_replace(trim(s.canonical_name), '\s+', ' ', 'g')),
  'verified'
from seed s
join public.teams t on t.canonical_name = s.canonical_name
join public.divisions d on d.tag = s.division_tag
on conflict (source, division_id, source_team_id) do update set
  team_id = excluded.team_id,
  alias_name = excluded.alias_name,
  normalized_alias = excluded.normalized_alias,
  alias_status = 'verified';

comment on table public.source_observations is
  'Append-only external evidence. Canonical tables never replace this provenance layer.';
comment on view public.team_history_games is
  'Bounded server-side read model for team history and direct H2H loading.';
comment on table public.backfill_segments is
  'Durable division/date work ledger. Every expected segment must reach a classified terminal state.';
