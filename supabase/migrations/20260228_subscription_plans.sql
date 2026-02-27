-- =========================================================================
-- Migração: Planos de Assinatura e Limites (Starter, Pro, Business, Ent)
-- =========================================================================

-- 1. Cria a tabela de planos
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    instance_limit INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insere os planos padrão de acordo com a especificação
INSERT INTO public.subscription_plans (id, name, instance_limit) VALUES
    ('starter', 'Starter', 1),
    ('pro', 'Pro', 3),
    ('business', 'Business', 5),
    ('enterprise', 'Enterprise', 10)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    instance_limit = EXCLUDED.instance_limit;

-- 3. Adiciona a coluna plan_id na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES public.subscription_plans(id) DEFAULT 'starter';

-- 4. Garante que profiles antigos sem plano agora são starter
UPDATE public.profiles SET plan_id = 'starter' WHERE plan_id IS NULL;

-- 5. Atualiza o trigger ou insere o plano nos novos profiles
-- Se o trigger on_auth_user_created lidar com inserts em profiles sem plan_id,
-- o valor DEFAULT 'starter' cuidará disso na criação automática de perfis.
