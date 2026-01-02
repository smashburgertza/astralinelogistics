-- Drop old constraint and add updated one with new statuses
ALTER TABLE public.journal_entries 
DROP CONSTRAINT IF EXISTS journal_entries_status_check;

ALTER TABLE public.journal_entries 
ADD CONSTRAINT journal_entries_status_check 
CHECK (status IN ('draft', 'posted', 'voided', 'pending_approval', 'rejected'));