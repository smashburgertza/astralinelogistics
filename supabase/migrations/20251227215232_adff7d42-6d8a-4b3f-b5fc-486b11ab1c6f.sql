-- Drop existing agent insert policy for parcels (it only checks one region)
DROP POLICY IF EXISTS "Agents can insert parcels for their shipments" ON public.parcels;

-- Create new policy that checks all assigned regions via user_has_region function
CREATE POLICY "Agents can insert parcels for their shipments"
ON public.parcels
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) 
  AND shipment_id IN (
    SELECT s.id FROM public.shipments s
    WHERE s.agent_id = auth.uid()
  )
);

-- Allow agents to update parcels for their own draft shipments
CREATE POLICY "Agents can update parcels for their drafts"
ON public.parcels
FOR UPDATE
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND shipment_id IN (
    SELECT s.id FROM public.shipments s
    WHERE s.agent_id = auth.uid() AND s.is_draft = true
  )
);

-- Allow agents to delete parcels for their own draft shipments
CREATE POLICY "Agents can delete parcels for their drafts"
ON public.parcels
FOR DELETE
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND shipment_id IN (
    SELECT s.id FROM public.shipments s
    WHERE s.agent_id = auth.uid() AND s.is_draft = true
  )
);