-- Add default_currency column to regions table
ALTER TABLE public.regions ADD COLUMN default_currency text DEFAULT 'USD';