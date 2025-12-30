-- Allow agents to insert payment records for invoices where they are the agent
CREATE POLICY "Agents can insert payments for their invoices"
ON public.payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_id
    AND invoices.agent_id = auth.uid()
    AND invoices.invoice_direction = 'to_agent'
  )
);

-- Allow agents to view their own payment records
CREATE POLICY "Agents can view payments for their invoices"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_id
    AND invoices.agent_id = auth.uid()
  )
);