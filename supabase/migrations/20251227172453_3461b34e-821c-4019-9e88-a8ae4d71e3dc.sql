-- Add transit_point column to region_pricing table
ALTER TABLE public.region_pricing 
ADD COLUMN transit_point public.transit_point_type DEFAULT 'direct';

-- Create unique constraint for region + cargo_type + service_type + transit_point combination
ALTER TABLE public.region_pricing
ADD CONSTRAINT region_pricing_unique_combination 
UNIQUE (region, cargo_type, service_type, transit_point);