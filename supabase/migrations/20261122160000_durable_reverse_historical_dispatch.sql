-- Durable reverse-chronological historical campaign using IPBL's existing
-- backfill_runs/backfill_segments ledger, worker leases, Vault secret, and Cron.
-- Apply only after validated production recovery snapshot. No source facts are
-- fabricated, and this migration never creates a historical run by itself.
-- Rollback: restore private.ipbl_dispatch_current_ingest() from the
-- 20261023110654 migration; drop the new entrypoint after active runs finish.
CREATE OR REPLACE FUNCTION private.ipbl_enqueue_reverse_historical(
  p_from date, p_to date, p_window_days integer DEFAULT 7
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare
  v_secret text;
  v_campaign uuid := pg_catalog.gen_random_uuid();
  v_end date;
  v_begin date;
  v_run uuid;
  v_sequence integer := 0;
  v_segment_total integer := 0;
  v_segments integer;
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'invalid historical date range';
  end if;
  if p_to >= (now() at time zone 'Asia/Yangon')::date then
    raise exception 'historical recovery must exclude the current source-local day';
  end if;
  if (p_to - p_from) > 365 then
    raise exception 'date range exceeds campaign maximum';
  end if;
  if p_window_days is null or p_window_days < 1 or p_window_days > 31 then
    raise exception 'invalid recovery window';
  end if;
  if exists (
    select 1 from public.backfill_runs r
    join public.backfill_segments s on s.run_id = r.id
    where r.requested_by = 'owner-historical-recovery'
      and (s.status = 'pending'
        or (s.status = 'retryable_failure' and s.attempt_count < 4)
        or (s.status = 'running' and s.lease_expires_at < now() and s.attempt_count < 4))
  ) then
    raise exception 'recovery already active';
  end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets
  where name = 'ipbl-ingest-cron-secret' limit 1;
  if v_secret is null or length(v_secret) < 20 then
    raise exception 'IPBL historical worker authorization not configured';
  end if;

  v_end := p_to;
  while v_end >= p_from loop
    v_begin := greatest(p_from, v_end - (p_window_days - 1));
    v_run := public.ipbl_start_backfill(
      p_secret := v_secret,
      p_run_kind := 'historical',
      p_from := v_begin,
      p_to := v_end,
      p_division_tags := null,
      p_requested_by := 'owner-historical-recovery',
      p_normalizer_version := 'official-calendar-v1',
      p_evidence_version := 1
    );
    select segment_count into v_segments from public.backfill_runs where id = v_run;
    update public.backfill_runs
    set metadata = metadata || jsonb_build_object(
      'campaign_id', v_campaign::text,
      'recovery_order', v_sequence,
      'campaign_from', p_from,
      'campaign_to', p_to
    )
    where id = v_run;
    v_segment_total := v_segment_total + v_segments;
    v_sequence := v_sequence + 1;
    v_end := v_begin - 1;
  end loop;

  perform cron.schedule('ipbl-current-season-worker', '* * * * *',
    'select private.ipbl_dispatch_current_ingest();');
  return jsonb_build_object(
    'campaign_id', v_campaign, 'runs', v_sequence,
    'segments', v_segment_total, 'from', p_from, 'to', p_to
  );
end;
$function$;

REVOKE ALL ON FUNCTION private.ipbl_enqueue_reverse_historical(date,date,integer)
FROM PUBLIC, anon, authenticated;

-- Existing daily and bulk runs remain the priority for data freshness.
-- Historical windows are dispatched in the order they were created, newest
-- first; once a window reaches terminal states, the next window is selected.
CREATE OR REPLACE FUNCTION private.ipbl_dispatch_current_ingest()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_secret text;
 v_run_id uuid;
 v_sent integer := 0;
begin
 select decrypted_secret into v_secret from vault.decrypted_secrets
 where name='ipbl-ingest-cron-secret' limit 1;
 if v_secret is null then raise exception 'IPBL ingestion authorization is not configured'; end if;
 select r.id into v_run_id
 from public.backfill_runs r
 where r.requested_by in (
   'owner-bulk-recent-20261023',
   'owner-daily-incremental',
   'owner-historical-recovery'
 )
 and exists (
  select 1 from public.backfill_segments s where s.run_id=r.id
  and (s.status='pending' or (s.status='retryable_failure' and coalesce(s.attempt_count,0)<4)
       or (s.status='running' and s.lease_expires_at<now() and coalesce(s.attempt_count,0)<4))
 )
 order by
   case r.requested_by when 'owner-bulk-recent-20261023' then 0
     when 'owner-daily-incremental' then 1 else 2 end,
   case when r.requested_by='owner-historical-recovery'
     then coalesce((r.metadata->>'recovery_order')::integer,2147483647)
     else 0 end,
   r.started_at asc
 limit 1;
 if v_run_id is null then
   perform cron.unschedule('ipbl-current-season-worker');
   return 0;
 end if;
 for i in 1..3 loop
  perform net.http_post(
   url:='https://ipbl-minimal-viewer.vercel.app/api/admin/supabase-backfill?action=work',
   body:=jsonb_build_object('runId',v_run_id::text,'limit',3),
   headers:=jsonb_build_object('Authorization','Bearer '||v_secret,'Content-Type','application/json'),
   timeout_milliseconds:=45000);
  v_sent:=v_sent+1;
 end loop;
 return v_sent;
end;
$function$;
