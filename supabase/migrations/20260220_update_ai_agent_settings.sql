-- Migration: Update AI Agent Settings table with new fields
-- Adds is_active, initial_message, use_custom_initial_message, language, and temperature

ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS use_custom_initial_message BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS initial_message TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt-BR',
ADD COLUMN IF NOT EXISTS temperature NUMERIC DEFAULT 0.7;

-- Note: The table already has provider, model, agent_name, and prompt columns.
-- RLS policies already exist and cover these new columns for updating.
