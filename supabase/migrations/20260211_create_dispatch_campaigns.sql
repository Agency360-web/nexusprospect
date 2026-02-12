-- ============================================
-- WhatsApp Dispatcher Module Tables
-- 2026-02-11
-- ============================================

-- 1. Campaign Dispatch Table
CREATE TABLE IF NOT EXISTS public.campanhas_disparo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_campanha VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'em_andamento', 'pausado', 'concluido', 'cancelado', 'erro')),
  total_leads INT DEFAULT 0,
  enviados_personalizados INT DEFAULT 0,
  enviados_padrao INT DEFAULT 0,
  pulados INT DEFAULT 0,
  erros INT DEFAULT 0,
  delay_min_segundos INT DEFAULT 150,
  delay_max_segundos INT DEFAULT 320,
  mensagem_padrao TEXT NOT NULL, -- Fallback message
  instancia_whatsapp VARCHAR(100), -- Evolution API instance name
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leads Dispatch Table (Individual execution log)
CREATE TABLE IF NOT EXISTS public.disparo_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID REFERENCES public.campanhas_disparo(id) ON DELETE CASCADE,
  nome_lead VARCHAR(255),
  telefone VARCHAR(50) NOT NULL,
  empresa VARCHAR(255),
  site VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'enviado_personalizado', 'enviado_padrao', 'pulado', 'erro', 'aguardando_delay')),
  motivo_fallback TEXT, -- 'sem_site', 'erro_jina', 'erro_gemini', etc.
  mensagem_gerada TEXT, -- The actual message sent (either custom or default)
  erro_detalhe TEXT, -- Error stack or message
  enviado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campanhas_usuario ON public.campanhas_disparo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON public.campanhas_disparo(status);
CREATE INDEX IF NOT EXISTS idx_disparo_leads_campanha ON public.disparo_leads(campanha_id);
CREATE INDEX IF NOT EXISTS idx_disparo_leads_status ON public.disparo_leads(status);
CREATE INDEX IF NOT EXISTS idx_disparo_leads_telefone ON public.disparo_leads(telefone); -- Useful for deduplication checks

-- 4. RLS Policies
ALTER TABLE public.campanhas_disparo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparo_leads ENABLE ROW LEVEL SECURITY;

-- Campaigns: Users manage their own campaigns
CREATE POLICY "Users can manage own campaigns" ON public.campanhas_disparo
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Leads: Users manage leads of their own campaigns
-- (Using a definition that checks the campaign's user_id)
CREATE POLICY "Users can manage own dispatch leads" ON public.disparo_leads
  USING (
    EXISTS (
      SELECT 1 FROM public.campanhas_disparo c
      WHERE c.id = disparo_leads.campanha_id
      AND c.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campanhas_disparo c
      WHERE c.id = disparo_leads.campanha_id
      AND c.usuario_id = auth.uid()
    )
  );

-- 5. Triggers for updating 'atualizado_em'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campanhas_updated_at
    BEFORE UPDATE ON public.campanhas_disparo
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
