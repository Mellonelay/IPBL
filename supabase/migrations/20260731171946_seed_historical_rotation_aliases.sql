-- Preserve division-rotation identities discovered from official IPBL evidence.
-- This migration does not trigger any historical backfill.

with team_seed(canonical_name, short_name) as (
  values
    ('Omsk', 'Omsk'),
    ('Ukhta', 'Ukhta'),
    ('Syktyvkar', 'Syktyvkar'),
    ('Vorkuta', 'Vorkuta'),
    ('Kirov', 'Kirov'),
    ('Orel', 'Orel'),
    ('Murmansk', 'Murmansk'),
    ('Perm', 'Perm')
)
insert into public.teams (canonical_name, short_name, active)
select canonical_name, short_name, true
from team_seed seed
where not exists (
  select 1 from public.teams current_team
  where current_team.canonical_name = seed.canonical_name
);

with alias_seed(division_tag, source_team_id, alias_name, normalized_alias, canonical_name) as (
  values
    ('ipbl-66-m-pro-a', '76042', 'Omsk', 'omsk', 'Omsk'),
    ('ipbl-66-m-pro-a', '76043', 'Ukhta', 'ukhta', 'Ukhta'),
    ('ipbl-66-m-pro-a', '76044', 'Syktyvkar', 'syktyvkar', 'Syktyvkar'),
    ('ipbl-66-m-pro-a', '76045', 'Vorkuta', 'vorkuta', 'Vorkuta'),
    ('ipbl-66-m-pro-b', '76053', 'Revda', 'revda', 'Revda'),
    ('ipbl-66-m-pro-b', '76054', 'Magadan', 'magadan', 'Magadan'),
    ('ipbl-66-m-pro-b', '76055', 'Anapa', 'anapa', 'Anapa'),
    ('ipbl-66-m-pro-b', '76056', 'Ufa', 'ufa', 'Ufa'),
    ('ipbl-66-m-pro-c', '76061', 'Ryazan', 'ryazan', 'Ryazan'),
    ('ipbl-66-m-pro-c', '76062', 'Serov', 'serov', 'Serov'),
    ('ipbl-66-m-pro-c', '76063', 'Smolensk', 'smolensk', 'Smolensk'),
    ('ipbl-66-m-pro-c', '76064', 'Salavat', 'salavat', 'Salavat'),
    ('ipbl-66-m-pro-d', '76069', 'Kurgan', 'kurgan', 'Kurgan'),
    ('ipbl-66-m-pro-d', '76070', 'Yakutsk', 'yakutsk', 'Yakutsk'),
    ('ipbl-66-m-pro-d', '76071', 'Surgut', 'surgut', 'Surgut'),
    ('ipbl-66-m-pro-d', '76072', 'Adler', 'adler', 'Adler'),
    ('ipbl-66-m-pro-g', '76077', 'Kirov', 'kirov', 'Kirov'),
    ('ipbl-66-m-pro-g', '76078', 'Orel', 'orel', 'Orel'),
    ('ipbl-66-m-pro-g', '76079', 'Murmansk', 'murmansk', 'Murmansk'),
    ('ipbl-66-m-pro-g', '76080', 'Perm', 'perm', 'Perm'),
    ('ipbl-66-w-pro-a', '76024', 'Toliatti', 'toliatti', 'Toliatti'),
    ('ipbl-66-w-pro-a', '76025', 'Ekaterinburg', 'ekaterinburg', 'Ekaterinburg'),
    ('ipbl-66-w-pro-a', '76026', 'Berezniki', 'berezniki', 'Berezniki'),
    ('ipbl-66-w-pro-a', '76027', 'Khimki', 'khimki', 'Khimki'),
    ('ipbl-66-w-pro-b', '76016', 'Severodvinsk', 'severodvinsk', 'Severodvinsk'),
    ('ipbl-66-w-pro-b', '76017', 'Orenburg', 'orenburg', 'Orenburg'),
    ('ipbl-66-w-pro-b', '76018', 'Kursk', 'kursk', 'Kursk'),
    ('ipbl-66-w-pro-b', '76019', 'Vologda', 'vologda', 'Vologda'),
    ('ipbl-66-w-pro-c', '76032', 'Kostroma', 'kostroma', 'Kostroma'),
    ('ipbl-66-w-pro-c', '76034', 'Ivanovo', 'ivanovo', 'Ivanovo'),
    ('ipbl-66-w-pro-c', '76035', 'Penza', 'penza', 'Penza'),
    ('ipbl-66-w-pro-c', '76036', 'Stary Oskol', 'stary oskol', 'Stary Oskol')
)
insert into public.team_aliases (
  team_id,
  division_id,
  source,
  source_team_id,
  alias_name,
  normalized_alias,
  alias_status,
  first_seen_at,
  last_seen_at
)
select
  team.id,
  division.id,
  'official_ipbl',
  seed.source_team_id,
  seed.alias_name,
  seed.normalized_alias,
  'verified',
  now(),
  now()
from alias_seed seed
join public.divisions division on division.tag = seed.division_tag
join public.teams team on team.canonical_name = seed.canonical_name
where not exists (
  select 1
  from public.team_aliases current_alias
  where current_alias.division_id = division.id
    and current_alias.source = 'official_ipbl'
    and current_alias.source_team_id = seed.source_team_id
);
