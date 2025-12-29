-- Add customer response fields to estimates table
ALTER TABLE public.estimates 
ADD COLUMN customer_response text CHECK (customer_response IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
ADD COLUMN customer_comments text,
ADD COLUMN responded_at timestamp with time zone,
ADD COLUMN converted_to_invoice_id uuid REFERENCES public.invoices(id);

-- Update status column to track admin workflow separately
COMMENT ON COLUMN public.estimates.status IS 'Admin workflow status: pending, sent, followed_up, closed';
COMMENT ON COLUMN public.estimates.customer_response IS 'Customer response: pending, approved, denied';