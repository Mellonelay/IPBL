-- Read-only division × source-local date coverage profile.
-- Domain: approved canonical divisions only; earliest date is the earliest
-- recorded segment, NOT proof of the earliest available official game.
WITH bounds AS (
  SELECT min(window_start) AS from_date,
         ((now() AT TIME ZONE 'Asia/Yangon')::date - 1) AS to_date
  FROM public.backfill_segments
),
division_days AS (
  SELECT d.id AS division_id,d.tag,days.day::date AS source_local_date
  FROM public.divisions d CROSS JOIN bounds b
  CROSS JOIN LATERAL generate_series(b.from_date,b.to_date,interval '1 day') days(day)
  WHERE d.active AND (d.valid_from IS NULL OR d.valid_from<=days.day::date)
                 AND (d.valid_to IS NULL OR d.valid_to>=days.day::date)
),
latest_segment AS (
  SELECT DISTINCT ON (division_id,window_start)
    division_id,window_start,status,observed_game_count,accepted_game_count,
    quarantined_game_count,last_error_code,completed_at
  FROM public.backfill_segments
  ORDER BY division_id,window_start,completed_at DESC NULLS LAST,created_at DESC
),
canonical AS (
  SELECT division_id,source_local_date,count(*) AS stored_games,
         count(*) FILTER (WHERE verification_state='verified') AS verified_games
  FROM public.games GROUP BY division_id,source_local_date
),
official AS (
  SELECT division_id,
   CASE WHEN payload->>'isoDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN (payload->>'isoDate')::date ELSE NULL END AS source_local_date,
   count(DISTINCT official_game_id) FILTER (WHERE acceptance_state='accepted') AS accepted_source_game_ids,
   count(*) FILTER (WHERE acceptance_state='quarantined') AS quarantined_observations
  FROM public.source_observations
  WHERE source='official_ipbl'
  GROUP BY division_id, CASE WHEN payload->>'isoDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN (payload->>'isoDate')::date ELSE NULL END
),
periods AS (
 SELECT g.division_id,g.source_local_date,
   count(*) FILTER (WHERE q.periods < 4) AS games_with_partial_periods,
   count(*) FILTER (WHERE q.periods >= 4 AND q.complete AND
       (q.home_total <> g.home_score OR q.away_total <> g.away_score)) AS period_score_conflicts
 FROM public.games g
 LEFT JOIN LATERAL (
   SELECT count(*)::integer AS periods,
          coalesce(sum(home_score),0) AS home_total,
          coalesce(sum(away_score),0) AS away_total,
          coalesce(bool_and(evidence_complete),false) AS complete
   FROM public.game_periods p WHERE p.game_id=g.id
 ) q ON true
 GROUP BY g.division_id,g.source_local_date
)
SELECT dd.tag,dd.source_local_date,
 case when ls.status='confirmed_empty' then 'legacy_empty_unverified'
      else coalesce(ls.status,'not_checked') end AS latest_segment_status,
 coalesce(ls.observed_game_count,0) AS segment_observations,
 coalesce(ls.accepted_game_count,0) AS segment_accepted,
 coalesce(o.accepted_source_game_ids,0) AS observed_official_game_ids,
 coalesce(c.stored_games,0) AS canonical_games,
 coalesce(c.verified_games,0) AS stored_verified_games,
 coalesce(p.games_with_partial_periods,0) AS incomplete_period_games,
 coalesce(p.period_score_conflicts,0) AS period_score_conflicts,
 coalesce(o.quarantined_observations,0) AS quarantined_observations,
 ls.last_error_code
FROM division_days dd
LEFT JOIN latest_segment ls ON ls.division_id=dd.division_id AND ls.window_start=dd.source_local_date
LEFT JOIN canonical c ON c.division_id=dd.division_id AND c.source_local_date=dd.source_local_date
LEFT JOIN official o ON o.division_id=dd.division_id AND o.source_local_date=dd.source_local_date
LEFT JOIN periods p ON p.division_id=dd.division_id AND p.source_local_date=dd.source_local_date
ORDER BY dd.source_local_date DESC,dd.tag;
