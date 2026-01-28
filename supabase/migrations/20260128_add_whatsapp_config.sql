-- Migration to add WhatsApp configuration to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_instance_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_token TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_notes TEXT;

-- Update the comments for clarity if needed
COMMENT ON COLUMN clients.whatsapp_instance_url IS 'UAZAPI or Evolution API Instance URL for this client';
COMMENT ON COLUMN clients.whatsapp_token IS 'Authentication token for the WhatsApp instance';
COMMENT ON COLUMN clients.whatsapp_notes IS 'Internal notes for WhatsApp conversations/deals';
