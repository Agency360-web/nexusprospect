-- ============================================================
-- Script corrigido: Cria tabelas de leads se não existirem
-- Dropa políticas existentes antes de recriar
-- ============================================================

-- ===================== GOOGLE MAPS =====================
CREATE TABLE IF NOT EXISTS public.leads_google_maps (
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

ALTER TABLE public.leads_google_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios leads do Google Maps" ON public.leads_google_maps;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios leads do Google Maps" ON public.leads_google_maps;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios leads do Google Maps" ON public.leads_google_maps;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios leads do Google Maps" ON public.leads_google_maps;

CREATE POLICY "Usuários podem ver seus próprios leads do Google Maps" ON public.leads_google_maps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios leads do Google Maps" ON public.leads_google_maps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios leads do Google Maps" ON public.leads_google_maps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios leads do Google Maps" ON public.leads_google_maps FOR DELETE USING (auth.uid() = user_id);


-- ===================== INSTAGRAM =====================
CREATE TABLE IF NOT EXISTS public.leads_instagram (
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

ALTER TABLE public.leads_instagram ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios leads do Instagram" ON public.leads_instagram;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios leads do Instagram" ON public.leads_instagram;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios leads do Instagram" ON public.leads_instagram;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios leads do Instagram" ON public.leads_instagram;

CREATE POLICY "Usuários podem ver seus próprios leads do Instagram" ON public.leads_instagram FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios leads do Instagram" ON public.leads_instagram FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios leads do Instagram" ON public.leads_instagram FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios leads do Instagram" ON public.leads_instagram FOR DELETE USING (auth.uid() = user_id);


-- ===================== CNPJ =====================
CREATE TABLE IF NOT EXISTS public.leads_cnpj (
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

ALTER TABLE public.leads_cnpj ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios leads de CNPJ" ON public.leads_cnpj;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios leads de CNPJ" ON public.leads_cnpj;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios leads de CNPJ" ON public.leads_cnpj;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios leads de CNPJ" ON public.leads_cnpj;

CREATE POLICY "Usuários podem ver seus próprios leads de CNPJ" ON public.leads_cnpj FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios leads de CNPJ" ON public.leads_cnpj FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios leads de CNPJ" ON public.leads_cnpj FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios leads de CNPJ" ON public.leads_cnpj FOR DELETE USING (auth.uid() = user_id);
