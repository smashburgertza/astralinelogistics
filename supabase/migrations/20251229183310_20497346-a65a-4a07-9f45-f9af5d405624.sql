
-- Add company and contact person fields to profiles table for agents
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_address text,
ADD COLUMN IF NOT EXISTS contact_person_name text,
ADD COLUMN IF NOT EXISTS contact_person_email text,
ADD COLUMN IF NOT EXISTS contact_person_phone text;
