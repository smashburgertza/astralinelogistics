-- =====================================================
-- ASTRALINE LOGISTICS - DATABASE SCHEMA OVERHAUL
-- =====================================================

-- 1. Create billing_party enum (simpler ownership model)
DO $$ BEGIN
  CREATE TYPE billing_party_type AS ENUM ('customer_direct', 'agent_collect', 'astraline_internal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create invoice_items table (itemized charges)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'freight', 'customs', 'handling', 'insurance', 'duty', 'other'
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create settlements table (agent payment/receipt tracking)
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_number TEXT NOT NULL UNIQUE,
  agent_id UUID NOT NULL,
  settlement_type TEXT NOT NULL, -- 'payment_to_agent', 'collection_from_agent'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount_in_tzs NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'cancelled'
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create settlement_items table (invoices included in settlement)
CREATE TABLE IF NOT EXISTS public.settlement_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_id UUID NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create shipment_cost_allocations table (batch cost → individual shipment)
CREATE TABLE IF NOT EXISTS public.shipment_cost_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  batch_cost_id UUID NOT NULL REFERENCES public.batch_costs(id) ON DELETE CASCADE,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  allocation_method TEXT NOT NULL DEFAULT 'weight', -- 'weight', 'equal', 'manual'
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(shipment_id, batch_cost_id)
);

-- 6. Add billing_party to shipments (simpler than shipment_owner + invoice_direction)
ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS billing_party billing_party_type DEFAULT 'customer_direct';

-- 7. Add rate_per_kg to shipments (was only on invoice before)
ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS rate_per_kg NUMERIC;

-- 8. Add total_cost and profit columns to shipments for easy querying
ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS total_revenue NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;

-- 9. Add weight_kg to invoice_items for freight calculations
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- invoice_items RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoice items" ON public.invoice_items
  FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Customers can view own invoice items" ON public.invoice_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM public.invoices 
      WHERE customer_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agents can view invoice items for their invoices" ON public.invoice_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE agent_id = auth.uid()
    )
  );

-- settlements RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settlements" ON public.settlements
  FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Agents can view own settlements" ON public.settlements
  FOR SELECT USING (agent_id = auth.uid());

-- settlement_items RLS
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settlement items" ON public.settlement_items
  FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Agents can view own settlement items" ON public.settlement_items
  FOR SELECT USING (
    settlement_id IN (
      SELECT id FROM public.settlements WHERE agent_id = auth.uid()
    )
  );

-- shipment_cost_allocations RLS
ALTER TABLE public.shipment_cost_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cost allocations" ON public.shipment_cost_allocations
  FOR ALL USING (is_admin_or_employee(auth.uid()));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update settlements updated_at
CREATE TRIGGER update_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Generate settlement number
CREATE OR REPLACE FUNCTION public.generate_settlement_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'SET-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;

-- Calculate and allocate batch costs to shipments by weight
CREATE OR REPLACE FUNCTION public.allocate_batch_costs(p_batch_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_weight NUMERIC;
  v_cost RECORD;
BEGIN
  -- Get total weight of all shipments in batch
  SELECT COALESCE(SUM(total_weight_kg), 0) INTO v_total_weight
  FROM public.shipments
  WHERE batch_id = p_batch_id;
  
  -- Skip if no weight
  IF v_total_weight = 0 THEN
    RETURN;
  END IF;
  
  -- For each batch cost, allocate to shipments by weight proportion
  FOR v_cost IN 
    SELECT id, amount, currency FROM public.batch_costs WHERE batch_id = p_batch_id
  LOOP
    -- Delete existing allocations for this cost
    DELETE FROM public.shipment_cost_allocations WHERE batch_cost_id = v_cost.id;
    
    -- Insert new allocations
    INSERT INTO public.shipment_cost_allocations (shipment_id, batch_cost_id, allocated_amount, currency, allocation_method)
    SELECT 
      s.id,
      v_cost.id,
      ROUND((s.total_weight_kg / v_total_weight) * v_cost.amount, 2),
      v_cost.currency,
      'weight'
    FROM public.shipments s
    WHERE s.batch_id = p_batch_id AND s.total_weight_kg > 0;
  END LOOP;
  
  -- Update shipment total_cost and profit
  UPDATE public.shipments s
  SET 
    total_cost = COALESCE((
      SELECT SUM(allocated_amount) 
      FROM public.shipment_cost_allocations 
      WHERE shipment_id = s.id
    ), 0),
    profit = COALESCE(s.total_revenue, 0) - COALESCE((
      SELECT SUM(allocated_amount) 
      FROM public.shipment_cost_allocations 
      WHERE shipment_id = s.id
    ), 0)
  WHERE s.batch_id = p_batch_id;
END;
$$;