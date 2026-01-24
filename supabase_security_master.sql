-- SECURITY HARDENING MASTER SCRIPT (FIXED)
-- This script creates missing tables if needed, enables RLS, and sets strict policies.

-- 0. ENSURE TABLES EXIST (Dependencies)
create extension if not exists "uuid-ossp";

-- Clients (Base table)
create table if not exists public.clients (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    status text check (status in ('active', 'inactive')) default 'active',
    created_at timestamptz default now(),
    email text unique,
    user_id uuid references auth.users(id)
);

-- Ensure user_id exists on clients if it was created without it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='user_id') THEN
        ALTER TABLE public.clients ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Campaigns
create table if not exists public.campaigns (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    name text not null,
    message text,
    status text check (status in ('draft', 'sending', 'completed', 'failed')) default 'draft',
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

-- Email Senders (The one that caused the error)
create table if not exists public.email_senders (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    email text not null,
    provider text not null,
    from_name text,
    status text check (status in ('active', 'inactive', 'unverified')) default 'active',
    daily_limit int default 500,
    sent_today int default 0,
    config jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

-- Contract Templates
create table if not exists public.contract_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Contracts
create table if not exists public.contracts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  template_id uuid references public.contract_templates,
  client_name text not null,
  status text check (status in ('draft', 'generated', 'signed')) default 'draft',
  variables jsonb default '{}'::jsonb,
  content_snapshot text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1. Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- 2. Drop insecure "Allow all" policies
DROP POLICY IF EXISTS "Allow all access for public" ON public.clients;
DROP POLICY IF EXISTS "Allow all access for public" ON public.leads;
DROP POLICY IF EXISTS "Allow all access for public" ON public.goals;
DROP POLICY IF EXISTS "Allow all access for public" ON public.transmissions;
DROP POLICY IF EXISTS "Allow all access for public" ON public.campaigns;
DROP POLICY IF EXISTS "Allow all access for public" ON public.email_senders;

-- 3. Create/Ensure Strict Policies for Clients
-- Users can only see/edit their own clients
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
CREATE POLICY "Users can view own clients" ON public.clients
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
CREATE POLICY "Users can insert own clients" ON public.clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
CREATE POLICY "Users can update own clients" ON public.clients
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
CREATE POLICY "Users can delete own clients" ON public.clients
    FOR DELETE USING (auth.uid() = user_id);


-- 4. Create Policies for CHILD tables (access via client ownership)

-- Leads
DROP POLICY IF EXISTS "Users can manage leads of own clients" ON public.leads;
CREATE POLICY "Users can manage leads of own clients" ON public.leads
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Goals
DROP POLICY IF EXISTS "Users can manage goals of own clients" ON public.goals;
CREATE POLICY "Users can manage goals of own clients" ON public.goals
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Transmissions
DROP POLICY IF EXISTS "Users can manage transmissions of own clients" ON public.transmissions;
CREATE POLICY "Users can manage transmissions of own clients" ON public.transmissions
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- WhatsApp Numbers
DROP POLICY IF EXISTS "Users can manage numbers of own clients" ON public.whatsapp_numbers;
CREATE POLICY "Users can manage numbers of own clients" ON public.whatsapp_numbers
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Tags
DROP POLICY IF EXISTS "Users can manage tags of own clients" ON public.tags;
CREATE POLICY "Users can manage tags of own clients" ON public.tags
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Webhook Configs
DROP POLICY IF EXISTS "Users can manage webhooks of own clients" ON public.webhook_configs;
CREATE POLICY "Users can manage webhooks of own clients" ON public.webhook_configs
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Campaigns
DROP POLICY IF EXISTS "Users can manage campaigns of own clients" ON public.campaigns;
CREATE POLICY "Users can manage campaigns of own clients" ON public.campaigns
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Email Senders
DROP POLICY IF EXISTS "Users can manage email_senders of own clients" ON public.email_senders;
CREATE POLICY "Users can manage email_senders of own clients" ON public.email_senders
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));


-- 5. Policies for DIRECT USER OWNED tables (Contracts)

-- Contract Templates
DROP POLICY IF EXISTS "Users can view their own templates" ON public.contract_templates;
CREATE POLICY "Users can view their own templates" ON public.contract_templates
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own templates" ON public.contract_templates;
CREATE POLICY "Users can insert their own templates" ON public.contract_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own templates" ON public.contract_templates;
CREATE POLICY "Users can update their own templates" ON public.contract_templates
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own templates" ON public.contract_templates;
CREATE POLICY "Users can delete their own templates" ON public.contract_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Contracts
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
CREATE POLICY "Users can view their own contracts" ON public.contracts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
CREATE POLICY "Users can insert their own contracts" ON public.contracts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
CREATE POLICY "Users can update their own contracts" ON public.contracts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;
CREATE POLICY "Users can delete their own contracts" ON public.contracts
    FOR DELETE USING (auth.uid() = user_id);
