-- ===========================================
-- SHOP FOR ME PRODUCT RATES TABLE
-- ===========================================
CREATE TABLE public.shop_for_me_product_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region public.agent_region NOT NULL,
  product_category TEXT NOT NULL CHECK (product_category IN 
    ('general', 'hazardous', 'cosmetics', 'electronics', 'spare_parts')),
  rate_per_kg DECIMAL NOT NULL DEFAULT 0,
  handling_fee_percentage DECIMAL NOT NULL DEFAULT 3,
  duty_percentage DECIMAL NOT NULL DEFAULT 35,
  markup_percentage DECIMAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(region, product_category)
);

-- Enable RLS
ALTER TABLE public.shop_for_me_product_rates ENABLE ROW LEVEL SECURITY;

-- Admin read policy
CREATE POLICY "Admins can read product rates"
ON public.shop_for_me_product_rates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'employee')
  )
);

-- Public read policy for customer-facing calculations
CREATE POLICY "Public can read active product rates"
ON public.shop_for_me_product_rates
FOR SELECT
USING (is_active = true);

-- Admin insert policy
CREATE POLICY "Admins can insert product rates"
ON public.shop_for_me_product_rates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'employee')
  )
);

-- Admin update policy
CREATE POLICY "Admins can update product rates"
ON public.shop_for_me_product_rates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'employee')
  )
);

-- Admin delete policy
CREATE POLICY "Admins can delete product rates"
ON public.shop_for_me_product_rates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'employee')
  )
);

-- Updated at trigger
CREATE TRIGGER update_shop_for_me_product_rates_updated_at
  BEFORE UPDATE ON public.shop_for_me_product_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- SHOP FOR ME VEHICLE RATES TABLE
-- ===========================================
CREATE TABLE public.shop_for_me_vehicle_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region public.agent_region NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN 
    ('motorcycle', 'sedan', 'suv', 'truck')),
  shipping_method TEXT NOT NULL CHECK (shipping_method IN 
    ('sea_roro', 'sea_container', 'air')),
  base_shipping_price DECIMAL NOT NULL DEFAULT 0,
  handling_fee DECIMAL NOT NULL DEFAULT 0,
  duty_percentage DECIMAL NOT NULL DEFAULT 0,
  markup_percentage DECIMAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(region, vehicle_type, shipping_method)
);

-- Enable RLS
ALTER TABLE public.shop_for_me_vehicle_rates ENABLE ROW LEVEL SECURITY;

-- Admin read policy
CREATE POLICY "Admins can read vehicle rates"
ON public.shop_for_me_vehicle_rates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'employee')
  )
);

-- Public read policy for customer-facing calculations
CREATE POLICY "Public can read active vehicle rates"
ON public.shop_for_me_vehicle_rates
FOR SELECT
USING (is_active = true);

-- Admin insert policy
CREATE POLICY "Admins can insert vehicle rates"
ON public.shop_for_me_vehicle_rates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'employee')
  )
);

-- Admin update policy
CREATE POLICY "Admins can update vehicle rates"
ON public.shop_for_me_vehicle_rates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'employee')
  )
);

-- Admin delete policy
CREATE POLICY "Admins can delete vehicle rates"
ON public.shop_for_me_vehicle_rates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'employee')
  )
);

-- Updated at trigger
CREATE TRIGGER update_shop_for_me_vehicle_rates_updated_at
  BEFORE UPDATE ON public.shop_for_me_vehicle_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- SEED INITIAL PRODUCT RATES DATA
-- ===========================================
INSERT INTO public.shop_for_me_product_rates (region, product_category, rate_per_kg, handling_fee_percentage, duty_percentage, display_order) VALUES
('usa', 'general', 8, 3, 35, 1),
('usa', 'hazardous', 15, 5, 45, 2),
('usa', 'cosmetics', 10, 3, 40, 3),
('usa', 'electronics', 12, 4, 25, 4),
('usa', 'spare_parts', 9, 3, 30, 5),
('uk', 'general', 7, 3, 35, 1),
('uk', 'hazardous', 14, 5, 45, 2),
('uk', 'cosmetics', 9, 3, 40, 3),
('uk', 'electronics', 11, 4, 25, 4),
('uk', 'spare_parts', 8, 3, 30, 5),
('europe', 'general', 9, 3, 35, 1),
('europe', 'hazardous', 16, 5, 45, 2),
('europe', 'cosmetics', 11, 3, 40, 3),
('europe', 'electronics', 13, 4, 25, 4),
('europe', 'spare_parts', 10, 3, 30, 5),
('dubai', 'general', 6, 3, 35, 1),
('dubai', 'hazardous', 12, 5, 45, 2),
('dubai', 'cosmetics', 8, 3, 40, 3),
('dubai', 'electronics', 10, 4, 25, 4),
('dubai', 'spare_parts', 7, 3, 30, 5),
('china', 'general', 5, 3, 35, 1),
('china', 'hazardous', 10, 5, 45, 2),
('china', 'cosmetics', 7, 3, 40, 3),
('china', 'electronics', 8, 4, 25, 4),
('china', 'spare_parts', 6, 3, 30, 5),
('india', 'general', 6, 3, 35, 1),
('india', 'hazardous', 11, 5, 45, 2),
('india', 'cosmetics', 8, 3, 40, 3),
('india', 'electronics', 9, 4, 25, 4),
('india', 'spare_parts', 7, 3, 30, 5);

-- ===========================================
-- SEED INITIAL VEHICLE RATES DATA
-- ===========================================
INSERT INTO public.shop_for_me_vehicle_rates (region, vehicle_type, shipping_method, base_shipping_price, handling_fee, duty_percentage) VALUES
('usa', 'motorcycle', 'sea_roro', 800, 100, 25),
('usa', 'motorcycle', 'sea_container', 1200, 150, 25),
('usa', 'motorcycle', 'air', 3500, 200, 25),
('usa', 'sedan', 'sea_roro', 1500, 200, 25),
('usa', 'sedan', 'sea_container', 2500, 300, 25),
('usa', 'sedan', 'air', 8000, 500, 25),
('usa', 'suv', 'sea_roro', 2000, 250, 25),
('usa', 'suv', 'sea_container', 3500, 400, 25),
('usa', 'suv', 'air', 12000, 700, 25),
('usa', 'truck', 'sea_roro', 2500, 300, 25),
('usa', 'truck', 'sea_container', 4500, 500, 25),
('usa', 'truck', 'air', 15000, 900, 25),
('uk', 'motorcycle', 'sea_roro', 700, 100, 25),
('uk', 'motorcycle', 'sea_container', 1100, 150, 25),
('uk', 'motorcycle', 'air', 3200, 200, 25),
('uk', 'sedan', 'sea_roro', 1400, 200, 25),
('uk', 'sedan', 'sea_container', 2300, 300, 25),
('uk', 'sedan', 'air', 7500, 500, 25),
('uk', 'suv', 'sea_roro', 1800, 250, 25),
('uk', 'suv', 'sea_container', 3200, 400, 25),
('uk', 'suv', 'air', 11000, 700, 25),
('uk', 'truck', 'sea_roro', 2300, 300, 25),
('uk', 'truck', 'sea_container', 4200, 500, 25),
('uk', 'truck', 'air', 14000, 900, 25),
('europe', 'motorcycle', 'sea_roro', 750, 100, 25),
('europe', 'motorcycle', 'sea_container', 1150, 150, 25),
('europe', 'motorcycle', 'air', 3400, 200, 25),
('europe', 'sedan', 'sea_roro', 1450, 200, 25),
('europe', 'sedan', 'sea_container', 2400, 300, 25),
('europe', 'sedan', 'air', 7800, 500, 25),
('europe', 'suv', 'sea_roro', 1900, 250, 25),
('europe', 'suv', 'sea_container', 3400, 400, 25),
('europe', 'suv', 'air', 11500, 700, 25),
('europe', 'truck', 'sea_roro', 2400, 300, 25),
('europe', 'truck', 'sea_container', 4400, 500, 25),
('europe', 'truck', 'air', 14500, 900, 25),
('dubai', 'motorcycle', 'sea_roro', 600, 100, 25),
('dubai', 'motorcycle', 'sea_container', 1000, 150, 25),
('dubai', 'motorcycle', 'air', 2800, 200, 25),
('dubai', 'sedan', 'sea_roro', 1200, 200, 25),
('dubai', 'sedan', 'sea_container', 2000, 300, 25),
('dubai', 'sedan', 'air', 6500, 500, 25),
('dubai', 'suv', 'sea_roro', 1600, 250, 25),
('dubai', 'suv', 'sea_container', 2800, 400, 25),
('dubai', 'suv', 'air', 9500, 700, 25),
('dubai', 'truck', 'sea_roro', 2000, 300, 25),
('dubai', 'truck', 'sea_container', 3800, 500, 25),
('dubai', 'truck', 'air', 12000, 900, 25),
('china', 'motorcycle', 'sea_roro', 500, 100, 25),
('china', 'motorcycle', 'sea_container', 900, 150, 25),
('china', 'motorcycle', 'air', 2500, 200, 25),
('china', 'sedan', 'sea_roro', 1000, 200, 25),
('china', 'sedan', 'sea_container', 1800, 300, 25),
('china', 'sedan', 'air', 6000, 500, 25),
('china', 'suv', 'sea_roro', 1400, 250, 25),
('china', 'suv', 'sea_container', 2500, 400, 25),
('china', 'suv', 'air', 8500, 700, 25),
('china', 'truck', 'sea_roro', 1800, 300, 25),
('china', 'truck', 'sea_container', 3500, 500, 25),
('china', 'truck', 'air', 11000, 900, 25),
('india', 'motorcycle', 'sea_roro', 550, 100, 25),
('india', 'motorcycle', 'sea_container', 950, 150, 25),
('india', 'motorcycle', 'air', 2700, 200, 25),
('india', 'sedan', 'sea_roro', 1100, 200, 25),
('india', 'sedan', 'sea_container', 1900, 300, 25),
('india', 'sedan', 'air', 6200, 500, 25),
('india', 'suv', 'sea_roro', 1500, 250, 25),
('india', 'suv', 'sea_container', 2700, 400, 25),
('india', 'suv', 'air', 9000, 700, 25),
('india', 'truck', 'sea_roro', 1900, 300, 25),
('india', 'truck', 'sea_container', 3700, 500, 25),
('india', 'truck', 'air', 11500, 900, 25);