-- Create table to track teaser conversion events
CREATE TABLE public.teaser_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('view', 'signup')),
  source text NOT NULL CHECK (source IN ('shipping_calculator', 'shop_for_me')),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teaser_conversion_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (for anonymous teaser views)
CREATE POLICY "Anyone can insert conversion events"
ON public.teaser_conversion_events
FOR INSERT
WITH CHECK (true);

-- Only admins can view conversion events
CREATE POLICY "Admins can view conversion events"
ON public.teaser_conversion_events
FOR SELECT
USING (is_admin_or_employee(auth.uid()));

-- Create index for analytics queries
CREATE INDEX idx_teaser_events_source_type ON public.teaser_conversion_events(source, event_type);
CREATE INDEX idx_teaser_events_created_at ON public.teaser_conversion_events(created_at);
CREATE INDEX idx_teaser_events_session ON public.teaser_conversion_events(session_id);