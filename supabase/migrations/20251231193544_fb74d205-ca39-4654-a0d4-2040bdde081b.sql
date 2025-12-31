-- Allow agents to insert journal entries (for when they submit invoices that need COG entries)
CREATE POLICY "Agents can create journal entries for their invoices"
ON public.journal_entries
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) 
  AND reference_type = 'invoice'
);

-- Also need to allow agents to insert journal lines
CREATE POLICY "Agents can create journal lines for their entries"
ON public.journal_lines
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) 
  AND journal_entry_id IN (
    SELECT id FROM public.journal_entries 
    WHERE reference_type = 'invoice' 
    AND created_by = auth.uid()
  )
);