-- Add cargo_type and service_type columns to region_pricing
ALTER TABLE public.region_pricing 
ADD COLUMN cargo_type text NOT NULL DEFAULT 'sea'
CHECK (cargo_type IN ('sea', 'air'));

ALTER TABLE public.region_pricing 
ADD COLUMN service_type text DEFAULT NULL
CHECK (service_type IS NULL OR service_type IN ('door_to_door', 'airport_to_airport'));

-- Update existing rows to be sea cargo (default behavior)
UPDATE public.region_pricing SET cargo_type = 'sea' WHERE cargo_type = 'sea';