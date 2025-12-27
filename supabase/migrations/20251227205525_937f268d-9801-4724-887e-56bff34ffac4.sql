-- Add is_draft column to shipments table
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- Add index for faster draft queries
CREATE INDEX IF NOT EXISTS idx_shipments_is_draft ON public.shipments(is_draft) WHERE is_draft = true;