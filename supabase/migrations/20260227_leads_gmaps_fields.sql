-- =====================================================
-- Migração: Novos campos para leads do Google Maps
-- =====================================================

-- 1. Adicionar user_id para vincular leads ao usuário
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Campos do Google Maps
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS rating TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reviews TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS specialties TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS search_term TEXT;

-- 3. Índice para busca por user_id
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);

-- 4. Atualizar RLS: cada usuário vê apenas seus próprios leads
-- Remover policy antiga que permite tudo
DROP POLICY IF EXISTS "Enable all for authenticated users on leads if not exists" ON public.leads;

-- Nova policy: usuário vê leads vinculados a ele OU leads de clientes que ele tem acesso
CREATE POLICY "Users can view their own leads"
    ON public.leads FOR SELECT
    USING (
        user_id = auth.uid()
        OR client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own leads"
    ON public.leads FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own leads"
    ON public.leads FOR UPDATE
    USING (
        user_id = auth.uid()
        OR client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own leads"
    ON public.leads FOR DELETE
    USING (
        user_id = auth.uid()
        OR client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
    );
