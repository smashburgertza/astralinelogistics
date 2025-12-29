-- Update parcel view policy for agents to also match by agent_id
DROP POLICY IF EXISTS "Agents can view parcels for their region shipments" ON public.parcels;

CREATE POLICY "Agents can view parcels for their shipments"
ON public.parcels
FOR SELECT
USING (
  shipment_id IN (
    SELECT id FROM public.shipments 
    WHERE agent_id = auth.uid()
  )
  OR
  (
    has_role(auth.uid(), 'agent'::app_role) AND 
    shipment_id IN (
      SELECT id FROM public.shipments 
      WHERE origin_region IN (
        SELECT region_code::agent_region FROM public.agent_regions WHERE user_id = auth.uid()
      )
    )
  )
);