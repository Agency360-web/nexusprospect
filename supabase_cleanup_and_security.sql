-- 1. CLEANUP MOCK DATA
-- This will delete ALL data to start fresh
TRUNCATE TABLE public.clients CASCADE;

-- 2. SCHEMA UPDATES FOR MULTI-TENANCY
-- Add user_id to clients table to link data to specific users
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 3. ENABLE RLS (Security)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- 4. REMOVE OLD PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Allow all access for public" ON public.clients;
DROP POLICY IF EXISTS "Allow all access for public" ON public.leads;
DROP POLICY IF EXISTS "Allow all access for public" ON public.goals;
DROP POLICY IF EXISTS "Allow all access for public" ON public.transmissions;

-- 5. CREATE STRICT RLS POLICIES

-- Clients: Users can only see their own clients
CREATE POLICY "Users can view own clients" ON public.clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON public.clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON public.clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON public.clients
    FOR DELETE USING (auth.uid() = user_id);

-- Derived Tables: Access granted if user owns the parent client

-- Leads
CREATE POLICY "Users can manage leads of own clients" ON public.leads
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Goals
CREATE POLICY "Users can manage goals of own clients" ON public.goals
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Transmissions
CREATE POLICY "Users can manage transmissions of own clients" ON public.transmissions
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- WhatsApp Numbers
CREATE POLICY "Users can manage numbers of own clients" ON public.whatsapp_numbers
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Tags
CREATE POLICY "Users can manage tags of own clients" ON public.tags
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Webhooks
CREATE POLICY "Users can manage webhooks of own clients" ON public.webhook_configs
    USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
