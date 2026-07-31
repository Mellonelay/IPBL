-- Forward repair for the initial migration snapshot boundary.
-- Teams were inserted, but the same statement could not read them back
-- through public.teams while creating aliases.

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
