-- Create agent_settings table to store agent-specific configuration
CREATE TABLE public.agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  can_have_consolidated_cargo boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage all agent settings
CREATE POLICY "Admins can manage agent settings"
ON public.agent_settings
FOR ALL
USING (is_admin_or_employee(auth.uid()));

-- Agents can view their own settings
CREATE POLICY "Agents can view own settings"
ON public.agent_settings
FOR SELECT
USING (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE public.agent_settings IS 'Agent-specific configuration settings';
COMMENT ON COLUMN public.agent_settings.can_have_consolidated_cargo IS 'Whether this agent can log consolidated cargo that is not tracked individually';