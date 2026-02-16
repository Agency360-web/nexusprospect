-- Migration: Allow multiple WhatsApp connections per user
-- Removes the unique constraint on user_id
-- Adds a check constraint to limit connections (optional, enforced in app logic)

DO $$ 
BEGIN
    -- Remove the unique constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_user_connection' 
        AND conrelid = 'public.whatsapp_connections'::regclass
    ) THEN
        ALTER TABLE public.whatsapp_connections 
        DROP CONSTRAINT unique_user_connection;
    END IF;

    -- Add a unique constraint on instance name to prevent duplicates
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_instance_name' 
        AND conrelid = 'public.whatsapp_connections'::regclass
    ) THEN
        ALTER TABLE public.whatsapp_connections 
        ADD CONSTRAINT unique_instance_name UNIQUE (instance);
    END IF;

END $$;
