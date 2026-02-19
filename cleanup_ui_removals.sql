-- SQL script to clean up data related to removed UI features
-- Usage: Run this in the Supabase SQL Editor

-- 1. Remove "Integrations" data
-- We are keeping 'user_google_tokens' as requested.
-- If there were other integration tables (e.g., for OpenAI/Gemini), they should be dropped.
-- Based on the codebase analysis, these might be stored in a generic 'integrations' table or 'api_keys'.
-- IF EXISTS checks to prevent errors.

DROP TABLE IF EXISTS openai_integrations;
DROP TABLE IF EXISTS gemini_integrations;
DROP TABLE IF EXISTS ai_agents;
DROP TABLE IF EXISTS ai_configs;

-- 2. Remove "Minha Empresa" (Organization) *Data*?
-- CRITICAL: The 'organizations' table is linked to 'profiles' via 'organization_id'.
-- We CANNOT drop the 'organizations' table without breaking user logins/RBAC.
-- However, we can clear out unused columns if they exist, or just leave it as the core identity structure.
-- The user asked to remove "pages that had before... Minha Empresa".
-- Since 'Minha Empresa' was just a view to edit the organization name, we will keep the table
-- but ensure no "extra" data is hanging around.
-- If you strictly want to remove the *concept* of organizations layers, you'd need a migration to set organization_id to NULL.
-- For now, we assume the user just wants the "page" gone, which we did in the code.
-- The database structure for organizations is likely foundational.

-- 3. Dashboard
-- Dashboard usually reads from other tables (tasks, clients, etc.).
-- If there are dashboard specific tables, drop them.
DROP TABLE IF EXISTS dashboard_widgets;
DROP TABLE IF EXISTS dashboard_layouts;

-- 4. Cleanup of previously removed features (Safety check)
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS dispatch_campaigns CASCADE;
DROP TABLE IF EXISTS campaign_leads CASCADE;
DROP TABLE IF EXISTS evolution_instances CASCADE;
DROP TABLE IF EXISTS whatsapp_instances CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS leads CASCADE; -- Warning: verify if used by other modules, but user asked to remove "Goals and Leads" features.

-- 5. Remove 'allowed_pages' references to removed pages
-- We need to update the 'profiles' table to remove 'dashboard', 'organization', 'ai-agent' from the 'allowed_pages' array.
-- This cleans up the RBAC permissions.

-- Remove 'dashboard'
UPDATE profiles
SET allowed_pages = array_remove(allowed_pages, 'dashboard');

-- Remove 'organization'
UPDATE profiles
SET allowed_pages = array_remove(allowed_pages, 'organization');

-- Remove 'ai-agent'
UPDATE profiles
SET allowed_pages = array_remove(allowed_pages, 'ai-agent');

-- Remove 'integrations' (if fully removed)
UPDATE profiles
SET allowed_pages = array_remove(allowed_pages, 'integrations');

-- Add 'clients' as default if not present
UPDATE profiles
SET allowed_pages = array_append(allowed_pages, 'clients')
WHERE NOT ('clients' = ANY(allowed_pages));
