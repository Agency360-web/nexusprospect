-- ============================================================
-- Script de RESET TOTAL: Prospecção
-- ESTE SCRIPT APAGA AS TABELAS E AS RECRIAR DO ZERO
-- USE SOMENTE SE AS TABELAS ESTIVEREM VAZIAS OU NÃO TIVEREM DADOS REAIS
-- ============================================================

-- 1. Remover tabelas existentes (CUIDADO: isso apaga os dados destas tabelas)
DROP TABLE IF EXISTS public.leads_google_maps CASCADE;
DROP TABLE IF EXISTS public.leads_instagram CASCADE;
DROP TABLE IF EXISTS public.leads_cnpj CASCADE;

-- 2. Recriar GOOGLE MAPS com colunas corretas
CREATE TABLE public.leads_google_maps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT,
    address TEXT,
    city TEXT,
    neighborhood TEXT,
    phone TEXT,
    website TEXT,
    instagram TEXT,
    facebook TEXT,
    linkedin TEXT,
    emails TEXT[],
    rating NUMERIC,
    reviews_count INTEGER,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Recriar INSTAGRAM com colunas corretas
CREATE TABLE public.leads_instagram (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    full_name TEXT,
    biography TEXT,
    external_url TEXT,
    follower_count INTEGER,
    following_count INTEGER,
    public_email TEXT,
    public_phone_number TEXT,
    is_business_account BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Recriar CNPJ com colunas corretas
CREATE TABLE public.leads_cnpj (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cnpj TEXT,
    razao_social TEXT,
    nome_fantasia TEXT,
    telefone TEXT,
    email TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    municipio TEXT,
    uf TEXT,
    cep TEXT,
    cnae_principal TEXT,
    situacao TEXT,
    porte TEXT,
    whatsapp BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Habilitar RLS e criar políticas
ALTER TABLE public.leads_google_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_instagram ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_cnpj ENABLE ROW LEVEL SECURITY;

-- Políticas Maps
CREATE POLICY "Users view own maps leads" ON public.leads_google_maps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own maps leads" ON public.leads_google_maps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own maps leads" ON public.leads_google_maps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own maps leads" ON public.leads_google_maps FOR DELETE USING (auth.uid() = user_id);

-- Políticas Instagram
CREATE POLICY "Users view own insta leads" ON public.leads_instagram FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own insta leads" ON public.leads_instagram FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own insta leads" ON public.leads_instagram FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own insta leads" ON public.leads_instagram FOR DELETE USING (auth.uid() = user_id);

-- Políticas CNPJ
CREATE POLICY "Users view own cnpj leads" ON public.leads_cnpj FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cnpj leads" ON public.leads_cnpj FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cnpj leads" ON public.leads_cnpj FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cnpj leads" ON public.leads_cnpj FOR DELETE USING (auth.uid() = user_id);
