-- ============================================
-- FINAL MIGRATION: AI Agent Settings (Multi-Agent Support)
-- ============================================

-- 1. Drop old unique constraint if it exists to allow multiple agents per org/user
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_agent_settings_organization_id_key') THEN
        ALTER TABLE ai_agent_settings DROP CONSTRAINT ai_agent_settings_organization_id_key;
    END IF;
END $$;

-- 2. Define/Update Table Structure
CREATE TABLE IF NOT EXISTS ai_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Agent Identity
  agent_name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'dispatch', -- 'dispatch' or 'support'
  status TEXT NOT NULL DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  
  -- AI Configuration
  prompt TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'pt-BR',
  temperature FLOAT DEFAULT 0.7,
  provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-4o-mini',
  
  -- Initial Message Logic
  use_custom_initial_message BOOLEAN DEFAULT false,
  initial_message TEXT DEFAULT '',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Ensure RLS is enabled for strict isolation
ALTER TABLE ai_agent_settings ENABLE ROW LEVEL SECURITY;

-- 4. Re-create Isolation Policies (User-Level Isolation)
-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own ai_agent_settings" ON ai_agent_settings;
DROP POLICY IF EXISTS "Users can insert own ai_agent_settings" ON ai_agent_settings;
DROP POLICY IF EXISTS "Users can update own ai_agent_settings" ON ai_agent_settings;
DROP POLICY IF EXISTS "Users can delete own ai_agent_settings" ON ai_agent_settings;

-- Policy: Users only see their own agents
CREATE POLICY "Users can view own ai_agent_settings"
  ON ai_agent_settings FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can only create agents for themselves
CREATE POLICY "Users can insert own ai_agent_settings"
  ON ai_agent_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can only update their own agents
CREATE POLICY "Users can update own ai_agent_settings"
  ON ai_agent_settings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can only delete their own agents
CREATE POLICY "Users can delete own ai_agent_settings"
  ON ai_agent_settings FOR DELETE
  USING (user_id = auth.uid());

-- 5. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_ai_agent_settings_user ON ai_agent_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_settings_org ON ai_agent_settings(organization_id);
