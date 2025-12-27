-- Drop the security definer view and recreate with proper security
DROP VIEW IF EXISTS public.agent_balance_summary;

-- Recreate as a regular view with SECURITY INVOKER (default)
CREATE VIEW public.agent_balance_summary 
WITH (security_invoker = true) AS
SELECT 
  i.agent_id,
  p.full_name as agent_name,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'to_agent' AND i.status = 'paid' THEN i.amount ELSE 0 END), 0) as paid_to_agent,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'to_agent' AND i.status = 'pending' THEN i.amount ELSE 0 END), 0) as pending_to_agent,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'from_agent' AND i.status = 'paid' THEN i.amount ELSE 0 END), 0) as paid_from_agent,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'from_agent' AND i.status = 'pending' THEN i.amount ELSE 0 END), 0) as pending_from_agent,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'from_agent' THEN i.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'to_agent' THEN i.amount ELSE 0 END), 0) as net_balance
FROM public.invoices i
LEFT JOIN public.profiles p ON i.agent_id = p.id
WHERE i.agent_id IS NOT NULL
GROUP BY i.agent_id, p.full_name;