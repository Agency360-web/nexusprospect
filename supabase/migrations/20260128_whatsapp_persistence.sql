-- Migration to create WhatsApp chat persistence tables
-- 1. Create Chats Table
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    id TEXT PRIMARY KEY, -- JID or Unique ID from WhatsApp
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    last_message TEXT,
    avatar_url TEXT,
    unread_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY, -- Message Key/ID from WhatsApp
    chat_id TEXT REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    text TEXT,
    type TEXT DEFAULT 'text', -- text, image, video, audio, document
    from_me BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'sent', -- sent, delivered, read
    media_url TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- 4. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_client_id ON whatsapp_chats(client_id);
