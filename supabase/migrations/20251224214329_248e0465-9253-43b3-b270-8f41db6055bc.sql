-- Allow agents to insert parcels for shipments in their region
CREATE POLICY "Agents can insert parcels for their shipments"
ON public.parcels
FOR INSERT
TO authenticated
WITH CHECK (
  shipment_id IN (
    SELECT id FROM public.shipments 
    WHERE origin_region = get_user_region(auth.uid())
    AND has_role(auth.uid(), 'agent'::app_role)
  )
);

-- Allow agents to view parcels for shipments in their region  
CREATE POLICY "Agents can view parcels for their region shipments"
ON public.parcels
FOR SELECT
TO authenticated
USING (
  shipment_id IN (
    SELECT id FROM public.shipments 
    WHERE origin_region = get_user_region(auth.uid())
    AND has_role(auth.uid(), 'agent'::app_role)
  )
);

-- Allow agents to insert customers (for quick customer creation)
CREATE POLICY "Agents can create customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));