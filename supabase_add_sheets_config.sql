-- Add google_sheets_config column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_sheets_config jsonb default '{}'::jsonb;

-- Comment on column to explain structure
COMMENT ON COLUMN public.clients.google_sheets_config IS 'Stores Google Sheets Webhook configuration: { "url": "...", "auto_sync": boolean, "last_sync": "..." }';
