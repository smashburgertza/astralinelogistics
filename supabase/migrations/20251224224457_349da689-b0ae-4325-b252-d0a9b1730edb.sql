-- Allow admins to insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_employee(auth.uid()));

-- Create function to log user_roles changes
CREATE OR REPLACE FUNCTION public.log_user_roles_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, user_id, new_data)
    VALUES ('INSERT', 'user_roles', NEW.id, auth.uid(), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, user_id, old_data, new_data)
    VALUES ('UPDATE', 'user_roles', NEW.id, auth.uid(), row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, user_id, old_data)
    VALUES ('DELETE', 'user_roles', OLD.id, auth.uid(), row_to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for user_roles changes
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_user_roles_changes();

-- Create function to log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, user_id, old_data, new_data)
    VALUES ('UPDATE', 'profiles', NEW.id, auth.uid(), row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for profile changes
CREATE TRIGGER audit_profile_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();