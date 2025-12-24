-- Add new values to the agent_region enum
ALTER TYPE public.agent_region ADD VALUE IF NOT EXISTS 'usa';
ALTER TYPE public.agent_region ADD VALUE IF NOT EXISTS 'uk';