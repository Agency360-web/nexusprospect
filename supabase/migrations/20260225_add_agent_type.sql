-- ============================================================
-- Migration: Adicionar agent_type à tabela ai_agent_settings
-- Permite 3 tipos de agente por organização: dispatch, support, followup
-- ============================================================

-- 1. Adicionar coluna agent_type
ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'dispatch';

-- 2. Adicionar CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'ai_agent_settings_agent_type_check'
  ) THEN
    ALTER TABLE public.ai_agent_settings 
    ADD CONSTRAINT ai_agent_settings_agent_type_check 
    CHECK (agent_type IN ('dispatch', 'support', 'followup'));
  END IF;
END $$;

-- 3. Atualizar registros existentes para tipo 'dispatch'
UPDATE public.ai_agent_settings 
SET agent_type = 'dispatch' 
WHERE agent_type IS NULL;

-- 4. Remover constraint UNIQUE antiga (organization_id) e criar nova
ALTER TABLE public.ai_agent_settings 
DROP CONSTRAINT IF EXISTS ai_agent_settings_organization_id_key;

-- 5. Criar nova constraint UNIQUE permitindo 1 registro por tipo por organização
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_agent_settings_org_type_unique'
  ) THEN
    ALTER TABLE public.ai_agent_settings 
    ADD CONSTRAINT ai_agent_settings_org_type_unique 
    UNIQUE (organization_id, agent_type);
  END IF;
END $$;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
