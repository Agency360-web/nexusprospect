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
