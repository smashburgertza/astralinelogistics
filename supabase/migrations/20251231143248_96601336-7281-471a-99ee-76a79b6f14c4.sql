-- Employee Salaries - Define salary structure per employee
CREATE TABLE public.employee_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TZS',
  pay_frequency TEXT NOT NULL DEFAULT 'monthly',
  paye_rate NUMERIC DEFAULT 0,
  nssf_employee_rate NUMERIC DEFAULT 10,
  nssf_employer_rate NUMERIC DEFAULT 10,
  health_insurance NUMERIC DEFAULT 0,
  other_allowances NUMERIC DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, effective_from)
);

-- Salary Advances - Track advances given to employees
CREATE TABLE public.salary_advances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TZS',
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  deducted_in_payroll_id UUID,
  paid_from_account_id UUID REFERENCES public.bank_accounts(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payroll Runs - Monthly payroll batches
CREATE TABLE public.payroll_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_number TEXT NOT NULL UNIQUE,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  total_gross NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  total_net NUMERIC DEFAULT 0,
  total_employer_contributions NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TZS',
  paid_from_account_id UUID REFERENCES public.bank_accounts(id),
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(period_month, period_year)
);

-- Payroll Items - Individual employee entries in a payroll run
CREATE TABLE public.payroll_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  employee_name TEXT,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  other_allowances NUMERIC DEFAULT 0,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  paye_deduction NUMERIC DEFAULT 0,
  nssf_employee_deduction NUMERIC DEFAULT 0,
  nssf_employer_contribution NUMERIC DEFAULT 0,
  health_deduction NUMERIC DEFAULT 0,
  advance_deduction NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TZS',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);

-- Add counter for payroll numbers
INSERT INTO public.document_counters (counter_key, counter_value, prefix, description)
VALUES ('payroll', 0, 'PAY', 'Payroll run number counter')
ON CONFLICT (counter_key) DO NOTHING;

-- Function to generate payroll number
CREATE OR REPLACE FUNCTION public.generate_payroll_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN get_next_sequence('payroll');
END;
$$;

-- Enable RLS
ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_salaries
CREATE POLICY "Admins can manage employee salaries"
ON public.employee_salaries
FOR ALL
USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Employees can view own salary"
ON public.employee_salaries
FOR SELECT
USING (employee_id = auth.uid());

-- RLS Policies for salary_advances
CREATE POLICY "Admins can manage salary advances"
ON public.salary_advances
FOR ALL
USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Employees can view own advances"
ON public.salary_advances
FOR SELECT
USING (employee_id = auth.uid());

-- RLS Policies for payroll_runs
CREATE POLICY "Admins can manage payroll runs"
ON public.payroll_runs
FOR ALL
USING (is_admin_or_employee(auth.uid()));

-- RLS Policies for payroll_items
CREATE POLICY "Admins can manage payroll items"
ON public.payroll_items
FOR ALL
USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Employees can view own payroll items"
ON public.payroll_items
FOR SELECT
USING (employee_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_employee_salaries_updated_at
BEFORE UPDATE ON public.employee_salaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salary_advances_updated_at
BEFORE UPDATE ON public.salary_advances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at
BEFORE UPDATE ON public.payroll_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();