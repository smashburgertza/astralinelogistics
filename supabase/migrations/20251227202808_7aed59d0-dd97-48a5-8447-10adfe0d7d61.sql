-- Add agent_cargo_weight_kg column to shipments table for consolidated agent cargo
ALTER TABLE public.shipments 
ADD COLUMN agent_cargo_weight_kg numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.shipments.agent_cargo_weight_kg IS 'Consolidated weight of agent cargo (not tracked individually) for billing purposes';