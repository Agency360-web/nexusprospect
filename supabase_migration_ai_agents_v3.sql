-- ============================================
-- MIGRATION V3: Detailed AI Agent Parameters & Fixes
-- ============================================

-- 1. Ensure 'type' column exists (fixes "Could not find column type" error)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='type') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN type TEXT NOT NULL DEFAULT 'dispatch';
    END IF;
END $$;

-- 2. Add New Configuration Columns
DO $$ 
BEGIN 
    -- API Key
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='api_key') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN api_key TEXT NOT NULL DEFAULT '';
    END IF;

    -- Max Tokens
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='max_tokens') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN max_tokens INTEGER NOT NULL DEFAULT 800;
    END IF;

    -- Diversity Level (Top P)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='diversity_level') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN diversity_level INTEGER NOT NULL DEFAULT 40;
    END IF;

    -- Frequency Penalty
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='frequency_penalty') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN frequency_penalty INTEGER NOT NULL DEFAULT 30;
    END IF;

    -- Presence Penalty
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='presence_penalty') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN presence_penalty INTEGER NOT NULL DEFAULT 15;
    END IF;

    -- Sign Messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='sign_messages') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN sign_messages BOOLEAN DEFAULT true;
    END IF;

    -- Read Messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='read_messages') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN read_messages BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Adjust Temperature scaling if it's currently float 0-1
-- Note: We'll keep it as float but the UI will handle the 0-100 to 0.0-1.0 mapping if necessary, 
-- or we can just change the column type to integer if the user strictly wants 25.
-- Let's stick to FLOAT to be safe but update existing defaults to the 0-100 scale suggested by "25".
ALTER TABLE ai_agent_settings ALTER COLUMN temperature TYPE FLOAT;
UPDATE ai_agent_settings SET temperature = 25 WHERE temperature <= 1.0; -- Migration of old records

-- 4. Refresh RLS policies just in case
ALTER TABLE ai_agent_settings ENABLE ROW LEVEL SECURITY;
