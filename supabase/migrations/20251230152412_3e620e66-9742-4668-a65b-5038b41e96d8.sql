-- Add product_service_id column to invoice_items to preserve the selected product/service
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS product_service_id uuid REFERENCES public.products_services(id);