-- Update the generate_batch_number function to use new format: DDMonYYYY{Origin}toTZ
-- Example: 30Dec2025UKtoTZ

CREATE OR REPLACE FUNCTION public.generate_batch_number(_origin_region text DEFAULT 'UK')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_part text;
  v_origin_code text;
BEGIN
  -- Format date as DDMonYYYY (e.g., 30Dec2025)
  v_date_part := TO_CHAR(CURRENT_DATE, 'DDMon') || TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Use the origin region code (e.g., uk -> UK, uae -> UAE)
  v_origin_code := UPPER(_origin_region);
  
  -- Format: DDMonYYYY{Origin}toTZ (e.g., 30Dec2025UKtoTZ)
  RETURN v_date_part || v_origin_code || 'toTZ';
END;
$$;

-- Update the get_or_create_batch function to pass origin region to generate_batch_number
CREATE OR REPLACE FUNCTION public.get_or_create_batch(_origin_region agent_region, _cargo_type text DEFAULT 'air')
RETURNS uuid
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
      generate_batch_number(_origin_region::text),
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