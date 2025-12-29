-- Add assigned_to column to track who the expense is assigned for approval
ALTER TABLE public.expenses ADD COLUMN assigned_to uuid;

-- Add comment for documentation
COMMENT ON COLUMN public.expenses.assigned_to IS 'The user ID of the employee assigned to approve this expense';