-- Add type column to estimates table
ALTER TABLE public.estimates 
ADD COLUMN estimate_type text NOT NULL DEFAULT 'shipping';

-- Add type column to invoices table  
ALTER TABLE public.invoices
ADD COLUMN invoice_type text NOT NULL DEFAULT 'shipping';

-- Add purchase-related columns to estimates
ALTER TABLE public.estimates
ADD COLUMN product_cost numeric DEFAULT 0,
ADD COLUMN purchase_fee numeric DEFAULT 0;

-- Add purchase-related columns to invoices
ALTER TABLE public.invoices
ADD COLUMN product_cost numeric DEFAULT 0,
ADD COLUMN purchase_fee numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.estimates.estimate_type IS 'Type of estimate: shipping or purchase_shipping';
COMMENT ON COLUMN public.invoices.invoice_type IS 'Type of invoice: shipping or purchase_shipping';