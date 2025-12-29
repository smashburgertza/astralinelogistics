-- Allow agents to view customers so they can search when uploading shipments
CREATE POLICY "Agents can view customers"
ON public.customers
FOR SELECT
USING (has_role(auth.uid(), 'agent'::app_role));