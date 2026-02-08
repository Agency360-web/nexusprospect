-- ============================================
-- Script: Criar tabela de credenciais/acessos
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Criar tabela de credenciais
CREATE TABLE IF NOT EXISTS credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,           -- Nome do acesso (ex: "Instagram", "Google Ads")
  username VARCHAR(255),                -- Usuário ou email
  password VARCHAR(500),                -- Senha (será armazenada encriptada)
  url VARCHAR(500),                     -- URL do serviço
  notes TEXT,                           -- Observações adicionais
  category VARCHAR(100),                -- Categoria (ex: "Redes Sociais", "Anúncios")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índice para busca rápida por cliente
CREATE INDEX IF NOT EXISTS idx_credentials_client_id ON credentials(client_id);

-- 3. Habilitar RLS
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- 4. Política para SELECT (ver credenciais dos seus clientes)
CREATE POLICY "Users can view credentials of their clients" ON credentials
FOR SELECT USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- 5. Política para INSERT
CREATE POLICY "Users can create credentials for their clients" ON credentials
FOR INSERT WITH CHECK (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- 6. Política para UPDATE
CREATE POLICY "Users can update credentials of their clients" ON credentials
FOR UPDATE USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- 7. Política para DELETE
CREATE POLICY "Users can delete credentials of their clients" ON credentials
FOR DELETE USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- 8. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_credentials_updated_at();
