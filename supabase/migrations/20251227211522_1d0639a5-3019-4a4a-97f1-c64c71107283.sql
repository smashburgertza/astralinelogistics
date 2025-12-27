-- Drop the existing agent insert policy that only checks first region
DROP POLICY IF EXISTS "Agents can insert shipments" ON public.shipments;

-- Create new policy that allows agents to insert for ANY of their assigned regions
CREATE POLICY "Agents can insert shipments" 
ON public.shipments 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) 
  AND user_has_region(auth.uid(), origin_region)
);

-- Also update the UPDATE policy if agents should be able to update their shipments
DROP POLICY IF EXISTS "Agents can update own shipments" ON public.shipments;

CREATE POLICY "Agents can update own shipments" 
ON public.shipments 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND user_has_region(auth.uid(), origin_region)
);

-- Update the select policy to also use user_has_region
DROP POLICY IF EXISTS "Agents can view own region shipments" ON public.shipments;

CREATE POLICY "Agents can view own region shipments" 
ON public.shipments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND user_has_region(auth.uid(), origin_region)
);