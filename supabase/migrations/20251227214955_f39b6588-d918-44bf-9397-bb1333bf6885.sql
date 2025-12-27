-- Allow agents to delete their own draft shipments
CREATE POLICY "Agents can delete their own drafts"
ON public.shipments
FOR DELETE
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND agent_id = auth.uid() 
  AND is_draft = true
);