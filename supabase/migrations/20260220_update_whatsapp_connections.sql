-- Migration: Criar tabela whatsapp_connections para integração Uazapi
-- Rodar no Supabase SQL Editor (Dashboard)

-- 1. Criar a tabela completa
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    instance VARCHAR(100) NOT NULL,
    instance_id TEXT,
    token TEXT,
    status VARCHAR(20) DEFAULT 'disconnected',
    phone_number TEXT,
    profile_name TEXT,
    profile_pic_url TEXT,
    qrcode TEXT,
    plan_limit INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_user_id ON public.whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instance ON public.whatsapp_connections(instance);

-- 3. Enable RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Allow full access to service role" ON public.whatsapp_connections
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own connections" ON public.whatsapp_connections
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON public.whatsapp_connections
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON public.whatsapp_connections
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON public.whatsapp_connections
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
