-- ============================================
-- Script: Integração Google Calendar
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Tabela para armazenar tokens OAuth do Google
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Tabela para vincular eventos do Calendar a clientes
CREATE TABLE IF NOT EXISTS calendar_event_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL,           -- ID do evento no Google Calendar
  event_title VARCHAR(500),                  -- Título para cache
  event_start TIMESTAMPTZ,                   -- Data início para cache
  event_end TIMESTAMPTZ,                     -- Data fim para cache
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  notes TEXT,                                -- Notas adicionais
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON user_google_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_clients_user_id ON calendar_event_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_clients_event_start ON calendar_event_clients(event_start);

-- 4. Habilitar RLS
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_clients ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para user_google_tokens
CREATE POLICY "Users can view own tokens" ON user_google_tokens
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON user_google_tokens
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON user_google_tokens
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON user_google_tokens
FOR DELETE USING (auth.uid() = user_id);

-- 6. Políticas RLS para calendar_event_clients
CREATE POLICY "Users can view own event links" ON calendar_event_clients
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own event links" ON calendar_event_clients
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event links" ON calendar_event_clients
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own event links" ON calendar_event_clients
FOR DELETE USING (auth.uid() = user_id);

-- 7. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_google_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_google_tokens_updated_at
  BEFORE UPDATE ON user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_google_tokens_updated_at();

CREATE TRIGGER trigger_calendar_events_updated_at
  BEFORE UPDATE ON calendar_event_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_google_tokens_updated_at();
