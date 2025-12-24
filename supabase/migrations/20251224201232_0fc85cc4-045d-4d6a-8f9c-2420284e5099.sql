-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create order_requests table
CREATE TABLE public.order_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  total_product_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  handling_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_request_id UUID REFERENCES public.order_requests(id) ON DELETE CASCADE,
  product_url TEXT NOT NULL,
  product_name TEXT,
  product_price NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  estimated_weight_kg NUMERIC(6,2),
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Public can insert order requests (for non-logged-in customers)
CREATE POLICY "Anyone can create order requests"
ON public.order_requests
FOR INSERT
WITH CHECK (true);

-- Public can view order requests
CREATE POLICY "Anyone can view order requests"
ON public.order_requests
FOR SELECT
USING (true);

-- Admins can update order requests
CREATE POLICY "Admins can update order requests"
ON public.order_requests
FOR UPDATE
USING (public.is_admin_or_employee(auth.uid()));

-- Order items policies
CREATE POLICY "Anyone can insert order items"
ON public.order_items
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view order items"
ON public.order_items
FOR SELECT
USING (true);

CREATE POLICY "Admins can update order items"
ON public.order_items
FOR UPDATE
USING (public.is_admin_or_employee(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_order_requests_updated_at
BEFORE UPDATE ON public.order_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();