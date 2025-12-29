-- Allow agents to insert invoices for their own shipments (from_agent direction)
CREATE POLICY "Agents can create their own invoices"
ON public.invoices
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) 
  AND agent_id = auth.uid()
  AND invoice_direction = 'from_agent'
);

-- Allow agents to insert invoice items for their invoices
CREATE POLICY "Agents can insert invoice items for their invoices"
ON public.invoice_items
FOR INSERT
WITH CHECK (
  invoice_id IN (
    SELECT id FROM invoices 
    WHERE agent_id = auth.uid()
  )
);