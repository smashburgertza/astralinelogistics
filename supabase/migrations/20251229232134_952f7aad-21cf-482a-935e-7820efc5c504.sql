-- Add unit_type column to invoice_items to track if item is percentage-based or fixed
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'fixed';

-- Add comment for clarity
COMMENT ON COLUMN public.invoice_items.unit_type IS 'Type of unit: fixed (default), percent (percentage of subtotal), kg (weight-based)';

-- Update existing items to mark them as fixed (the default)
UPDATE public.invoice_items SET unit_type = 'fixed' WHERE unit_type IS NULL;