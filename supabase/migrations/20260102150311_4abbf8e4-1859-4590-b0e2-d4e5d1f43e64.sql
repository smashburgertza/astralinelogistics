-- Create enum for permission actions
CREATE TYPE public.permission_action AS ENUM (
  'view',
  'create', 
  'edit',
  'delete',
  'approve',
  'export',
  'manage'
);

-- Create employee_permissions table for granular access control
CREATE TABLE public.employee_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action permission_action NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE (employee_id, module, action)
);

-- Enable RLS
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

-- Only super_admins can manage permissions
CREATE POLICY "Super admins can manage permissions"
ON public.employee_permissions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Employees can view their own permissions
CREATE POLICY "Employees can view own permissions"
ON public.employee_permissions
FOR SELECT
USING (employee_id = auth.uid());

-- Create security definer function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module TEXT, _action permission_action)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Super admins have all permissions
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.employee_permissions
      WHERE employee_id = _user_id 
        AND module = _module 
        AND action = _action
    )
  END
$$;

-- Function to get all permissions for an employee
CREATE OR REPLACE FUNCTION public.get_employee_permissions(_employee_id UUID)
RETURNS TABLE(module TEXT, action permission_action)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT module, action FROM public.employee_permissions
  WHERE employee_id = _employee_id
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_employee_permissions_updated_at
  BEFORE UPDATE ON public.employee_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();