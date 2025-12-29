-- Add RLS policy for agents to view invoices where they are the agent
CREATE POLICY "Agents can view own invoices" 
ON public.invoices 
FOR SELECT 
USING (agent_id = auth.uid());