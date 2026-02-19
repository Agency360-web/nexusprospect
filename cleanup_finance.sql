-- ============================================================
-- SCRIPT DE LIMPEZA FINANCEIRA FINAL
-- ============================================================
-- Objetivo: Remover dados do escopo "Pessoal" e garantir
-- que todas as transações restantes sejam "Profissional".
-- ============================================================

-- 1. Remover todas as transações marcadas como 'pessoal'
DELETE FROM financial_transactions 
WHERE category = 'pessoal';

-- 2. Atualizar transações antigas ou sem categoria para 'profissional'
UPDATE financial_transactions 
SET category = 'profissional';

-- OPCIONAL: Se quiser remover a coluna 'category' definitivamente
-- Apenas execute se tiver certeza absoluta que nunca mais usará 'pessoal'
-- ALTER TABLE financial_transactions DROP COLUMN category;
