-- Create enum for approval types
CREATE TYPE public.approval_type AS ENUM ('parcel_release', 'expense', 'refund', 'discount');

-- Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create approval_requests table
CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_type approval_type NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  
  -- Reference to what needs approval
  reference_type TEXT NOT NULL, -- 'parcel', 'expense', 'invoice', etc.
  reference_id UUID NOT NULL,
  
  -- Request details
  reason TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  
  -- Customer/parcel info for parcel releases
  customer_id UUID REFERENCES public.customers(id),
  parcel_id UUID REFERENCES public.parcels(id),
  invoice_id UUID REFERENCES public.invoices(id),
  
  -- Who requested and who approved/rejected
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all approval requests"
ON public.approval_requests
FOR ALL
USING (is_admin_or_employee(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_approval_requests_type ON public.approval_requests(approval_type);
CREATE INDEX idx_approval_requests_reference ON public.approval_requests(reference_type, reference_id);

-- Create trigger for updated_at
CREATE TRIGGER update_approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();