-- Add amount_paid column to track partial payments
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;

-- Update existing paid invoices to have amount_paid = amount
UPDATE public.invoices 
SET amount_paid = amount 
WHERE status = 'paid' AND amount_paid IS NULL OR amount_paid = 0;

-- Add partial_paid status
COMMENT ON COLUMN public.invoices.amount_paid IS 'Total amount paid so far (for partial payment tracking)';