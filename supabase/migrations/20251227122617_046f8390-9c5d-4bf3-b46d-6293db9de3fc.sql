-- Step 1: Create the new regions table
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  flag_emoji text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active regions" ON public.regions
FOR SELECT USING (is_active = true OR is_admin_or_employee(auth.uid()));

CREATE POLICY "Admins can manage regions" ON public.regions
FOR ALL USING (is_admin_or_employee(auth.uid()));

-- Insert existing regions from enum
INSERT INTO public.regions (code, name, flag_emoji, display_order) VALUES
  ('europe', 'Europe', '🇪🇺', 1),
  ('dubai', 'Dubai', '🇦🇪', 2),
  ('china', 'China', '🇨🇳', 3),
  ('india', 'India', '🇮🇳', 4),
  ('usa', 'USA', '🇺🇸', 5),
  ('uk', 'United Kingdom', '🇬🇧', 6);

-- Step 2: Add region_id columns to all tables that use agent_region enum
ALTER TABLE public.agent_addresses ADD COLUMN region_id uuid REFERENCES public.regions(id);
ALTER TABLE public.region_pricing ADD COLUMN region_id uuid REFERENCES public.regions(id);
ALTER TABLE public.container_pricing ADD COLUMN region_id uuid REFERENCES public.regions(id);
ALTER TABLE public.vehicle_pricing ADD COLUMN region_id uuid REFERENCES public.regions(id);
ALTER TABLE public.shipping_calculator_charges ADD COLUMN region_id uuid REFERENCES public.regions(id);
ALTER TABLE public.expenses ADD COLUMN region_id uuid REFERENCES public.regions(id);
ALTER TABLE public.shipments ADD COLUMN region_id uuid REFERENCES public.regions(id);
ALTER TABLE public.user_roles ADD COLUMN region_id uuid REFERENCES public.regions(id);

-- Step 3: Migrate existing data from enum to region_id
UPDATE public.agent_addresses aa SET region_id = r.id FROM public.regions r WHERE r.code = aa.region::text;
UPDATE public.region_pricing rp SET region_id = r.id FROM public.regions r WHERE r.code = rp.region::text;
UPDATE public.container_pricing cp SET region_id = r.id FROM public.regions r WHERE r.code = cp.region::text;
UPDATE public.vehicle_pricing vp SET region_id = r.id FROM public.regions r WHERE r.code = vp.region::text;
UPDATE public.shipping_calculator_charges sc SET region_id = r.id FROM public.regions r WHERE r.code = sc.region::text;
UPDATE public.expenses e SET region_id = r.id FROM public.regions r WHERE r.code = e.region::text AND e.region IS NOT NULL;
UPDATE public.shipments s SET region_id = r.id FROM public.regions r WHERE r.code = s.origin_region::text;
UPDATE public.user_roles ur SET region_id = r.id FROM public.regions r WHERE r.code = ur.region::text AND ur.region IS NOT NULL;

-- Step 4: Create trigger for updated_at
CREATE TRIGGER update_regions_updated_at
BEFORE UPDATE ON public.regions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 5: Create helper function to get region by code
CREATE OR REPLACE FUNCTION public.get_region_id_by_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.regions WHERE code = _code LIMIT 1
$$;