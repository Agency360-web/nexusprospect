-- ============================================================
-- Migration: Sistema de Planos de Acesso
-- Planos: starter (1), pro (3), business (5), enterprise (10)
-- ============================================================

-- 1. Criar tabela de planos
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    instance_limit INTEGER NOT NULL DEFAULT 1,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inserir os planos
INSERT INTO public.subscription_plans (id, name, instance_limit, description) VALUES
    ('starter', 'Starter', 1, 'Plano inicial com 1 instância WhatsApp.'),
    ('pro', 'Pro', 3, 'Plano profissional com até 3 instâncias WhatsApp.'),
    ('business', 'Business', 5, 'Plano empresarial com até 5 instâncias WhatsApp.'),
    ('enterprise', 'Enterprise', 10, 'Plano corporativo com até 10 instâncias WhatsApp.')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    instance_limit = EXCLUDED.instance_limit,
    description = EXCLUDED.description;

-- 3. Adicionar coluna de plano ao perfil do usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'starter' REFERENCES public.subscription_plans(id);

-- 4. Atualizar o plan_limit nas conexões existentes baseado no plano do usuário
-- Por padrão todos ficam como 'starter' (1 instância)
-- Você pode alterar o plano de usuários específicos diretamente:
-- UPDATE public.profiles SET plan_id = 'pro' WHERE id = 'uuid-do-usuario';

-- 5. Habilitar RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Todos podem ler os planos
CREATE POLICY "Planos são visíveis para todos" ON public.subscription_plans
    FOR SELECT USING (true);

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
