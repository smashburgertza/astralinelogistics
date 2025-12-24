-- Fix search_path for functions
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_tracking TEXT;
BEGIN
  new_tracking := 'AST' || TO_CHAR(NOW(), 'YYMMDD') || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
  RETURN new_tracking;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_document_number(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN prefix || '-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;