-- Add verification fields to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by uuid,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';

-- Add RLS policy for agents to update verification
CREATE POLICY "Agents can verify their own payments"
ON public.payments
FOR UPDATE
USING (
  invoice_id IN (
    SELECT id FROM invoices 
    WHERE agent_id = auth.uid() AND invoice_direction = 'from_agent'
  )
)
WITH CHECK (
  invoice_id IN (
    SELECT id FROM invoices 
    WHERE agent_id = auth.uid() AND invoice_direction = 'from_agent'
  )
);