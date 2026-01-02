-- Update the handle_new_user function to also create a customer record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Default role is customer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  -- Also create a customer record linked to this user
  INSERT INTO public.customers (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  RETURN NEW;
END;
$$;

-- Also create customer records for any existing users who don't have one
INSERT INTO public.customers (user_id, name, email)
SELECT p.id, p.full_name, p.email
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'customer'
LEFT JOIN public.customers c ON c.user_id = p.id
WHERE c.id IS NULL;