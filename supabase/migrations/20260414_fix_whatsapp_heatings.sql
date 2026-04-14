-- Fix: Adicionar colunas extras que o frontend precisa + garantir RLS policies
-- Executar no Supabase SQL Editor

-- 1. Adicionar colunas que o código tenta inserir mas não existem na tabela
ALTER TABLE public.whatsapp_heatings ADD COLUMN IF NOT EXISTS instance_1_number TEXT;
ALTER TABLE public.whatsapp_heatings ADD COLUMN IF NOT EXISTS instance_1_token TEXT;
ALTER TABLE public.whatsapp_heatings ADD COLUMN IF NOT EXISTS instance_1_instance_id TEXT;
ALTER TABLE public.whatsapp_heatings ADD COLUMN IF NOT EXISTS instance_2_number TEXT;
ALTER TABLE public.whatsapp_heatings ADD COLUMN IF NOT EXISTS instance_2_token TEXT;
ALTER TABLE public.whatsapp_heatings ADD COLUMN IF NOT EXISTS instance_2_instance_id TEXT;

-- 2. Garantir RLS está habilitado
ALTER TABLE public.whatsapp_heatings ENABLE ROW LEVEL SECURITY;

-- 3. Recriar as policies (DROP IF EXISTS e CREATE)
DROP POLICY IF EXISTS "Users can view own heatings" ON public.whatsapp_heatings;
DROP POLICY IF EXISTS "Users can insert own heatings" ON public.whatsapp_heatings;
DROP POLICY IF EXISTS "Users can update own heatings" ON public.whatsapp_heatings;
DROP POLICY IF EXISTS "Users can delete own heatings" ON public.whatsapp_heatings;
DROP POLICY IF EXISTS "Allow full access to service role" ON public.whatsapp_heatings;

CREATE POLICY "Allow full access to service role" ON public.whatsapp_heatings
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own heatings" ON public.whatsapp_heatings
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own heatings" ON public.whatsapp_heatings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own heatings" ON public.whatsapp_heatings
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own heatings" ON public.whatsapp_heatings
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
