-- Migration: Add company and company_site columns to leads table
-- Run this in the Supabase Dashboard SQL Editor

-- 1. Add columns if they don't exist
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS company_site TEXT;

-- 2. Backfill data from custom_fields
-- This updates existing rows where company is null but custom_fields has 'empresa'
UPDATE leads
SET 
  company = (custom_fields->>'empresa'),
  company_site = (custom_fields->>'site')
WHERE 
  company IS NULL 
  AND custom_fields IS NOT NULL
  AND (custom_fields->>'empresa' IS NOT NULL OR custom_fields->>'site' IS NOT NULL);

-- 3. Verify
SELECT count(*) as migrated_count FROM leads WHERE company IS NOT NULL;
-- Migration V2: Add company and company_site columns to leads table (ROBUST VERSION)
-- Run this in the Supabase Dashboard SQL Editor

-- 1. Add columns if they don't exist
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS company_site TEXT;

-- 2. Diagnostic (Optional - Run this first to see what your data looks like if you are unsure)
-- SELECT id, custom_fields FROM leads WHERE custom_fields IS NOT NULL AND custom_fields::text != '{}' LIMIT 10;

-- 3. Backfill data from custom_fields with Multiple Key Variations
-- This tries to find 'empresa', 'Empresa', 'company', 'Company' for the company name
-- And 'site', 'Site', 'website', 'Website', 'url' for the site URL
UPDATE leads
SET 
  company = COALESCE(
    custom_fields->>'empresa', 
    custom_fields->>'Empresa', 
    custom_fields->>'company', 
    custom_fields->>'Company',
    custom_fields->>'nome_empresa'
  ),
  company_site = COALESCE(
    custom_fields->>'site', 
    custom_fields->>'Site', 
    custom_fields->>'website', 
    custom_fields->>'Website',
    custom_fields->>'url',
    custom_fields->>'Url'
  )
WHERE 
  company IS NULL 
  AND custom_fields IS NOT NULL
  AND (
      custom_fields->>'empresa' IS NOT NULL OR 
      custom_fields->>'Empresa' IS NOT NULL OR 
      custom_fields->>'company' IS NOT NULL OR 
      custom_fields->>'Company' IS NOT NULL OR
      custom_fields->>'nome_empresa' IS NOT NULL OR
      
      custom_fields->>'site' IS NOT NULL OR
      custom_fields->>'Site' IS NOT NULL OR
      custom_fields->>'website' IS NOT NULL OR
      custom_fields->>'Website' IS NOT NULL OR
      custom_fields->>'url' IS NOT NULL
  );

-- 4. Verify
SELECT count(*) as migrated_count FROM leads WHERE company IS NOT NULL;
-- Final setup for scheduling dispatches via pg_cron

-- 1. Enable pg_cron if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Setup the cron job to call the Edge Function every minute
-- Note: Replace <project-ref> with the actual Supabase project reference if needed, 
-- but usually internal calls can use localhost or the service name.
-- Using net.http_post (requires pg_net extension) is the cleanest way.

CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
    'dispatch-campaigns-every-minute', -- name of the job
    '* * * * *',                       -- every minute
    $$
    SELECT net.http_post(
        url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/process-scheduled-campaigns',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Note: In a real Supabase environment, you might need to use the full project URL 
-- and ensure the service_role_key is accessible. 
-- Alternatively, many users use a simple Edge Function trigger or an external cron like n8n.
-- Add is_synced column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS is_synced boolean DEFAULT false;

-- Optional: Initialize is_synced as true for leads created before today 
-- to avoid syncing thousands of old records at once if user prefers.
-- For now, we default to false as per plan.
-- Migration: Create RPC function for bulk lead deletion
-- Path: /Users/conectamarketing/Documents/nexusprospect/supabase/migrations/20260127_delete_leads_rpc.sql

CREATE OR REPLACE FUNCTION delete_leads_in_bulk(lead_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with high privileges to bypass RLS overhead, but we check ownership manually
AS $$
BEGIN
  -- Security check: Ensure the user owns the clients of THESE leads
  -- This is a condensed version of the RLS policy but more efficient for mass deletion
  DELETE FROM public.leads
  WHERE id = ANY(lead_ids)
  AND client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  );
END;
$$;
-- Migration to add WhatsApp configuration to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_instance_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_token TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_notes TEXT;

-- Update the comments for clarity if needed
COMMENT ON COLUMN clients.whatsapp_instance_url IS 'UAZAPI or Evolution API Instance URL for this client';
COMMENT ON COLUMN clients.whatsapp_token IS 'Authentication token for the WhatsApp instance';
COMMENT ON COLUMN clients.whatsapp_notes IS 'Internal notes for WhatsApp conversations/deals';
-- Migration to create WhatsApp chat persistence tables
-- 1. Create Chats Table
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    id TEXT PRIMARY KEY, -- JID or Unique ID from WhatsApp
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    last_message TEXT,
    avatar_url TEXT,
    unread_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY, -- Message Key/ID from WhatsApp
    chat_id TEXT REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    text TEXT,
    type TEXT DEFAULT 'text', -- text, image, video, audio, document
    from_me BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'sent', -- sent, delivered, read
    media_url TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- 4. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_client_id ON whatsapp_chats(client_id);
-- Add contract fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS contract_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contract_value DECIMAL(10, 2);

-- Create client_meetings table
CREATE TABLE IF NOT EXISTS client_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  link TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_notes table
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_complaints table
CREATE TABLE IF NOT EXISTS client_complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, resolved
  severity TEXT DEFAULT 'medium', -- low, medium, high
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies (assuming RLS is enabled, copying patterns from other tables if known, otherwise basic authenticated access)
ALTER TABLE client_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON client_meetings 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON client_meetings 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON client_meetings 
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON client_meetings 
FOR DELETE USING (auth.role() = 'authenticated');

-- Repeat for notes
CREATE POLICY "Enable read access for authenticated users" ON client_notes
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON client_notes
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON client_notes
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON client_notes
FOR DELETE USING (auth.role() = 'authenticated');

-- Repeat for complaints
CREATE POLICY "Enable read access for authenticated users" ON client_complaints
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON client_complaints
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON client_complaints
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON client_complaints
FOR DELETE USING (auth.role() = 'authenticated');
-- Create table for storing User API Keys (OpenAI, Gemini, etc.)
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini')),
    api_key TEXT NOT NULL, -- In a real prod env, this should be encrypted. For this MVP, we store as text.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one key per provider per user
    UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own keys"
    ON public.user_api_keys
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys(user_id);
-- Add provider and model columns to ai_agent_settings table
ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'openai' CHECK (provider IN ('openai', 'gemini')),
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-3.5-turbo';

-- No need to add new RLS policies as existing ones cover update/select on the table.
-- Add company and company_site to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_site text;
create table if not exists lead_folders (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table leads add column if not exists folder_id uuid references lead_folders(id) on delete set null;

create index if not exists idx_lead_folders_client_id on lead_folders(client_id);
create index if not exists idx_leads_folder_id on leads(folder_id);
-- Migration: Allow multiple WhatsApp connections per user
-- Removes the unique constraint on user_id
-- Adds a check constraint to limit connections (optional, enforced in app logic)

DO $$ 
BEGIN
    -- Remove the unique constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_user_connection' 
        AND conrelid = 'public.whatsapp_connections'::regclass
    ) THEN
        ALTER TABLE public.whatsapp_connections 
        DROP CONSTRAINT unique_user_connection;
    END IF;

    -- Add a unique constraint on instance name to prevent duplicates
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_instance_name' 
        AND conrelid = 'public.whatsapp_connections'::regclass
    ) THEN
        ALTER TABLE public.whatsapp_connections 
        ADD CONSTRAINT unique_instance_name UNIQUE (instance);
    END IF;

END $$;
-- Migration: Update AI Agent Settings table with new fields
-- Adds is_active, initial_message, use_custom_initial_message, language, and temperature

ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS use_custom_initial_message BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS initial_message TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt-BR',
ADD COLUMN IF NOT EXISTS temperature NUMERIC DEFAULT 0.7;

-- Note: The table already has provider, model, agent_name, and prompt columns.
-- RLS policies already exist and cover these new columns for updating.
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
-- Create the campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    configuration JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns
CREATE POLICY "Users can view their own campaigns"
    ON public.campaigns
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
    ON public.campaigns
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
    ON public.campaigns
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
    ON public.campaigns
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
-- 1. Create the lead_folders table
CREATE TABLE IF NOT EXISTS public.lead_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add full text search on folder name (optional, good for indexing)
CREATE INDEX IF NOT EXISTS idx_lead_folders_client_id ON public.lead_folders(client_id);

-- 3. Create the 'leads' table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    company_site TEXT,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.lead_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance on leads table
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON public.leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_folder_id ON public.leads(folder_id);

-- 5. Enable Row Level Security (RLS) on lead_folders
ALTER TABLE public.lead_folders ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for lead_folders (Allow all authenticated users for now)
CREATE POLICY "Enable all for authenticated users" ON public.lead_folders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS Policies for leads table are also broad enough
CREATE POLICY "Enable all for authenticated users on leads if not exists" ON public.leads
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- Rename company_site column to website in leads table
ALTER TABLE public.leads RENAME COLUMN company_site TO website;

-- Add new columns for AI messaging
ALTER TABLE public.leads 
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS rating NUMERIC,
    ADD COLUMN IF NOT EXISTS reviews INTEGER,
    ADD COLUMN IF NOT EXISTS specialties TEXT;

-- You may want to add an index if you plan to search or filter by these fields frequently
-- CREATE INDEX IF NOT EXISTS idx_leads_rating ON public.leads(rating);
-- Add user_id column to lead_folders
ALTER TABLE public.lead_folders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create an index to speed up queries by user_id
CREATE INDEX IF NOT EXISTS idx_lead_folders_user_id ON public.lead_folders(user_id);
-- ============================================================
-- Migration: Adicionar agent_type à tabela ai_agent_settings
-- Permite 3 tipos de agente por organização: dispatch, support, followup
-- ============================================================

-- 1. Adicionar coluna agent_type
ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'dispatch';

-- 2. Adicionar CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'ai_agent_settings_agent_type_check'
  ) THEN
    ALTER TABLE public.ai_agent_settings 
    ADD CONSTRAINT ai_agent_settings_agent_type_check 
    CHECK (agent_type IN ('dispatch', 'support', 'followup'));
  END IF;
END $$;

-- 3. Atualizar registros existentes para tipo 'dispatch'
UPDATE public.ai_agent_settings 
SET agent_type = 'dispatch' 
WHERE agent_type IS NULL;

-- 4. Remover constraint UNIQUE antiga (organization_id) e criar nova
ALTER TABLE public.ai_agent_settings 
DROP CONSTRAINT IF EXISTS ai_agent_settings_organization_id_key;

-- 5. Criar nova constraint UNIQUE permitindo 1 registro por tipo por organização
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_agent_settings_org_type_unique'
  ) THEN
    ALTER TABLE public.ai_agent_settings 
    ADD CONSTRAINT ai_agent_settings_org_type_unique 
    UNIQUE (organization_id, agent_type);
  END IF;
END $$;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
-- =====================================================
-- FIX: Corrigir erro "Database error saving new user"
-- Problema: Dois triggers separados (on_auth_user_created e 
-- on_auth_user_created_organization) causavam conflito na ordem
-- de execução, onde o trigger de organization tentava atualizar
-- um profile que podia não existir ainda.
-- Solução: Combinar ambos em um único trigger atômico.
-- =====================================================

-- 1. Remover triggers antigos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_organization ON auth.users;

-- 2. Criar função unificada que faz tudo em uma transação
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Passo 1: Criar o profile do usuário
  INSERT INTO public.profiles (id, email, full_name, role, allowed_pages)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'user'),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'role')::text = 'admin' 
        THEN ARRAY['dashboard', 'admin', 'clients', 'reports', 'transmission', 'settings']
      ELSE ARRAY['dashboard', 'reports']
    END
  );

  -- Passo 2: Criar a organização para o novo usuário
  INSERT INTO public.organizations (name, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha Empresa'),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- Passo 3: Atualizar o profile com o organization_id e role admin
  UPDATE public.profiles 
  SET organization_id = new_org_id, role = 'admin'
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar trigger único
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FIM DO FIX
-- =====================================================
-- ============================================================
-- Migration: Separar prompts por tipo de agente em colunas
-- Colunas: prompt_dispatch, prompt_support, prompt_followup
-- ============================================================

-- 1. Adicionar colunas de prompt separadas
ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS prompt_dispatch TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS prompt_support TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS prompt_followup TEXT DEFAULT '';

-- 2. Migrar dados existentes: 
-- Copiar o prompt antigo para a coluna correspondente ao agent_type
UPDATE public.ai_agent_settings 
SET prompt_dispatch = COALESCE(prompt, '')
WHERE agent_type = 'dispatch' OR agent_type IS NULL;

UPDATE public.ai_agent_settings 
SET prompt_support = COALESCE(prompt, '')
WHERE agent_type = 'support';

UPDATE public.ai_agent_settings 
SET prompt_followup = COALESCE(prompt, '')
WHERE agent_type = 'followup';

-- 3. Para registros duplicados (múltiplas linhas por org com agent_types diferentes),
-- consolidar em uma única linha por organização
-- Primeiro, vamos unir os prompts dos diferentes agent_types na linha principal (dispatch)
DO $$
DECLARE
    org RECORD;
    dispatch_prompt TEXT;
    support_prompt TEXT;
    followup_prompt TEXT;
    main_id UUID;
BEGIN
    FOR org IN 
        SELECT organization_id 
        FROM public.ai_agent_settings 
        GROUP BY organization_id 
        HAVING COUNT(*) > 1
    LOOP
        -- Pegar prompts de cada tipo
        SELECT COALESCE(prompt, '') INTO dispatch_prompt 
        FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id AND agent_type = 'dispatch' 
        LIMIT 1;
        
        SELECT COALESCE(prompt, '') INTO support_prompt 
        FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id AND agent_type = 'support' 
        LIMIT 1;
        
        SELECT COALESCE(prompt, '') INTO followup_prompt 
        FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id AND agent_type = 'followup' 
        LIMIT 1;

        -- Pegar o ID da linha principal (dispatch ou a primeira)
        SELECT id INTO main_id 
        FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id 
        ORDER BY CASE WHEN agent_type = 'dispatch' THEN 0 ELSE 1 END 
        LIMIT 1;

        -- Atualizar a linha principal com todos os prompts
        UPDATE public.ai_agent_settings 
        SET prompt_dispatch = COALESCE(dispatch_prompt, ''),
            prompt_support = COALESCE(support_prompt, ''),
            prompt_followup = COALESCE(followup_prompt, ''),
            agent_type = 'dispatch'
        WHERE id = main_id;

        -- Deletar as linhas duplicadas
        DELETE FROM public.ai_agent_settings 
        WHERE organization_id = org.organization_id AND id != main_id;
    END LOOP;
END $$;

-- 4. Restaurar constraint UNIQUE por organization_id (1 linha por org)
ALTER TABLE public.ai_agent_settings 
DROP CONSTRAINT IF EXISTS ai_agent_settings_org_type_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_agent_settings_organization_id_key'
  ) THEN
    ALTER TABLE public.ai_agent_settings 
    ADD CONSTRAINT ai_agent_settings_organization_id_key 
    UNIQUE (organization_id);
  END IF;
END $$;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
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
-- Table to store extracted WhatsApp contacts
CREATE TABLE IF NOT EXISTS extracted_contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    connection_id integer REFERENCES whatsapp_connections(id) ON DELETE CASCADE NOT NULL,
    contact_name text DEFAULT '',
    phone text NOT NULL,
    push_name text DEFAULT '',
    extracted_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast queries per user+connection
CREATE INDEX idx_extracted_contacts_user_conn ON extracted_contacts(user_id, connection_id);

-- Enable RLS
ALTER TABLE extracted_contacts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own extracted contacts
CREATE POLICY "Users can view own extracted contacts"
    ON extracted_contacts FOR SELECT
    USING (auth.uid() = user_id);

-- Users can delete their own extracted contacts
CREATE POLICY "Users can delete own extracted contacts"
    ON extracted_contacts FOR DELETE
    USING (auth.uid() = user_id);

-- Allow inserts (from N8N via service role or authenticated user)
CREATE POLICY "Allow insert extracted contacts"
    ON extracted_contacts FOR INSERT
    WITH CHECK (true);
-- ============================================================
-- Migration: Separar is_active por tipo de agente
-- Colunas: is_active_dispatch, is_active_support
-- ============================================================

-- 1. Adicionar colunas de is_active separadas
ALTER TABLE public.ai_agent_settings 
ADD COLUMN IF NOT EXISTS is_active_dispatch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active_support BOOLEAN DEFAULT false;

-- 2. Migrar dados existentes: 
-- Copiar o valor antigo para as novas colunas
UPDATE public.ai_agent_settings 
SET is_active_dispatch = COALESCE(is_active, false),
    is_active_support = COALESCE(is_active, false);

-- NOTA: A coluna 'is_active' original não será removida imediatamente para evitar quebra em eventuais códigos em produção não atualizados simultaneamente, mas será descontinuada na UI.
-- ============================================================
-- Migration: Adicionar coluna webhook_key na tabela profiles
-- Cada usuário terá uma chave webhook única (NEXUS-XXXXXXXXX)
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS webhook_key TEXT UNIQUE DEFAULT NULL;

-- Criar índice para busca rápida por webhook_key
CREATE INDEX IF NOT EXISTS idx_profiles_webhook_key ON public.profiles (webhook_key)
WHERE webhook_key IS NOT NULL;
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
-- ==========================================
-- BLOCO 1: GOOGLE MAPS
-- ==========================================
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

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Usuários podem ver seus próprios leads do Google Maps" ON public.leads_google_maps;
    DROP POLICY IF EXISTS "Usuários podem inserir seus próprios leads do Google Maps" ON public.leads_google_maps;
    DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios leads do Google Maps" ON public.leads_google_maps;
    DROP POLICY IF EXISTS "Usuários podem deletar seus próprios leads do Google Maps" ON public.leads_google_maps;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Usuários podem ver seus próprios leads do Google Maps" ON public.leads_google_maps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios leads do Google Maps" ON public.leads_google_maps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios leads do Google Maps" ON public.leads_google_maps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios leads do Google Maps" ON public.leads_google_maps FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- BLOCO 2: INSTAGRAM
-- ==========================================
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

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Usuários podem ver seus próprios leads do Instagram" ON public.leads_instagram;
    DROP POLICY IF EXISTS "Usuários podem inserir seus próprios leads do Instagram" ON public.leads_instagram;
    DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios leads do Instagram" ON public.leads_instagram;
    DROP POLICY IF EXISTS "Usuários podem deletar seus próprios leads do Instagram" ON public.leads_instagram;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Usuários podem ver seus próprios leads do Instagram" ON public.leads_instagram FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios leads do Instagram" ON public.leads_instagram FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios leads do Instagram" ON public.leads_instagram FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios leads do Instagram" ON public.leads_instagram FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- BLOCO 3: CNPJ
-- ==========================================
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

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Usuários podem ver seus próprios leads de CNPJ" ON public.leads_cnpj;
    DROP POLICY IF EXISTS "Usuários podem inserir seus próprios leads de CNPJ" ON public.leads_cnpj;
    DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios leads de CNPJ" ON public.leads_cnpj;
    DROP POLICY IF EXISTS "Usuários podem deletar seus próprios leads de CNPJ" ON public.leads_cnpj;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Usuários podem ver seus próprios leads de CNPJ" ON public.leads_cnpj FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios leads de CNPJ" ON public.leads_cnpj FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios leads de CNPJ" ON public.leads_cnpj FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios leads de CNPJ" ON public.leads_cnpj FOR DELETE USING (auth.uid() = user_id);
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
-- Tabela para armazenar configurações de aquecimento de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_heatings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    instance_1_id TEXT NOT NULL,
    instance_1_name TEXT,
    instance_2_id TEXT NOT NULL,
    instance_2_name TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE whatsapp_heatings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own heatings"
    ON whatsapp_heatings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own heatings"
    ON whatsapp_heatings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own heatings"
    ON whatsapp_heatings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own heatings"
    ON whatsapp_heatings FOR DELETE
    USING (auth.uid() = user_id);
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
-- ============================================
-- Script: Criar tabela de credenciais/acessos
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Criar tabela de credenciais
CREATE TABLE IF NOT EXISTS credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,           -- Nome do acesso (ex: "Instagram", "Google Ads")
  username VARCHAR(255),                -- Usuário ou email
  password VARCHAR(500),                -- Senha (será armazenada encriptada)
  url VARCHAR(500),                     -- URL do serviço
  notes TEXT,                           -- Observações adicionais
  category VARCHAR(100),                -- Categoria (ex: "Redes Sociais", "Anúncios")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índice para busca rápida por cliente
CREATE INDEX IF NOT EXISTS idx_credentials_client_id ON credentials(client_id);

-- 3. Habilitar RLS
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- 4. Política para SELECT (ver credenciais dos seus clientes)
CREATE POLICY "Users can view credentials of their clients" ON credentials
FOR SELECT USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- 5. Política para INSERT
CREATE POLICY "Users can create credentials for their clients" ON credentials
FOR INSERT WITH CHECK (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- 6. Política para UPDATE
CREATE POLICY "Users can update credentials of their clients" ON credentials
FOR UPDATE USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- 7. Política para DELETE
CREATE POLICY "Users can delete credentials of their clients" ON credentials
FOR DELETE USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- 8. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_credentials_updated_at();
-- ============================================
-- Script: Integração Google Calendar
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. Tabela para armazenar tokens OAuth do Google
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Tabela para vincular eventos do Calendar a clientes
CREATE TABLE IF NOT EXISTS calendar_event_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL,           -- ID do evento no Google Calendar
  event_title VARCHAR(500),                  -- Título para cache
  event_start TIMESTAMPTZ,                   -- Data início para cache
  event_end TIMESTAMPTZ,                     -- Data fim para cache
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  notes TEXT,                                -- Notas adicionais
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id ON user_google_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_clients_user_id ON calendar_event_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_clients_event_start ON calendar_event_clients(event_start);

-- 4. Habilitar RLS
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_clients ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para user_google_tokens
CREATE POLICY "Users can view own tokens" ON user_google_tokens
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON user_google_tokens
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON user_google_tokens
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON user_google_tokens
FOR DELETE USING (auth.uid() = user_id);

-- 6. Políticas RLS para calendar_event_clients
CREATE POLICY "Users can view own event links" ON calendar_event_clients
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own event links" ON calendar_event_clients
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event links" ON calendar_event_clients
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own event links" ON calendar_event_clients
FOR DELETE USING (auth.uid() = user_id);

-- 7. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_google_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_google_tokens_updated_at
  BEFORE UPDATE ON user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_google_tokens_updated_at();

CREATE TRIGGER trigger_calendar_events_updated_at
  BEFORE UPDATE ON calendar_event_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_google_tokens_updated_at();
-- =====================================================
-- SCRIPT SQL: Sistema de Hierarquia de Usuários
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela de organizações
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Empresa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Adicionar campo organization_id na tabela profiles (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Habilitar RLS nas tabelas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de segurança para organizations
-- Usuários só podem ver sua própria organização
CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
USING (
  id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  OR owner_id = auth.uid()
);

-- Apenas o owner pode atualizar a organização
CREATE POLICY "Owner can update organization"
ON organizations FOR UPDATE
USING (owner_id = auth.uid());

-- Apenas usuários autenticados podem inserir (ao criar conta)
CREATE POLICY "Authenticated users can create organization"
ON organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Atualizar política de profiles para filtrar por organização
-- Primeiro, remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

-- Criar nova política: usuários veem apenas profiles da mesma organização
CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT
USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  OR id = auth.uid()
);

-- 6. Criar função para auto-criar organização ao registrar
CREATE OR REPLACE FUNCTION handle_new_user_organization()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Criar organização para o novo usuário
  INSERT INTO organizations (name, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha Empresa'),
    NEW.id
  )
  RETURNING id INTO new_org_id;
  
  -- Atualizar profile com organization_id e role admin
  UPDATE profiles 
  SET organization_id = new_org_id, role = 'admin'
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger para novos usuários (se não existir)
DROP TRIGGER IF EXISTS on_auth_user_created_organization ON auth.users;
CREATE TRIGGER on_auth_user_created_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_organization();

-- =====================================================
-- ATENÇÃO: Execute também para usuários existentes
-- =====================================================
-- Para cada usuário existente sem organização, criar uma:
DO $$
DECLARE
  profile_record RECORD;
  new_org_id UUID;
BEGIN
  FOR profile_record IN 
    SELECT p.id, p.full_name, p.organization_id, u.email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.organization_id IS NULL
  LOOP
    -- Criar organização
    INSERT INTO organizations (name, owner_id)
    VALUES (
      COALESCE(profile_record.full_name, 'Minha Empresa'),
      profile_record.id
    )
    RETURNING id INTO new_org_id;
    
    -- Atualizar profile
    UPDATE profiles 
    SET organization_id = new_org_id, role = 'admin'
    WHERE id = profile_record.id;
    
    RAISE NOTICE 'Created organization % for user %', new_org_id, profile_record.email;
  END LOOP;
END $$;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- Add necessary columns for Manual Payment Override and Stable Sync
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS asaas_id text,
ADD COLUMN IF NOT EXISTS manual_override boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_method text;

-- Create a unique constraint on asaas_id to enable robust Upsert (Update-or-Insert)
-- This ensures we don't duplicate transactions for the same Asaas boleto.
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_asaas_id_key UNIQUE (asaas_id);
