-- Create shipping calculator charges table for additional fees
CREATE TABLE public.shipping_calculator_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  charge_key TEXT NOT NULL UNIQUE,
  charge_name TEXT NOT NULL,
  charge_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' or 'percentage'
  charge_value NUMERIC NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'shipping_cost', -- 'shipping_cost', 'cif_value', 'order_total'
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_calculator_charges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage shipping calculator charges"
  ON public.shipping_calculator_charges
  FOR ALL
  USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Anyone can view active shipping charges"
  ON public.shipping_calculator_charges
  FOR SELECT
  USING (is_active = true);

-- Insert some default charges
INSERT INTO public.shipping_calculator_charges (charge_key, charge_name, charge_type, charge_value, applies_to, description, display_order)
VALUES 
  ('inspection_fee', 'Inspection Fee', 'fixed', 150, 'order_total', 'Pre-shipment inspection fee', 1),
  ('agency_fee', 'Agency Fee', 'fixed', 100, 'order_total', 'Customs clearance agency fee', 2),
  ('documentation_fee', 'Documentation Fee', 'fixed', 50, 'order_total', 'Document processing and handling', 3);