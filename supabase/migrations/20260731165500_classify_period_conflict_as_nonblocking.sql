-- A final result remains canonical when only the quarter string conflicts.
-- The contradictory period evidence stays quarantined and is excluded from analytics.

create or replace function private.classify_nonblocking_backfill_quarantine()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'quarantined'
     and new.accepted_game_count > 0
     and new.quarantined_game_count > 0
     and exists (
       select 1
       from public.source_observations so
       where so.division_id = new.division_id
         and (so.payload->>'isoDate')::date = new.window_start
         and so.acceptance_state = 'quarantined'
         and so.rejection_code = 'period_total_conflict'
     )
     and not exists (
       select 1
       from public.source_observations so
       where so.division_id = new.division_id
         and (so.payload->>'isoDate')::date = new.window_start
         and so.acceptance_state = 'quarantined'
         and so.rejection_code is distinct from 'period_total_conflict'
     )
     and not exists (
       select 1
       from public.backfill_failures f
       where f.segment_id = new.id
         and f.resolved_at is null
     )
  then
    new.status := 'verified';
    new.verified_through_date := new.window_end;
    new.last_error_code := 'period_evidence_quarantined';
  end if;
  return new;
end;
$$;

revoke execute on function private.classify_nonblocking_backfill_quarantine()
  from public, anon, authenticated;

drop trigger if exists backfill_segments_nonblocking_quarantine
  on public.backfill_segments;
create trigger backfill_segments_nonblocking_quarantine
before insert or update of status, accepted_game_count, quarantined_game_count
on public.backfill_segments
for each row
execute function private.classify_nonblocking_backfill_quarantine();
