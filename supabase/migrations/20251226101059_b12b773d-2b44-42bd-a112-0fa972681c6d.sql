-- Add category column to order_requests table
ALTER TABLE public.order_requests 
ADD COLUMN category text DEFAULT 'products';

-- Add a comment for documentation
COMMENT ON COLUMN public.order_requests.category IS 'Product category: products, vehicles, cosmetics, electronics, spare-parts';