-- Create function to generate employee code
CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Get the next counter value for employee codes
  INSERT INTO document_counters (counter_key, counter_value, prefix, description)
  VALUES ('employee_code', 1, 'EMP', 'Employee ID counter')
  ON CONFLICT (counter_key) DO UPDATE
  SET counter_value = document_counters.counter_value + 1,
      updated_at = now()
  RETURNING counter_value INTO next_number;
  
  -- Format as EMP001, EMP002, etc.
  new_code := 'EMP' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_code;
END;
$$;