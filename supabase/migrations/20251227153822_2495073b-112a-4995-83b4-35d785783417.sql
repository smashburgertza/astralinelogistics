-- Add cargo_type column to shipping_calculator_charges
ALTER TABLE public.shipping_calculator_charges 
ADD COLUMN cargo_type text NOT NULL DEFAULT 'sea'
CHECK (cargo_type IN ('sea', 'air'));

-- Add service_type column for air cargo sub-types
ALTER TABLE public.shipping_calculator_charges 
ADD COLUMN service_type text DEFAULT NULL
CHECK (service_type IS NULL OR service_type IN ('door_to_door', 'airport_to_airport'));