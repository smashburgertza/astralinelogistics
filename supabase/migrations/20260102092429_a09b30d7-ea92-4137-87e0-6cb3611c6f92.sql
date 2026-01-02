-- Add expense-specific fields to journal_entries table
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS expense_category TEXT,
ADD COLUMN IF NOT EXISTS expense_amount NUMERIC,
ADD COLUMN IF NOT EXISTS expense_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS is_expense BOOLEAN DEFAULT FALSE;

-- Add index for filtering expenses
CREATE INDEX IF NOT EXISTS idx_journal_entries_is_expense ON public.journal_entries(is_expense) WHERE is_expense = true;