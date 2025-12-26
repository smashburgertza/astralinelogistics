-- Create vehicle duty rates table for Tanzania import duties
CREATE TABLE public.vehicle_duty_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_key text NOT NULL UNIQUE,
  rate_name text NOT NULL,
  rate_type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  rate_value numeric NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'cif_value', -- 'cif_value', 'dutiable_value', 'cumulative'
  engine_cc_min integer DEFAULT NULL, -- for engine-based rates
  engine_cc_max integer DEFAULT NULL,
  vehicle_age_min integer DEFAULT NULL, -- for age-based rates (years)
  vehicle_category text DEFAULT NULL, -- 'utility', 'non_utility', 'motorcycle'
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_duty_rates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage vehicle duty rates" 
ON public.vehicle_duty_rates 
FOR ALL 
USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Anyone can view vehicle duty rates" 
ON public.vehicle_duty_rates 
FOR SELECT 
USING (true);

-- Insert Tanzania's standard vehicle import duty rates
INSERT INTO public.vehicle_duty_rates (rate_key, rate_name, rate_type, rate_value, applies_to, engine_cc_min, engine_cc_max, display_order, description) VALUES
  ('import_duty', 'Import Duty', 'percentage', 25, 'cif_value', NULL, NULL, 1, 'Standard 25% import duty on CIF value'),
  ('excise_duty_0', 'Excise Duty (≤1000cc)', 'percentage', 0, 'cif_value', 0, 1000, 2, '0% excise for vehicles up to 1000cc'),
  ('excise_duty_5', 'Excise Duty (1001-2000cc)', 'percentage', 5, 'cif_value', 1001, 2000, 3, '5% excise for vehicles 1001-2000cc'),
  ('excise_duty_10', 'Excise Duty (>2000cc)', 'percentage', 10, 'cif_value', 2001, NULL, 4, '10% excise for vehicles over 2000cc'),
  ('vat', 'VAT', 'percentage', 18, 'cumulative', NULL, NULL, 5, '18% VAT on dutiable value + import duty + excise'),
  ('registration_fee', 'Registration Fee', 'fixed', 50000, 'fixed', NULL, NULL, 6, 'TRA registration fee (TZS)'),
  ('plate_number_fee', 'Plate Number Fee', 'fixed', 100000, 'fixed', NULL, NULL, 7, 'Vehicle plate number fee (TZS)');

-- Insert age-based surcharges
INSERT INTO public.vehicle_duty_rates (rate_key, rate_name, rate_type, rate_value, applies_to, vehicle_age_min, vehicle_category, display_order, description) VALUES
  ('old_vehicle_non_utility', 'Old Vehicle Fee (Non-Utility)', 'percentage', 25, 'cif_value', 8, 'non_utility', 8, '25% surcharge for non-utility vehicles 8+ years old'),
  ('old_vehicle_utility', 'Old Vehicle Fee (Utility)', 'percentage', 5, 'cif_value', 8, 'utility', 9, '5% surcharge for utility vehicles 8+ years old');

-- Create updated_at trigger
CREATE TRIGGER update_vehicle_duty_rates_updated_at
BEFORE UPDATE ON public.vehicle_duty_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();