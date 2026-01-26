-- Migration: Add scheduling and robustness fields to campaigns table

-- 1. Add new columns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transmission_payload JSONB,
ADD COLUMN IF NOT EXISTS error_log TEXT;

-- 2. Update status check constraint
-- First, drop the existing constraint if it exists (names vary)
DO $$ 
BEGIN 
    ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
EXCEPTION 
    WHEN undefined_object THEN null; 
END $$;

-- 3. Add new status check constraint
ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('draft', 'scheduled', 'processing', 'completed', 'failed', 'sending'));

-- 4. Comment on new columns
COMMENT ON COLUMN public.campaigns.scheduled_at IS 'When the campaign is scheduled to be dispatched.';
COMMENT ON COLUMN public.campaigns.transmission_payload IS 'The full JSON payload to be sent to the webhook.';
COMMENT ON COLUMN public.campaigns.error_log IS 'Storage for error messages in case of dispatch failure.';

-- 5. Index for the scheduler lookup
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_lookup 
ON public.campaigns(status, scheduled_at) 
WHERE status = 'scheduled';
