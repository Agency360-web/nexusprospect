-- ============================================
-- AI Agent Settings Table
-- Stores the AI agent name + prompt per user
-- ============================================

CREATE TABLE IF NOT EXISTS ai_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One settings record per organization
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE ai_agent_settings ENABLE ROW LEVEL SECURITY;

-- Simple policy: Users can manage their own records (by user_id)
-- This avoids recursion by NOT querying the profiles table
CREATE POLICY "Users can view own ai_agent_settings"
  ON ai_agent_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ai_agent_settings"
  ON ai_agent_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ai_agent_settings"
  ON ai_agent_settings FOR UPDATE
  USING (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_agent_settings_org ON ai_agent_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_settings_user ON ai_agent_settings(user_id);
