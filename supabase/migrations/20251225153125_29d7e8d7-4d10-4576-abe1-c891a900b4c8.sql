-- Create a table for configurable shop for me charges
CREATE TABLE public.shop_for_me_charges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  charge_name text NOT NULL,
  charge_key text NOT NULL UNIQUE,
  charge_type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  charge_value numeric NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'product_cost', -- what it applies to: 'product_cost', 'subtotal', 'cumulative'
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_for_me_charges ENABLE ROW LEVEL SECURITY;

-- Admins can manage charges
CREATE POLICY "Admins can manage shop for me charges"
ON public.shop_for_me_charges
FOR ALL
USING (is_admin_or_employee(auth.uid()));

-- Anyone can view active charges
CREATE POLICY "Anyone can view active charges"
ON public.shop_for_me_charges
FOR SELECT
USING (is_active = true);

-- Insert default charges
INSERT INTO public.shop_for_me_charges (charge_name, charge_key, charge_type, charge_value, applies_to, display_order, description) VALUES
('Duty & Clearing', 'duty_clearing', 'percentage', 35, 'product_cost', 1, 'Import duty and customs clearing fee'),
('Handling Fee', 'handling_fee', 'percentage', 3, 'cumulative', 3, 'Handling fee applied to product cost, duty, and shipping');

-- Add trigger for updated_at
CREATE TRIGGER update_shop_for_me_charges_updated_at
  BEFORE UPDATE ON public.shop_for_me_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();