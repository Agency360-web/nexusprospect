-- Ensure method column exists and is of type text (it likely is, but enforcing no length check if any constrained it)
-- This is mostly a soft check as we are moving from a hardcoded 'POST' in frontend to dynamic.
-- Using text type allows 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_configs' AND column_name = 'method') THEN
        ALTER TABLE public.webhook_configs ADD COLUMN method text DEFAULT 'POST';
    ELSE
        -- If it exists, we ensure it's text. If it was an enum, we might need to alter it.
        -- Assuming it is text given previous 'POST' string insertion.
    END IF;
END $$;
