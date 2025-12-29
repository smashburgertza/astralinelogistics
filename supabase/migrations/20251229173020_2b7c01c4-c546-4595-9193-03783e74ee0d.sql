-- Add customer_type enum
CREATE TYPE customer_type AS ENUM ('individual', 'corporate');

-- Add new columns to customers table
ALTER TABLE public.customers
ADD COLUMN customer_code TEXT UNIQUE,
ADD COLUMN customer_type customer_type DEFAULT 'individual',
ADD COLUMN tin TEXT,
ADD COLUMN vrn TEXT,
ADD COLUMN incharge_1_name TEXT,
ADD COLUMN incharge_1_phone TEXT,
ADD COLUMN incharge_1_email TEXT,
ADD COLUMN incharge_2_name TEXT,
ADD COLUMN incharge_2_phone TEXT,
ADD COLUMN incharge_2_email TEXT,
ADD COLUMN incharge_3_name TEXT,
ADD COLUMN incharge_3_phone TEXT,
ADD COLUMN incharge_3_email TEXT;

-- Create a function to generate customer code
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code like CT1234
    new_code := 'CT' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE customer_code = new_code) INTO code_exists;
    
    -- If code doesn't exist, we're done
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create trigger to auto-generate customer_code on insert
CREATE OR REPLACE FUNCTION public.set_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.customer_code IS NULL THEN
    NEW.customer_code := generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_customer_code
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.set_customer_code();

-- Backfill existing customers with customer codes
UPDATE public.customers 
SET customer_code = generate_customer_code()
WHERE customer_code IS NULL;

-- Add index for customer_code lookups (for login)
CREATE INDEX idx_customers_customer_code ON public.customers(customer_code);

-- Add search index for the new fields
CREATE INDEX idx_customers_search ON public.customers USING gin(
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(email, '') || ' ' || 
    COALESCE(company_name, '') || ' ' ||
    COALESCE(customer_code, '')
  )
);