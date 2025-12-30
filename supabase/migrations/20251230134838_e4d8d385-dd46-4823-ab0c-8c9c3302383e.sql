-- Add policy for customers to insert payments for their own invoices
CREATE POLICY "Customers can insert payments for their invoices"
ON public.payments
FOR INSERT
WITH CHECK (
  invoice_id IN (
    SELECT invoices.id
    FROM invoices
    WHERE invoices.customer_id IN (
      SELECT customers.id
      FROM customers
      WHERE customers.user_id = auth.uid()
    )
  )
);