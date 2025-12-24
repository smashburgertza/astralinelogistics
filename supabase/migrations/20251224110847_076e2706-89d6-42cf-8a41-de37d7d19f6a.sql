-- Create role enums
CREATE TYPE public.app_role AS ENUM ('super_admin', 'employee', 'agent', 'customer');
CREATE TYPE public.agent_region AS ENUM ('europe', 'dubai', 'china', 'india');
CREATE TYPE public.shipment_status AS ENUM ('collected', 'in_transit', 'arrived', 'delivered');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  region agent_region,
  employee_role TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Region pricing configuration
CREATE TABLE public.region_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region agent_region NOT NULL UNIQUE,
  customer_rate_per_kg DECIMAL(10,2) NOT NULL,
  agent_rate_per_kg DECIMAL(10,2) NOT NULL,
  handling_fee DECIMAL(10,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO public.region_pricing (region, customer_rate_per_kg, agent_rate_per_kg, handling_fee, currency) VALUES
  ('europe', 8.00, 5.00, 15.00, 'GBP'),
  ('dubai', 6.00, 4.00, 10.00, 'USD'),
  ('china', 5.50, 3.50, 10.00, 'USD'),
  ('india', 5.00, 3.00, 8.00, 'USD');

-- Agent delivery addresses
CREATE TABLE public.agent_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region agent_region NOT NULL UNIQUE,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample addresses
INSERT INTO public.agent_addresses (region, address_line1, city, postal_code, country, contact_name) VALUES
  ('europe', 'Unit 5, Logistics Park', 'London', 'E16 2QJ', 'United Kingdom', 'Europe Agent'),
  ('dubai', 'Warehouse 12, Free Zone', 'Dubai', '00000', 'UAE', 'Dubai Agent'),
  ('china', 'Building C, Export Zone', 'Guangzhou', '510000', 'China', 'China Agent'),
  ('india', 'Plot 45, Industrial Area', 'Mumbai', '400001', 'India', 'India Agent');

-- Customers table (for non-registered or business customers)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  assigned_employee_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipments table
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  agent_id UUID REFERENCES auth.users(id),
  origin_region agent_region NOT NULL,
  status shipment_status DEFAULT 'collected',
  description TEXT,
  total_weight_kg DECIMAL(10,2) NOT NULL,
  warehouse_location TEXT,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  in_transit_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parcels (individual items within shipments)
CREATE TABLE public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  barcode TEXT UNIQUE NOT NULL,
  description TEXT,
  weight_kg DECIMAL(10,2) NOT NULL,
  dimensions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimates table
CREATE TABLE public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  shipment_id UUID REFERENCES public.shipments(id),
  origin_region agent_region NOT NULL,
  weight_kg DECIMAL(10,2) NOT NULL,
  rate_per_kg DECIMAL(10,2) NOT NULL,
  handling_fee DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  estimate_id UUID REFERENCES public.estimates(id),
  customer_id UUID REFERENCES public.customers(id),
  shipment_id UUID REFERENCES public.shipments(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  stripe_payment_id TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'completed',
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  region agent_region,
  shipment_id UUID REFERENCES public.shipments(id),
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission rules table
CREATE TABLE public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_type TEXT NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commissions table
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  invoice_id UUID REFERENCES public.invoices(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact submissions (public)
CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is admin or employee
CREATE OR REPLACE FUNCTION public.is_admin_or_employee(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'employee')
  )
$$;

-- Function to get user's region
CREATE OR REPLACE FUNCTION public.get_user_region(_user_id UUID)
RETURNS agent_region
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT region FROM public.user_roles
  WHERE user_id = _user_id AND region IS NOT NULL
  LIMIT 1
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  -- Default role is customer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles: users can see their own, admins can see all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_employee(auth.uid()));

-- User roles: only admins can manage, users can view their own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Region pricing: public read, admin write
CREATE POLICY "Anyone can view pricing" ON public.region_pricing
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage pricing" ON public.region_pricing
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));

-- Agent addresses: public read, admin write
CREATE POLICY "Anyone can view addresses" ON public.agent_addresses
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage addresses" ON public.agent_addresses
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));

-- Customers: admins see all, customers see linked records
CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));
CREATE POLICY "Customers can view own record" ON public.customers
  FOR SELECT USING (user_id = auth.uid());

-- Shipments: role-based access
CREATE POLICY "Admins can manage shipments" ON public.shipments
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));
CREATE POLICY "Agents can view own region shipments" ON public.shipments
  FOR SELECT USING (
    public.has_role(auth.uid(), 'agent') AND 
    origin_region = public.get_user_region(auth.uid())
  );
CREATE POLICY "Agents can insert shipments" ON public.shipments
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'agent') AND 
    origin_region = public.get_user_region(auth.uid())
  );
CREATE POLICY "Customers can view own shipments" ON public.shipments
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Parcels: inherit from shipments
CREATE POLICY "Admins can manage parcels" ON public.parcels
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));
CREATE POLICY "View parcels through shipment access" ON public.parcels
  FOR SELECT USING (
    shipment_id IN (
      SELECT id FROM public.shipments 
      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    )
  );

-- Estimates & Invoices
CREATE POLICY "Admins can manage estimates" ON public.estimates
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));
CREATE POLICY "Customers can view own estimates" ON public.estimates
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage invoices" ON public.invoices
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));
CREATE POLICY "Customers can view own invoices" ON public.invoices
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Payments
CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));
CREATE POLICY "Customers can view own payments" ON public.payments
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM public.invoices 
      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    )
  );

-- Expenses: admins only
CREATE POLICY "Admins can manage expenses" ON public.expenses
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));

-- Commissions
CREATE POLICY "Admins can manage commission rules" ON public.commission_rules
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Employees can view own commission rules" ON public.commission_rules
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Admins can manage commissions" ON public.commissions
  FOR ALL USING (public.is_admin_or_employee(auth.uid()));
CREATE POLICY "Employees can view own commissions" ON public.commissions
  FOR SELECT USING (employee_id = auth.uid());

-- Audit logs: admin read only
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- Contact submissions: public insert, admin read
CREATE POLICY "Anyone can submit contact" ON public.contact_submissions
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins can view submissions" ON public.contact_submissions
  FOR SELECT USING (public.is_admin_or_employee(auth.uid()));

-- Generate tracking number function
CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_tracking TEXT;
BEGIN
  new_tracking := 'AST' || TO_CHAR(NOW(), 'YYMMDD') || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
  RETURN new_tracking;
END;
$$;

-- Generate invoice/estimate number function
CREATE OR REPLACE FUNCTION public.generate_document_number(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN prefix || '-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;