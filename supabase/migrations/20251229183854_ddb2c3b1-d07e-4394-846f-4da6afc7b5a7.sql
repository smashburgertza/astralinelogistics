
-- Add agent_code column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agent_code text UNIQUE;

-- Add agent counter to document_counters
INSERT INTO public.document_counters (counter_key, counter_value, prefix, description) 
VALUES ('agent', 0, 'AG', 'Agent code counter')
ON CONFLICT (counter_key) DO NOTHING;

-- Create function to generate agent code
CREATE OR REPLACE FUNCTION public.generate_agent_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next_value integer;
BEGIN
  UPDATE public.document_counters
  SET counter_value = counter_value + 1, updated_at = now()
  WHERE counter_key = 'agent'
  RETURNING counter_value INTO v_next_value;
  
  RETURN 'AG' || LPAD(v_next_value::text, 4, '0');
END;
$$;
