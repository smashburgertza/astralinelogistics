-- Create products_services table for reusable invoice items
CREATE TABLE public.products_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'service',
  service_type TEXT, -- e.g., 'air_cargo', 'sea_freight', 'handling', etc.
  unit_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  unit TEXT DEFAULT 'kg', -- e.g., 'kg', 'unit', 'hour', 'shipment'
  account_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;

-- Admins can manage products/services
CREATE POLICY "Admins can manage products_services"
  ON public.products_services
  FOR ALL
  USING (is_admin_or_employee(auth.uid()));

-- Anyone authenticated can view active products/services (for invoice creation)
CREATE POLICY "Authenticated users can view active products_services"
  ON public.products_services
  FOR SELECT
  USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_products_services_updated_at
  BEFORE UPDATE ON public.products_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some default services
INSERT INTO public.products_services (name, description, category, service_type, unit_price, currency, unit) VALUES
  ('Air Cargo - Standard', 'Standard air freight shipping per kg', 'service', 'air_cargo', 8.00, 'USD', 'kg'),
  ('Air Cargo - Express', 'Express air freight shipping per kg', 'service', 'air_cargo', 12.00, 'USD', 'kg'),
  ('Sea Freight - Standard', 'Standard sea freight shipping per kg', 'service', 'sea_freight', 3.50, 'USD', 'kg'),
  ('Handling Fee', 'Package handling and processing', 'service', 'handling', 5.00, 'USD', 'unit'),
  ('Customs Clearance', 'Customs clearance service', 'service', 'customs', 25.00, 'USD', 'shipment'),
  ('Insurance', 'Cargo insurance per $100 value', 'service', 'insurance', 2.50, 'USD', 'unit');