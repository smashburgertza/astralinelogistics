-- Add estimate_id to order_requests to link orders to estimates
ALTER TABLE public.order_requests 
ADD COLUMN estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_order_requests_estimate_id ON public.order_requests(estimate_id);

-- Allow customers to update estimate response on their own estimates
CREATE POLICY "Customers can respond to own estimates"
ON public.estimates
FOR UPDATE
USING (customer_id IN (
  SELECT id FROM customers WHERE user_id = auth.uid()
))
WITH CHECK (customer_id IN (
  SELECT id FROM customers WHERE user_id = auth.uid()
));