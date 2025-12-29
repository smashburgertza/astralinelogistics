
-- Create a table to store sequential counters
CREATE TABLE public.document_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_key text UNIQUE NOT NULL,
  counter_value integer NOT NULL DEFAULT 0,
  prefix text,
  description text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;

-- Only admins can manage counters
CREATE POLICY "Admins can manage counters" ON public.document_counters
  FOR ALL USING (is_admin_or_employee(auth.uid()));

-- Insert initial counters (starting from 0, will increment to 1 on first use)
INSERT INTO public.document_counters (counter_key, counter_value, prefix, description) VALUES
  ('invoice', 0, 'INV', 'Invoice number counter'),
  ('estimate', 0, 'EST', 'Estimate number counter'),
  ('customer', 0, 'CT', 'Customer code counter'),
  ('tracking', 0, 'AST', 'Tracking number counter'),
  ('batch', 0, 'BATCH', 'Cargo batch number counter'),
  ('settlement', 0, 'SET', 'Settlement number counter'),
  ('journal', 0, 'JE', 'Journal entry number counter');

-- Create function to get next sequential number
CREATE OR REPLACE FUNCTION public.get_next_sequence(p_counter_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_next_value integer;
BEGIN
  -- Lock and increment the counter atomically
  UPDATE public.document_counters
  SET counter_value = counter_value + 1, updated_at = now()
  WHERE counter_key = p_counter_key
  RETURNING counter_value, prefix INTO v_next_value, v_prefix;
  
  IF v_next_value IS NULL THEN
    RAISE EXCEPTION 'Counter key not found: %', p_counter_key;
  END IF;
  
  -- Return formatted number: PREFIX-YYYY-NNNN
  RETURN v_prefix || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_next_value::text, 4, '0');
END;
$$;

-- Update existing generator functions to use sequential counters

-- Invoice number generator
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN get_next_sequence('invoice');
END;
$$;

-- Estimate number generator  
CREATE OR REPLACE FUNCTION public.generate_estimate_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN get_next_sequence('estimate');
END;
$$;

-- Customer code generator (simpler format: CT0001)
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next_value integer;
BEGIN
  UPDATE public.document_counters
  SET counter_value = counter_value + 1, updated_at = now()
  WHERE counter_key = 'customer'
  RETURNING counter_value INTO v_next_value;
  
  RETURN 'CT' || LPAD(v_next_value::text, 4, '0');
END;
$$;

-- Tracking number generator
CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next_value integer;
BEGIN
  UPDATE public.document_counters
  SET counter_value = counter_value + 1, updated_at = now()
  WHERE counter_key = 'tracking'
  RETURNING counter_value INTO v_next_value;
  
  -- Format: AST-YYMMDD-NNNN
  RETURN 'AST' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(v_next_value::text, 4, '0');
END;
$$;

-- Batch number generator
CREATE OR REPLACE FUNCTION public.generate_batch_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next_value integer;
BEGIN
  UPDATE public.document_counters
  SET counter_value = counter_value + 1, updated_at = now()
  WHERE counter_key = 'batch'
  RETURNING counter_value INTO v_next_value;
  
  -- Format: BATCH-YYYYWW-NNNN
  RETURN 'BATCH-' || TO_CHAR(NOW(), 'YYYYWW') || '-' || LPAD(v_next_value::text, 4, '0');
END;
$$;

-- Settlement number generator
CREATE OR REPLACE FUNCTION public.generate_settlement_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN get_next_sequence('settlement');
END;
$$;

-- Journal entry number generator
CREATE OR REPLACE FUNCTION public.generate_journal_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN get_next_sequence('journal');
END;
$$;

-- Document number generator (generic)
CREATE OR REPLACE FUNCTION public.generate_document_number(prefix text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- For generic documents, use the prefix directly with timestamp
  RETURN prefix || '-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;
