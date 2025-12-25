-- Create table to track employee milestone achievements
CREATE TABLE public.employee_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  milestone_type TEXT NOT NULL,
  milestone_value TEXT NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(employee_id, milestone_type, milestone_value)
);

-- Enable RLS
ALTER TABLE public.employee_milestones ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage milestones
CREATE POLICY "Admins can manage milestones"
  ON public.employee_milestones
  FOR ALL
  USING (is_admin_or_employee(auth.uid()));

-- Policy for employees to view their own milestones
CREATE POLICY "Employees can view own milestones"
  ON public.employee_milestones
  FOR SELECT
  USING (employee_id = auth.uid());