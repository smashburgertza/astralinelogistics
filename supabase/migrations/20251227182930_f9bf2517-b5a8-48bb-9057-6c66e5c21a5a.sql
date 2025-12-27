-- Add customer_name to shipments for cases where customer doesn't exist in DB
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS customer_name text;

-- Add rate_per_kg to invoices to track the rate charged
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rate_per_kg numeric;

-- Add comment for clarity
COMMENT ON COLUMN public.shipments.customer_name IS 'Customer name when customer_id is not available';
COMMENT ON COLUMN public.invoices.rate_per_kg IS 'Rate per kg charged for the shipment';