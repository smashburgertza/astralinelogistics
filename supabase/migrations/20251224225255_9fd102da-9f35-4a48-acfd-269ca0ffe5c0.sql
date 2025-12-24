-- Create settings table for storing configuration
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
TO authenticated
USING (is_admin_or_employee(auth.uid()));

-- Anyone authenticated can view settings (needed for app config)
CREATE POLICY "Authenticated users can view settings"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.settings (key, value, category, description) VALUES
  ('company', '{"company_name": "Astraline Cargo", "email": "info@astraline.com", "phone": "", "address": "", "website": "", "tax_id": "", "currency": "USD", "timezone": "Asia/Dubai"}', 'company', 'Company profile settings'),
  ('notifications', '{"email_notifications": true, "shipment_updates": true, "invoice_reminders": true, "order_alerts": true, "weekly_reports": false, "admin_email": ""}', 'notifications', 'Email and notification preferences'),
  ('security', '{"session_timeout": "30", "password_min_length": "8", "require_uppercase": true, "require_numbers": true, "require_special_chars": false, "max_login_attempts": "5"}', 'security', 'Security and access settings'),
  ('system', '{"invoice_prefix": "INV", "estimate_prefix": "EST", "tracking_prefix": "AST", "default_due_days": "30", "auto_archive_days": "90", "date_format": "MMM d, yyyy"}', 'system', 'System preferences');