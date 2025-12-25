-- Create employee badges table
CREATE TABLE public.employee_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_tier TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  time_period TEXT NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rank_achieved INTEGER NOT NULL,
  value_achieved NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(employee_id, badge_type, metric_type, time_period)
);

-- Enable RLS
ALTER TABLE public.employee_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage badges"
  ON public.employee_badges
  FOR ALL
  USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Employees can view own badges"
  ON public.employee_badges
  FOR SELECT
  USING (employee_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_employee_badges_employee ON public.employee_badges(employee_id);
CREATE INDEX idx_employee_badges_type ON public.employee_badges(badge_type, metric_type);