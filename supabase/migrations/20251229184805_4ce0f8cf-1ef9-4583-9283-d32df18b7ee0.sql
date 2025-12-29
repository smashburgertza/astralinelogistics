-- Add employee_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_code text;

-- Add document counter for employees
INSERT INTO public.document_counters (counter_key, prefix, counter_value, description)
VALUES ('employee', 'EMP', 0, 'Employee sequential ID counter')
ON CONFLICT (counter_key) DO NOTHING;

-- Create function to generate employee code
CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_next_value integer;
BEGIN
  UPDATE public.document_counters
  SET counter_value = counter_value + 1, updated_at = now()
  WHERE counter_key = 'employee'
  RETURNING counter_value INTO v_next_value;
  
  RETURN 'EMP' || LPAD(v_next_value::text, 4, '0');
END;
$$;