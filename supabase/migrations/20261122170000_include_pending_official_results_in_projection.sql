-- Expose officially completed-but-not-yet-confirmed Result games in Results.
-- Preserve verification_state='pending' (not a claim of official confirmation).
-- Only changes a privileged read projection; no tables or canonical data mutate.
-- Rollback: restore public.ipbl_results_month_worker from the prior migration,
-- removing the explicitly scoped pending Result OR branch.
CREATE OR REPLACE FUNCTION public.ipbl_results_month_worker(
  p_secret text, p_division_tag text, p_year integer, p_month integer
)
RETURNS SETOF public.team_history_games
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  PERFORM private.require_ipbl_backfill_secret(p_secret);
  IF p_year < 2026 OR p_year > 2100 OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'invalid results month';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.divisions d WHERE d.tag=p_division_tag) THEN
    RAISE EXCEPTION 'unknown IPBL division';
  END IF;

  RETURN QUERY SELECT h.* FROM public.team_history_games h
  WHERE h.division_tag=p_division_tag
    AND (
      h.verification_state='verified'
      OR (
        h.verification_state='pending'
        AND h.status='Result'
        AND h.canonical_source='official_ipbl'
      )
    )
    AND to_date(h.source_local_date,'DD.MM.YYYY') >= make_date(p_year,p_month,1)
    AND to_date(h.source_local_date,'DD.MM.YYYY') <
      (make_date(p_year,p_month,1)+interval '1 month')::date
  ORDER BY h.scheduled_at ASC,h.official_game_id ASC LIMIT 1000;
END;
$function$;
