-- Create storage bucket for expense receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload receipts
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-receipts');

-- Policy: Authenticated users can view receipts
CREATE POLICY "Authenticated users can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'expense-receipts');

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);