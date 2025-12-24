-- Add approval workflow columns to expenses table
ALTER TABLE public.expenses 
ADD COLUMN status text NOT NULL DEFAULT 'pending',
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN denial_reason text,
ADD COLUMN clarification_notes text,
ADD COLUMN submitted_by uuid REFERENCES auth.users(id);

-- Create index for status filtering
CREATE INDEX idx_expenses_status ON public.expenses(status);

-- Update the created_by to also set submitted_by if not set
UPDATE public.expenses SET submitted_by = created_by WHERE submitted_by IS NULL;

-- Add check constraint for valid statuses
ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_status_check 
CHECK (status IN ('pending', 'approved', 'denied', 'needs_clarification'));