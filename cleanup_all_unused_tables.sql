-- ============================================================
-- SCRIPT DE LIMPEZA COMPLETA - Tabelas não utilizadas
-- ============================================================
-- Gerado em: 2026-02-18
-- Baseado em análise 100% do código-fonte do projeto
-- ============================================================
-- 
-- TABELAS MANTIDAS (em uso no código):
--   ✅ clients                 (ClientManager, ClientDetail, etc.)
--   ✅ contract_templates      (ContractGeneratorModal.tsx)
--   ✅ contracts               (ContractManager.tsx)
--   ✅ credentials             (ClientCredentials.tsx)
--   ✅ departments             (OperationalProcesses.tsx)
--
-- ============================================================
-- TABELAS A REMOVER (sem nenhuma referência no código):
-- ============================================================

-- 1. Sistema de Disparos / Campanhas
DROP TABLE IF EXISTS campanhas_disparos CASCADE;
DROP TABLE IF EXISTS disparo_leads CASCADE;

-- 2. WhatsApp (Evolution API removida)
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_chats CASCADE;
DROP TABLE IF EXISTS whatsapp_connections CASCADE;
DROP TABLE IF EXISTS whatsapp_numbers CASCADE;

-- 3. Integrações removidas (OpenAI, Gemini)
DROP TABLE IF EXISTS user_api_keys CASCADE;

-- 4. Aba Geral do Cliente (removida)
DROP TABLE IF EXISTS client_notes CASCADE;
DROP TABLE IF EXISTS client_complaints CASCADE;
DROP TABLE IF EXISTS client_meetings CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- 5. Configurações de Webhook (não referenciadas)
DROP TABLE IF EXISTS webhook_configs CASCADE;

-- 5. E-mail (não referenciado)
DROP TABLE IF EXISTS email_senders CASCADE;

-- 6. Tags (não referenciada)
DROP TABLE IF EXISTS tags CASCADE;

-- 7. Métricas financeiras mensais (não referenciada)
DROP TABLE IF EXISTS financial_monthly_metrics CASCADE;

-- ============================================================
-- LIMPEZA DE PERMISSÕES (allowed_pages em profiles)
-- ============================================================

-- Remove páginas que não existem mais do array de permissões
UPDATE profiles SET allowed_pages = array_remove(allowed_pages, 'dashboard');
UPDATE profiles SET allowed_pages = array_remove(allowed_pages, 'organization');
UPDATE profiles SET allowed_pages = array_remove(allowed_pages, 'ai-agent');

-- Garante que 'clients' está nas permissões (agora é a página inicial)
UPDATE profiles
SET allowed_pages = array_append(allowed_pages, 'clients')
WHERE allowed_pages IS NOT NULL
  AND NOT ('clients' = ANY(allowed_pages));
