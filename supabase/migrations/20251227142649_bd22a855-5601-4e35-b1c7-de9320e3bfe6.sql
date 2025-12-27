-- Create table for per-region delivery times
CREATE TABLE public.region_delivery_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  delivery_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(region_id, service_type)
);

-- Enable RLS
ALTER TABLE public.region_delivery_times ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view delivery times"
ON public.region_delivery_times
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage delivery times"
ON public.region_delivery_times
FOR ALL
USING (is_admin_or_employee(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_region_delivery_times_updated_at
BEFORE UPDATE ON public.region_delivery_times
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.region_delivery_times;

-- Add index for faster lookups
CREATE INDEX idx_region_delivery_times_region_id ON public.region_delivery_times(region_id);