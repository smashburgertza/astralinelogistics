-- Create service_types table for dynamic service type management
CREATE TABLE public.service_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color_class TEXT DEFAULT 'bg-gray-100 text-gray-800',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment for the table
COMMENT ON TABLE public.service_types IS 'Dynamic service types for products and services categorization';

-- Enable RLS
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage service types"
ON public.service_types
FOR ALL
USING (public.is_admin_or_employee(auth.uid()))
WITH CHECK (public.is_admin_or_employee(auth.uid()));

-- Create policy for public read access (needed for forms/selectors)
CREATE POLICY "Service types are publicly readable"
ON public.service_types
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_service_types_updated_at
BEFORE UPDATE ON public.service_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default service types based on current hardcoded values
INSERT INTO public.service_types (name, slug, description, color_class, sort_order) VALUES
  ('Air Cargo', 'air_cargo', 'Air freight shipping services', 'bg-blue-100 text-blue-800', 1),
  ('Sea Freight', 'sea_freight', 'Ocean freight shipping services', 'bg-cyan-100 text-cyan-800', 2),
  ('Handling', 'handling', 'Cargo handling and processing fees', 'bg-orange-100 text-orange-800', 3),
  ('Customs', 'customs', 'Customs clearance and duties', 'bg-purple-100 text-purple-800', 4),
  ('Insurance', 'insurance', 'Cargo insurance services', 'bg-green-100 text-green-800', 5),
  ('Transit', 'transit', 'Transit and delivery services', 'bg-yellow-100 text-yellow-800', 6),
  ('Purchasing', 'purchasing', 'Shop for me purchasing fees', 'bg-pink-100 text-pink-800', 7),
  ('Other', 'other', 'Other miscellaneous services', 'bg-gray-100 text-gray-800', 8);