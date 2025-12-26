-- Create container pricing table
CREATE TABLE public.container_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  container_size TEXT NOT NULL CHECK (container_size IN ('20ft', '40ft')),
  region agent_region NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(container_size, region)
);

-- Create vehicle pricing table
CREATE TABLE public.vehicle_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('motorcycle', 'sedan', 'suv', 'truck')),
  shipping_method TEXT NOT NULL CHECK (shipping_method IN ('roro', 'container')),
  region agent_region NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(vehicle_type, shipping_method, region)
);

-- Enable RLS
ALTER TABLE public.container_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_pricing ENABLE ROW LEVEL SECURITY;

-- RLS policies for container_pricing
CREATE POLICY "Anyone can view container pricing" 
ON public.container_pricing 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage container pricing" 
ON public.container_pricing 
FOR ALL 
USING (is_admin_or_employee(auth.uid()));

-- RLS policies for vehicle_pricing
CREATE POLICY "Anyone can view vehicle pricing" 
ON public.vehicle_pricing 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage vehicle pricing" 
ON public.vehicle_pricing 
FOR ALL 
USING (is_admin_or_employee(auth.uid()));

-- Add update triggers
CREATE TRIGGER update_container_pricing_updated_at
BEFORE UPDATE ON public.container_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_pricing_updated_at
BEFORE UPDATE ON public.vehicle_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default container pricing data
INSERT INTO public.container_pricing (container_size, region, price, currency) VALUES
('20ft', 'europe', 2500, 'GBP'),
('20ft', 'dubai', 1800, 'USD'),
('20ft', 'china', 2200, 'USD'),
('20ft', 'india', 1900, 'USD'),
('20ft', 'usa', 3500, 'USD'),
('20ft', 'uk', 2400, 'GBP'),
('40ft', 'europe', 4200, 'GBP'),
('40ft', 'dubai', 3200, 'USD'),
('40ft', 'china', 3800, 'USD'),
('40ft', 'india', 3400, 'USD'),
('40ft', 'usa', 5800, 'USD'),
('40ft', 'uk', 4000, 'GBP');

-- Insert default vehicle pricing data (RoRo)
INSERT INTO public.vehicle_pricing (vehicle_type, shipping_method, region, price, currency) VALUES
('motorcycle', 'roro', 'europe', 800, 'USD'),
('motorcycle', 'roro', 'dubai', 600, 'USD'),
('motorcycle', 'roro', 'china', 700, 'USD'),
('motorcycle', 'roro', 'india', 650, 'USD'),
('motorcycle', 'roro', 'usa', 1200, 'USD'),
('motorcycle', 'roro', 'uk', 750, 'USD'),
('sedan', 'roro', 'europe', 1500, 'USD'),
('sedan', 'roro', 'dubai', 1100, 'USD'),
('sedan', 'roro', 'china', 1300, 'USD'),
('sedan', 'roro', 'india', 1200, 'USD'),
('sedan', 'roro', 'usa', 2200, 'USD'),
('sedan', 'roro', 'uk', 1400, 'USD'),
('suv', 'roro', 'europe', 1800, 'USD'),
('suv', 'roro', 'dubai', 1400, 'USD'),
('suv', 'roro', 'china', 1600, 'USD'),
('suv', 'roro', 'india', 1500, 'USD'),
('suv', 'roro', 'usa', 2600, 'USD'),
('suv', 'roro', 'uk', 1700, 'USD'),
('truck', 'roro', 'europe', 2200, 'USD'),
('truck', 'roro', 'dubai', 1800, 'USD'),
('truck', 'roro', 'china', 2000, 'USD'),
('truck', 'roro', 'india', 1900, 'USD'),
('truck', 'roro', 'usa', 3200, 'USD'),
('truck', 'roro', 'uk', 2100, 'USD'),
-- Container shipping
('motorcycle', 'container', 'europe', 1200, 'USD'),
('motorcycle', 'container', 'dubai', 900, 'USD'),
('motorcycle', 'container', 'china', 1000, 'USD'),
('motorcycle', 'container', 'india', 950, 'USD'),
('motorcycle', 'container', 'usa', 1600, 'USD'),
('motorcycle', 'container', 'uk', 1100, 'USD'),
('sedan', 'container', 'europe', 2500, 'USD'),
('sedan', 'container', 'dubai', 1900, 'USD'),
('sedan', 'container', 'china', 2200, 'USD'),
('sedan', 'container', 'india', 2000, 'USD'),
('sedan', 'container', 'usa', 3500, 'USD'),
('sedan', 'container', 'uk', 2400, 'USD'),
('suv', 'container', 'europe', 3000, 'USD'),
('suv', 'container', 'dubai', 2400, 'USD'),
('suv', 'container', 'china', 2700, 'USD'),
('suv', 'container', 'india', 2500, 'USD'),
('suv', 'container', 'usa', 4200, 'USD'),
('suv', 'container', 'uk', 2900, 'USD'),
('truck', 'container', 'europe', 3800, 'USD'),
('truck', 'container', 'dubai', 3000, 'USD'),
('truck', 'container', 'china', 3400, 'USD'),
('truck', 'container', 'india', 3200, 'USD'),
('truck', 'container', 'usa', 5000, 'USD'),
('truck', 'container', 'uk', 3600, 'USD');