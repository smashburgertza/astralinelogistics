-- Create currency exchange rates table (rates to TZS)
CREATE TABLE public.currency_exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL UNIQUE,
  currency_name text NOT NULL,
  rate_to_tzs numeric NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.currency_exchange_rates ENABLE ROW LEVEL SECURITY;

-- Anyone can view exchange rates
CREATE POLICY "Anyone can view exchange rates"
ON public.currency_exchange_rates
FOR SELECT
USING (true);

-- Only admins can manage exchange rates
CREATE POLICY "Admins can manage exchange rates"
ON public.currency_exchange_rates
FOR ALL
USING (is_admin_or_employee(auth.uid()));

-- Insert default currencies with placeholder rates
INSERT INTO public.currency_exchange_rates (currency_code, currency_name, rate_to_tzs) VALUES
  ('USD', 'US Dollar', 2500),
  ('EUR', 'Euro', 2700),
  ('GBP', 'British Pound', 3200),
  ('AED', 'UAE Dirham', 680),
  ('CNY', 'Chinese Yuan', 350),
  ('INR', 'Indian Rupee', 30),
  ('TZS', 'Tanzanian Shilling', 1);

-- Add payment_currency column to invoices (the currency customer chooses to pay in)
ALTER TABLE public.invoices
ADD COLUMN payment_currency text DEFAULT NULL,
ADD COLUMN amount_in_tzs numeric DEFAULT NULL;