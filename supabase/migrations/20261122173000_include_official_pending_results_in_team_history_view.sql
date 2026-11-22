-- Existing team_history_games view already excludes unfinished fixtures.
-- Allow an additional narrow category: official Result (source-completed)
-- records whose confirmation remains pending. Never promote verification_state.
-- This read-only view adjustment is required for both Results and canonical H2H.
-- Rollback: restore the original WHERE clause requiring
-- verification_state IN ('verified','reconciled').
CREATE OR REPLACE VIEW public.team_history_games AS
 SELECT d.tag AS division_tag,
    g.official_game_id,
    g.scheduled_at,
    to_char(g.source_local_date::timestamp with time zone, 'DD.MM.YYYY'::text) AS source_local_date,
    to_char(g.source_local_time::interval, 'HH24:MI'::text) AS source_local_time,
    g.status,
    g.home_score AS score1,
    g.away_score AS score2,
    COALESCE(g.full_score, periods.generated_full_score) AS full_score,
    periods.quarter_totals,
        CASE
            WHEN home_alias.source_team_id ~ '^[0-9]+$'::text THEN home_alias.source_team_id::bigint
            ELSE NULL::bigint
        END AS home_source_team_id,
    ht.short_name AS home_short_name,
    ht.canonical_name AS home_name,
        CASE
            WHEN away_alias.source_team_id ~ '^[0-9]+$'::text THEN away_alias.source_team_id::bigint
            ELSE NULL::bigint
        END AS away_source_team_id,
    at.short_name AS away_short_name,
    at.canonical_name AS away_name,
    g.verification_state,
    g.canonical_source,
    g.canonicalized_at,
    g.updated_at
   FROM games g
     JOIN divisions d ON d.id = g.division_id
     JOIN teams ht ON ht.id = g.home_team_id
     JOIN teams at ON at.id = g.away_team_id
     LEFT JOIN team_aliases home_alias ON home_alias.team_id = g.home_team_id AND home_alias.division_id = g.division_id AND home_alias.source = 'official_ipbl'::text AND home_alias.alias_status = 'verified'::text
     LEFT JOIN team_aliases away_alias ON away_alias.team_id = g.away_team_id AND away_alias.division_id = g.division_id AND away_alias.source = 'official_ipbl'::text AND away_alias.alias_status = 'verified'::text
     LEFT JOIN LATERAL ( SELECT string_agg((p.home_score::text || ':'::text) || p.away_score::text, ','::text ORDER BY p.period_number) AS generated_full_score,
            string_agg((('Q'::text || p.period_number::text) || ' '::text) || ((p.home_score + p.away_score)::text), ' · '::text ORDER BY p.period_number) FILTER (WHERE p.period_type = 'quarter'::text) AS quarter_totals
           FROM game_periods p
          WHERE p.game_id = g.id) periods ON true
  WHERE (
    (
      g.verification_state = ANY (ARRAY['verified'::text, 'reconciled'::text])
      AND g.status = ANY (ARRAY['Result'::text, 'ResultConfirmed'::text, 'Finished'::text, 'Completed'::text])
    )
    OR (
      g.verification_state = 'pending'
      AND g.status = 'Result'
      AND g.canonical_source = 'official_ipbl'
    )
  )
  AND g.home_score IS NOT NULL
  AND g.away_score IS NOT NULL;
