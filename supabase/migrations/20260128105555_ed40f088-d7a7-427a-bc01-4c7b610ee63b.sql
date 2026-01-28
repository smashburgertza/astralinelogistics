-- Create expense_categories table with hierarchical support
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster parent lookups
CREATE INDEX idx_expense_categories_parent ON public.expense_categories(parent_id);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read categories
CREATE POLICY "Allow authenticated read" ON public.expense_categories
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to manage categories (for now, can restrict to admins later)
CREATE POLICY "Allow authenticated insert" ON public.expense_categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON public.expense_categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete" ON public.expense_categories
  FOR DELETE TO authenticated USING (true);

-- Seed existing categories to maintain backward compatibility
INSERT INTO public.expense_categories (name, slug, sort_order) VALUES
  ('Shipping Cost', 'shipping', 1),
  ('Handling Fee', 'handling', 2),
  ('Customs & Duties', 'customs', 3),
  ('Insurance', 'insurance', 4),
  ('Packaging', 'packaging', 5),
  ('Storage', 'storage', 6),
  ('Fuel Surcharge', 'fuel', 7),
  ('Utilities', 'utilities', 8),
  ('Rent', 'rent', 9),
  ('Salaries & Wages', 'salaries', 10),
  ('Office Supplies', 'office_supplies', 11),
  ('Marketing', 'marketing', 12),
  ('Professional Services', 'professional_services', 13),
  ('Maintenance', 'maintenance', 14),
  ('Travel', 'travel', 15),
  ('Other', 'other', 16);