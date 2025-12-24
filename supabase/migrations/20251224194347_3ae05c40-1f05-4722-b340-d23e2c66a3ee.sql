-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to generate notification on shipment status change
CREATE OR REPLACE FUNCTION public.notify_shipment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_user_id UUID;
  status_title TEXT;
  status_message TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the user_id from the customer
    SELECT user_id INTO customer_user_id
    FROM public.customers
    WHERE id = NEW.customer_id;
    
    -- Only create notification if customer has a user_id
    IF customer_user_id IS NOT NULL THEN
      -- Set title and message based on new status
      CASE NEW.status
        WHEN 'collected' THEN
          status_title := 'Shipment Collected';
          status_message := 'Your shipment ' || NEW.tracking_number || ' has been collected and is being prepared for transit.';
        WHEN 'in_transit' THEN
          status_title := 'Shipment In Transit';
          status_message := 'Your shipment ' || NEW.tracking_number || ' is now in transit to the destination.';
        WHEN 'arrived' THEN
          status_title := 'Shipment Arrived';
          status_message := 'Your shipment ' || NEW.tracking_number || ' has arrived at the destination warehouse.';
        WHEN 'delivered' THEN
          status_title := 'Shipment Delivered';
          status_message := 'Your shipment ' || NEW.tracking_number || ' has been delivered successfully!';
        ELSE
          status_title := 'Shipment Status Updated';
          status_message := 'Your shipment ' || NEW.tracking_number || ' status has been updated to ' || NEW.status || '.';
      END CASE;
      
      -- Insert notification
      INSERT INTO public.notifications (user_id, title, message, type, shipment_id)
      VALUES (customer_user_id, status_title, status_message, 'shipment', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for shipment status changes
CREATE TRIGGER on_shipment_status_change
AFTER UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.notify_shipment_status_change();