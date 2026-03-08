-- ============================================================
-- Migration: Separar is_active por tipo de agente
-- Colunas: is_active_dispatch, is_active_support
-- ============================================================

-- 1. Adicionar colunas de is_active separadas
ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS is_active_dispatch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active_support BOOLEAN DEFAULT false;

-- 2. Migrar dados existentes: 
-- Copiar o valor antigo para as novas colunas
UPDATE public.ai_agent_settings 
SET is_active_dispatch = COALESCE(is_active, false),
    is_active_support = COALESCE(is_active, false);

-- NOTA: A coluna 'is_active' original não será removida imediatamente para evitar quebra em eventuais códigos em produção não atualizados simultaneamente, mas será descontinuada na UI.
