-- Add region column to shipping_calculator_charges
ALTER TABLE public.shipping_calculator_charges 
ADD COLUMN region public.agent_region NOT NULL DEFAULT 'usa';

-- Add currency column based on region
ALTER TABLE public.shipping_calculator_charges 
ADD COLUMN currency text NOT NULL DEFAULT 'USD';

-- Update existing records to have proper default
UPDATE public.shipping_calculator_charges SET region = 'usa', currency = 'USD';