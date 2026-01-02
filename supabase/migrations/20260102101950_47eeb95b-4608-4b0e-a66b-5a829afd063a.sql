-- Add estimated_duty column to order_requests table
ALTER TABLE public.order_requests
ADD COLUMN estimated_duty numeric NOT NULL DEFAULT 0;