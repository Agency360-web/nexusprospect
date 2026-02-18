-- Remove tables related to Campaigns (Disparos)
DROP TABLE IF EXISTS "transmissions" CASCADE;
DROP TABLE IF EXISTS "campaign_leads" CASCADE;
DROP TABLE IF EXISTS "campaigns" CASCADE;
DROP TABLE IF EXISTS "dispatch_campaigns" CASCADE;

-- Remove tables related to Commercial/CRM (Leads, Goals)
DROP TABLE IF EXISTS "lead_timeline" CASCADE;
DROP TABLE IF EXISTS "lead_tags" CASCADE;
DROP TABLE IF EXISTS "lead_folders" CASCADE;
DROP TABLE IF EXISTS "leads" CASCADE;
DROP TABLE IF EXISTS "goals" CASCADE;
DROP TABLE IF EXISTS "goals_metrics" CASCADE;

-- Remove Evolution API configuration tables
DROP TABLE IF EXISTS "evolution_instances" CASCADE;
DROP TABLE IF EXISTS "whatsapp_instances" CASCADE;

-- Remove unused enum types if any (e.g., campaign_status, lead_status)
DROP TYPE IF EXISTS "campaign_status";
DROP TYPE IF EXISTS "lead_status";
DROP TYPE IF EXISTS "transmission_status";

-- Remove functions related to these features
DROP FUNCTION IF EXISTS "process_campaign_dispatch";
DROP FUNCTION IF EXISTS "update_campaign_stats";
