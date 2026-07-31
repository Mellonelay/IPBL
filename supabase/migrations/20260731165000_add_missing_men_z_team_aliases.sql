-- Official evidence on 2026-07-04 and 2026-07-05 proved two
-- Pro Men Z identities omitted from the original registry.

insert into public.teams (canonical_name, short_name, active)
values
  ('Revda', 'Revda', true),
  ('Ufa', 'Ufa', true)
on conflict (canonical_name) do update set
  short_name = excluded.short_name,
  active = true,
  updated_at = now();

with division as (
  select id from public.divisions where tag = 'ipbl-66-m-pro-z'
), seed(source_team_id, canonical_name) as (
  values ('76053', 'Revda'), ('76056', 'Ufa')
)
insert into public.team_aliases (
  team_id, division_id, source, source_team_id,
  alias_name, normalized_alias, alias_status,
  first_seen_at, last_seen_at
)
select t.id, d.id, 'official_ipbl', s.source_team_id,
       s.canonical_name, lower(s.canonical_name), 'verified', now(), now()
from seed s
join public.teams t on t.canonical_name = s.canonical_name
cross join division d
on conflict (source, division_id, source_team_id) do update set
  team_id = excluded.team_id,
  alias_name = excluded.alias_name,
  normalized_alias = excluded.normalized_alias,
  alias_status = 'verified',
  last_seen_at = now(),
  updated_at = now();
