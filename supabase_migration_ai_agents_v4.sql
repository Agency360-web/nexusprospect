-- ============================================
-- MIGRATION V4: WhatsApp Instance Binding
-- ============================================

-- 1. Add WhatsApp Instance columns to ai_agent_settings
DO $$ 
BEGIN 
    -- Instance ID (Linking to the connection)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='whatsapp_instance_id') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN whatsapp_instance_id TEXT;
    END IF;

    -- Instance Name (For display convenience)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_agent_settings' AND column_name='whatsapp_instance_name') THEN
        ALTER TABLE ai_agent_settings ADD COLUMN whatsapp_instance_name TEXT;
    END IF;
END $$;
