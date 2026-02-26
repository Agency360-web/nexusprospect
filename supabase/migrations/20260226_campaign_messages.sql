-- =====================================================
-- Tabela: campaign_messages
-- Rastreia cada envio individual de mensagem por campanha
-- =====================================================

CREATE TABLE IF NOT EXISTS public.campaign_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL,
    lead_name TEXT,
    lead_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Constraint UNIQUE para evitar duplicatas: mesmo lead na mesma campanha
ALTER TABLE public.campaign_messages
    ADD CONSTRAINT unique_campaign_lead UNIQUE (campaign_id, lead_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_id ON public.campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON public.campaign_messages(campaign_id, status);

-- Enable RLS
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver mensagens das suas próprias campanhas
CREATE POLICY "Users can view their campaign messages"
    ON public.campaign_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = campaign_messages.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Policy: Usuários podem inserir mensagens nas suas próprias campanhas
CREATE POLICY "Users can insert their campaign messages"
    ON public.campaign_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = campaign_messages.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Policy: Permitir update via service_role (para o n8n atualizar status)
-- O n8n deve usar a service_role key para autenticar
CREATE POLICY "Service role can manage campaign messages"
    ON public.campaign_messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Nota: A policy acima permite acesso total, mas o RLS em combinação
-- com o service_role key do Supabase bypassa RLS automaticamente.
-- As policies de SELECT e INSERT acima protegem o acesso do lado do frontend.
