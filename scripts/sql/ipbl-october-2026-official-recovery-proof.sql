-- Reproducible, read-only October 2026 onward official-source reconciliation.
-- Evidence: immutable full envelopes in public.source_observations from
-- official_ipbl_calendar_audit. These are NOT canonical verification flags.
-- End date is an explicit as-of snapshot, not a claim about future days.
-- No destructive updates and no automatic verified-empty promotion.
WITH expected_cells AS (
  SELECT d.id division_id, d.tag, dates.source_day::date source_day
  FROM public.divisions d
  CROSS JOIN generate_series(date '2026-10-01', date '2026-11-22', interval '1 day') dates(source_day)
  WHERE d.active
),
latest_source AS (
  SELECT DISTINCT ON (source_record_id)
    source_record_id, division_id, received_at, payload
  FROM public.source_observations
  WHERE source = 'official_ipbl_calendar_audit'
    AND (payload->>'requested_day')::date BETWEEN date '2026-10-01' AND date '2026-11-22'
  ORDER BY source_record_id, received_at DESC
),
audited_cells AS (
  SELECT e.*, s.payload,
    coalesce(s.payload->>'requested_tag','') = e.tag
      AND s.division_id = e.division_id
      AND s.payload->>'requested_day' = e.source_day::text
      AND s.payload->>'http_status' = '200'
      AND s.payload#>>'{raw,data,status}' = 'Ok'
      AND jsonb_typeof(s.payload#>'{raw,data,items}') = 'array'
      AND coalesce(s.payload#>>'{raw,data,totalCount}','') ~ '^[0-9]+$'
      AND (s.payload#>>'{raw,data,totalCount}')::integer =
          jsonb_array_length(s.payload#>'{raw,data,items}')
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(s.payload#>'{raw,data,items}')='array'
            THEN s.payload#>'{raw,data,items}' ELSE '[]'::jsonb END
        ) item
        WHERE item#>>'{league,tag}' IS DISTINCT FROM e.tag
           OR item#>>'{game,localDate}' IS DISTINCT FROM to_char(e.source_day,'DD.MM.YYYY')
      ) AS source_valid
  FROM expected_cells e
  LEFT JOIN latest_source s
    ON s.source_record_id = 'calendar:'||e.tag||':'||e.source_day::text
),
source_games AS (
  SELECT c.tag,c.source_day,
    (item#>>'{game,id}')::bigint official_game_id,
    item#>>'{game,gameStatus}' official_status,
    (item#>>'{game,score1}')::integer home_score,
    (item#>>'{game,score2}')::integer away_score,
    item#>>'{game,fullScore}' full_score
  FROM audited_cells c
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN c.source_valid THEN c.payload#>'{raw,data,items}'
      ELSE '[]'::jsonb END
  ) item
),
completed AS (
  SELECT s.*,g.id canonical_id,g.home_score stored_home,
    g.away_score stored_away,g.source_local_date stored_day,d.tag stored_tag
  FROM source_games s
  LEFT JOIN public.games g ON g.official_game_id=s.official_game_id
  LEFT JOIN public.divisions d ON d.id=g.division_id
  WHERE s.official_status IN ('ResultConfirmed','Result')
),
official_periods AS (
  SELECT c.official_game_id,v.n::smallint period_number,
    split_part(btrim(v.pair),':',1)::integer home_score,
    split_part(btrim(v.pair),':',2)::integer away_score
  FROM completed c
  CROSS JOIN LATERAL regexp_split_to_table(c.full_score,',')
    WITH ORDINALITY v(pair,n)
  WHERE btrim(v.pair) ~ '^[0-9]+:[0-9]+$'
),
period_comparison AS (
  SELECT op.official_game_id,op.period_number,p.game_id stored_game_id,
    op.home_score IS DISTINCT FROM p.home_score
      OR op.away_score IS DISTINCT FROM p.away_score AS score_differs
  FROM official_periods op
  LEFT JOIN public.games g ON g.official_game_id=op.official_game_id
  LEFT JOIN public.game_periods p ON p.game_id=g.id
    AND p.period_number=op.period_number
)
SELECT
  (SELECT count(*) FROM expected_cells) AS expected_division_days,
  (SELECT count(*) FROM audited_cells WHERE source_valid) AS valid_official_day_responses,
  (SELECT count(*) FROM audited_cells WHERE NOT coalesce(source_valid,false))
    AS missing_or_invalid_source_responses,
  (SELECT count(*) FROM audited_cells
    WHERE source_valid AND (payload#>>'{raw,data,totalCount}')::integer=0)
    AS source_zero_game_days,
  (SELECT count(*) FROM source_games) AS official_rows_all_statuses,
  (SELECT count(*) FROM completed) AS completed_or_result_rows,
  (SELECT count(*) FROM completed WHERE official_status='ResultConfirmed') AS confirmed_rows,
  (SELECT count(*) FROM completed WHERE official_status='Result') AS result_pending_confirmation_rows,
  (SELECT count(*) FROM completed WHERE canonical_id IS NULL) AS missing_completed_game_ids,
  (SELECT count(*) FROM completed WHERE canonical_id IS NOT NULL AND
    (home_score IS DISTINCT FROM stored_home OR away_score IS DISTINCT FROM stored_away))
    AS final_score_conflicts,
  (SELECT count(*) FROM completed WHERE canonical_id IS NOT NULL AND
    (source_day IS DISTINCT FROM stored_day OR tag IS DISTINCT FROM stored_tag))
    AS date_division_conflicts,
  (SELECT count(*) FROM official_periods) AS supplied_official_periods,
  (SELECT count(*) FROM period_comparison WHERE stored_game_id IS NULL) AS missing_supplied_periods,
  (SELECT count(*) FROM period_comparison WHERE stored_game_id IS NOT NULL AND score_differs)
    AS period_score_conflicts;
