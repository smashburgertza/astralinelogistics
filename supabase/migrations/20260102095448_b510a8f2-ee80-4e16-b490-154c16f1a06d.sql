
-- Drop existing foreign key constraints and recreate with CASCADE
ALTER TABLE public.shipments 
  DROP CONSTRAINT IF EXISTS shipments_customer_id_fkey,
  ADD CONSTRAINT shipments_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.invoices 
  DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey,
  ADD CONSTRAINT invoices_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.estimates 
  DROP CONSTRAINT IF EXISTS estimates_customer_id_fkey,
  ADD CONSTRAINT estimates_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.approval_requests 
  DROP CONSTRAINT IF EXISTS approval_requests_customer_id_fkey,
  ADD CONSTRAINT approval_requests_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
