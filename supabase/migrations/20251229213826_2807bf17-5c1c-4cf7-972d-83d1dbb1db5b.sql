-- Add base currency column to agent_settings
ALTER TABLE public.agent_settings 
ADD COLUMN base_currency text NOT NULL DEFAULT 'USD';