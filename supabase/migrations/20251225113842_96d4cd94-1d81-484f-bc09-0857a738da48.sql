-- Add pickup tracking fields to parcels table
ALTER TABLE public.parcels 
ADD COLUMN picked_up_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN picked_up_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Add index for faster queries on pickup status
CREATE INDEX idx_parcels_picked_up_at ON public.parcels(picked_up_at);

-- Create a function to check if all parcels in a shipment are picked up
CREATE OR REPLACE FUNCTION public.check_shipment_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_parcels INTEGER;
  picked_up_parcels INTEGER;
BEGIN
  -- Count total and picked up parcels for this shipment
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN picked_up_at IS NOT NULL THEN 1 END)
  INTO total_parcels, picked_up_parcels
  FROM public.parcels
  WHERE shipment_id = NEW.shipment_id;
  
  -- If all parcels are picked up, update shipment to delivered
  IF total_parcels > 0 AND total_parcels = picked_up_parcels THEN
    UPDATE public.shipments
    SET status = 'delivered', delivered_at = NOW()
    WHERE id = NEW.shipment_id AND status != 'delivered';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update shipment status when parcels are picked up
CREATE TRIGGER trigger_check_shipment_delivery
AFTER UPDATE OF picked_up_at ON public.parcels
FOR EACH ROW
WHEN (NEW.picked_up_at IS NOT NULL AND OLD.picked_up_at IS NULL)
EXECUTE FUNCTION public.check_shipment_delivery();