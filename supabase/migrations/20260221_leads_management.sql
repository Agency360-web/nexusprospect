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
