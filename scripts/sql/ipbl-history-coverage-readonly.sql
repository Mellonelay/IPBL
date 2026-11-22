-- Read-only, reproducible IPBL historical coverage inventory.
-- Scope: approved public.divisions x dates from first recorded checkpoint to today.
-- This is NOT official-source completeness: official_completed_count remains NULL
-- until an independently acquired official division/date/game baseline is joined.
-- Legacy confirmed_empty checkpoints are suspect, not certified absent games.
WITH bounds AS (
  SELECT min(window_start)::date AS first_day FROM public.backfill_segments
), days AS (
  SELECT generate_series(first_day, current_date, interval '1 day')::date AS source_day FROM bounds
), grid AS (
  SELECT d.id AS division_id, d.tag, days.source_day
  FROM public.divisions d CROSS JOIN days
), periods AS (
  SELECT game_id, count(*)::int period_count,
         sum(home_score)::int home_total, sum(away_score)::int away_total
  FROM public.game_periods GROUP BY game_id
), game_days AS (
  SELECT division_id, source_local_date AS source_day,
         count(*)::int stored_games,
         count(*) FILTER (WHERE coalesce(p.period_count,0)<4)::int missing_or_partial_periods,
         count(*) FILTER (WHERE p.period_count>=4 AND
             (g.home_score IS DISTINCT FROM p.home_total OR g.away_score IS DISTINCT FROM p.away_total))::int period_score_conflicts
  FROM public.games g LEFT JOIN periods p ON p.game_id=g.id
  GROUP BY division_id,source_local_date
), segments AS (
  SELECT division_id,window_start AS source_day,
         count(*)::int attempts,
         bool_or(status='confirmed_empty') legacy_empty,
         bool_or(status='quarantined') quarantined,
         bool_or(status='retryable_failure') retryable,
         max(verified_through_date) verified_through_date
  FROM public.backfill_segments
  WHERE window_start=window_end
  GROUP BY division_id,window_start
)
SELECT g.tag,g.source_day,
       NULL::int AS official_completed_games,
       coalesce(d.stored_games,0) AS stored_games,
       coalesce(d.missing_or_partial_periods,0) AS missing_or_partial_periods,
       coalesce(d.period_score_conflicts,0) AS period_score_conflicts,
       coalesce(s.attempts,0) AS checkpoint_attempts,
       s.verified_through_date,
       CASE WHEN coalesce(s.legacy_empty,false) THEN 'legacy_empty_requires_source_recheck'
            WHEN coalesce(s.quarantined,false) THEN 'quarantined'
            WHEN coalesce(s.retryable,false) THEN 'retry_pending'
            WHEN coalesce(s.attempts,0)=0 THEN 'not_evaluated'
            WHEN coalesce(d.stored_games,0)>0 THEN 'stored_games_source_completeness_unverified'
            ELSE 'source_coverage_unverified'
       END AS coverage_state
FROM grid g
LEFT JOIN game_days d ON d.division_id=g.division_id AND d.source_day=g.source_day
LEFT JOIN segments s ON s.division_id=g.division_id AND s.source_day=g.source_day
ORDER BY g.source_day DESC,g.tag;
