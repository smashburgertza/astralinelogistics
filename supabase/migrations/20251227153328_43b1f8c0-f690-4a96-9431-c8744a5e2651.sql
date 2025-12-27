-- Create agent_regions table for many-to-many relationship
CREATE TABLE public.agent_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_code TEXT NOT NULL,
  region_id UUID REFERENCES public.regions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, region_code)
);

-- Enable RLS
ALTER TABLE public.agent_regions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage agent regions" ON public.agent_regions
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agents can view their own regions" ON public.agent_regions
  FOR SELECT USING (user_id = auth.uid());

-- Function to get all regions for a user (returns first one for backward compatibility)
CREATE OR REPLACE FUNCTION public.get_user_region(_user_id uuid)
RETURNS agent_region
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT region_code::agent_region 
  FROM public.agent_regions
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to check if user has access to a specific region
CREATE OR REPLACE FUNCTION public.user_has_region(_user_id uuid, _region agent_region)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agent_regions
    WHERE user_id = _user_id AND region_code = _region::text
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND region = _region
  )
$$;

-- Migrate existing agent regions from user_roles to agent_regions
INSERT INTO public.agent_regions (user_id, region_code)
SELECT user_id, region::text
FROM public.user_roles
WHERE role = 'agent' AND region IS NOT NULL
ON CONFLICT (user_id, region_code) DO NOTHING;