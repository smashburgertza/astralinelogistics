-- Create cargo_batches table
CREATE TABLE public.cargo_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  origin_region public.agent_region NOT NULL,
  region_id UUID REFERENCES public.regions(id),
  arrival_week_start DATE NOT NULL,
  arrival_week_end DATE NOT NULL,
  cargo_type TEXT NOT NULL DEFAULT 'air', -- 'air' or 'sea'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create batch_costs table for tracking various costs
CREATE TABLE public.batch_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.cargo_batches(id) ON DELETE CASCADE,
  cost_category TEXT NOT NULL, -- 'freight', 'import_duty', 'local_transport', 'customs_clearance', 'handling', 'other'
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add batch_id to shipments table
ALTER TABLE public.shipments ADD COLUMN batch_id UUID REFERENCES public.cargo_batches(id);

-- Enable RLS
ALTER TABLE public.cargo_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies for cargo_batches
CREATE POLICY "Admins can manage batches" ON public.cargo_batches
  FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Agents can view own region batches" ON public.cargo_batches
  FOR SELECT USING (
    has_role(auth.uid(), 'agent') AND origin_region = get_user_region(auth.uid())
  );

CREATE POLICY "Agents can insert batches for their region" ON public.cargo_batches
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'agent') AND origin_region = get_user_region(auth.uid())
  );

CREATE POLICY "Agents can update open batches in their region" ON public.cargo_batches
  FOR UPDATE USING (
    has_role(auth.uid(), 'agent') AND 
    origin_region = get_user_region(auth.uid()) AND 
    status = 'open'
  );

-- RLS policies for batch_costs
CREATE POLICY "Admins can manage batch costs" ON public.batch_costs
  FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Agents can insert freight costs" ON public.batch_costs
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'agent') AND 
    cost_category = 'freight' AND
    batch_id IN (
      SELECT id FROM public.cargo_batches 
      WHERE origin_region = get_user_region(auth.uid())
    )
  );

CREATE POLICY "Agents can view freight costs for their batches" ON public.batch_costs
  FOR SELECT USING (
    has_role(auth.uid(), 'agent') AND 
    cost_category = 'freight' AND
    batch_id IN (
      SELECT id FROM public.cargo_batches 
      WHERE origin_region = get_user_region(auth.uid())
    )
  );

CREATE POLICY "Agents can update freight costs for their batches" ON public.batch_costs
  FOR UPDATE USING (
    has_role(auth.uid(), 'agent') AND 
    cost_category = 'freight' AND
    batch_id IN (
      SELECT id FROM public.cargo_batches 
      WHERE origin_region = get_user_region(auth.uid()) AND status = 'open'
    )
  );

-- Function to generate batch number
CREATE OR REPLACE FUNCTION public.generate_batch_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'BATCH-' || TO_CHAR(NOW(), 'YYYYWW') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 4));
END;
$$;

-- Function to get or create batch for a region and week
CREATE OR REPLACE FUNCTION public.get_or_create_batch(
  _origin_region public.agent_region,
  _cargo_type TEXT DEFAULT 'air'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _batch_id UUID;
  _week_start DATE;
  _week_end DATE;
BEGIN
  -- Calculate current week boundaries (Monday to Sunday)
  _week_start := date_trunc('week', CURRENT_DATE)::DATE;
  _week_end := (_week_start + INTERVAL '6 days')::DATE;
  
  -- Try to find existing open batch for this region, week, and cargo type
  SELECT id INTO _batch_id
  FROM public.cargo_batches
  WHERE origin_region = _origin_region
    AND cargo_type = _cargo_type
    AND arrival_week_start = _week_start
    AND status = 'open'
  LIMIT 1;
  
  -- If no batch exists, create one
  IF _batch_id IS NULL THEN
    INSERT INTO public.cargo_batches (
      batch_number,
      origin_region,
      arrival_week_start,
      arrival_week_end,
      cargo_type,
      created_by
    ) VALUES (
      generate_batch_number(),
      _origin_region,
      _week_start,
      _week_end,
      _cargo_type,
      auth.uid()
    )
    RETURNING id INTO _batch_id;
  END IF;
  
  RETURN _batch_id;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_cargo_batches_updated_at
  BEFORE UPDATE ON public.cargo_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batch_costs_updated_at
  BEFORE UPDATE ON public.batch_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();