-- Create enum for shipment owner type
CREATE TYPE public.shipment_owner_type AS ENUM ('astraline', 'agent');

-- Create enum for transit points
CREATE TYPE public.transit_point_type AS ENUM ('direct', 'nairobi', 'zanzibar');

-- Create enum for invoice direction
CREATE TYPE public.invoice_direction_type AS ENUM ('to_agent', 'from_agent');

-- Add shipment_owner and transit_point to shipments table
ALTER TABLE public.shipments 
ADD COLUMN shipment_owner public.shipment_owner_type DEFAULT 'astraline',
ADD COLUMN transit_point public.transit_point_type DEFAULT 'direct';

-- Add invoice_direction to invoices table
ALTER TABLE public.invoices 
ADD COLUMN invoice_direction public.invoice_direction_type DEFAULT 'from_agent',
ADD COLUMN agent_id uuid REFERENCES auth.users(id);

-- Create transit_routes table for admin-configurable routing options per region
CREATE TABLE public.transit_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES public.regions(id) ON DELETE CASCADE NOT NULL,
  transit_point public.transit_point_type NOT NULL,
  is_active boolean DEFAULT true,
  additional_cost numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  estimated_days integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(region_id, transit_point)
);

-- Enable RLS on transit_routes
ALTER TABLE public.transit_routes ENABLE ROW LEVEL SECURITY;

-- RLS policies for transit_routes
CREATE POLICY "Admins can manage transit routes"
ON public.transit_routes
FOR ALL
USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Agents can view active transit routes"
ON public.transit_routes
FOR SELECT
USING (is_active = true);

-- Create agent_balance_summary view for running balance
CREATE OR REPLACE VIEW public.agent_balance_summary AS
SELECT 
  i.agent_id,
  p.full_name as agent_name,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'to_agent' AND i.status = 'paid' THEN i.amount ELSE 0 END), 0) as paid_to_agent,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'to_agent' AND i.status = 'pending' THEN i.amount ELSE 0 END), 0) as pending_to_agent,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'from_agent' AND i.status = 'paid' THEN i.amount ELSE 0 END), 0) as paid_from_agent,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'from_agent' AND i.status = 'pending' THEN i.amount ELSE 0 END), 0) as pending_from_agent,
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'from_agent' THEN i.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN i.invoice_direction = 'to_agent' THEN i.amount ELSE 0 END), 0) as net_balance
FROM public.invoices i
LEFT JOIN public.profiles p ON i.agent_id = p.id
WHERE i.agent_id IS NOT NULL
GROUP BY i.agent_id, p.full_name;

-- Add trigger for updated_at on transit_routes
CREATE TRIGGER update_transit_routes_updated_at
BEFORE UPDATE ON public.transit_routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();