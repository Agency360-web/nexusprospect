-- Remove tables related to Disparos / Campaigns
DROP TABLE IF EXISTS public.dispatch_campaigns CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.campaign_leads CASCADE;
DROP TABLE IF EXISTS public.campaign_items CASCADE;

-- Remove functions related to campaign dispatching
DROP FUNCTION IF EXISTS public.pick_scheduled_campaigns();
DROP FUNCTION IF EXISTS public.process_campaign_dispatch();

-- Note: 'transmissions' table is preserved as it is used by ClientGoals.tsx for reporting.
-- Note: 'leads' and 'clients' tables are preserved as they are core to the system.
