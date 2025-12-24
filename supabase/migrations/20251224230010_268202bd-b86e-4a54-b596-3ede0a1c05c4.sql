-- Create storage bucket for company branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);

-- Create policies for branding bucket
CREATE POLICY "Branding assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'branding' 
  AND public.is_admin_or_employee(auth.uid())
);

CREATE POLICY "Admins can update branding assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'branding' 
  AND public.is_admin_or_employee(auth.uid())
);

CREATE POLICY "Admins can delete branding assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'branding' 
  AND public.is_admin_or_employee(auth.uid())
);