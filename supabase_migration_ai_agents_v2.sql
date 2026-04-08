-- Migration to support multiple AI Agents per user/organization
-- This script updates ai_agent_settings table

-- 1. Remove the unique constraint on organization_id if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_agent_settings_organization_id_key') THEN
        ALTER TABLE ai_agent_settings DROP CONSTRAINT ai_agent_settings_organization_id_key;
    END IF;
END $$;

-- 2. Add new columns
ALTER TABLE ai_agent_settings 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'dispatch',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS prompt TEXT DEFAULT '';

-- 3. (Optional) Migrate existing data if you want to keep it
-- Currently, one record has both dispatch and support prompts.
-- We might want to split them into two separate records or just leave it for the user to re-configure.
-- Given the user said "remove all old logic", we can just clear or adapt.
-- Let's at least ensure current prompt_dispatch goes to prompt if it exists.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='prompt_dispatch') THEN
        UPDATE ai_agent_settings SET prompt = prompt_dispatch WHERE prompt = '' OR prompt IS NULL;
    END IF;
END $$;

-- 4. Cleanup old columns (uncomment if you want to be aggressive, but maybe keep them for compatibility for a moment)
-- ALTER TABLE ai_agent_settings DROP COLUMN IF EXISTS prompt_dispatch;
-- ALTER TABLE ai_agent_settings DROP COLUMN IF EXISTS prompt_support;
-- ALTER TABLE ai_agent_settings DROP COLUMN IF EXISTS prompt_followup;
-- ALTER TABLE ai_agent_settings DROP COLUMN IF EXISTS is_active_dispatch;
-- ALTER TABLE ai_agent_settings DROP COLUMN IF EXISTS is_active_support;
