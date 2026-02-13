-- Add provider and model columns to ai_agent_settings table
ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'openai' CHECK (provider IN ('openai', 'gemini')),
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-3.5-turbo';

-- No need to add new RLS policies as existing ones cover update/select on the table.
