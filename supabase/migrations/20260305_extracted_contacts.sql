-- Table to store extracted WhatsApp contacts
CREATE TABLE IF NOT EXISTS extracted_contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    connection_id integer REFERENCES whatsapp_connections(id) ON DELETE CASCADE NOT NULL,
    contact_name text DEFAULT '',
    phone text NOT NULL,
    push_name text DEFAULT '',
    extracted_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast queries per user+connection
CREATE INDEX idx_extracted_contacts_user_conn ON extracted_contacts(user_id, connection_id);

-- Enable RLS
ALTER TABLE extracted_contacts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own extracted contacts
CREATE POLICY "Users can view own extracted contacts"
    ON extracted_contacts FOR SELECT
    USING (auth.uid() = user_id);

-- Users can delete their own extracted contacts
CREATE POLICY "Users can delete own extracted contacts"
    ON extracted_contacts FOR DELETE
    USING (auth.uid() = user_id);

-- Allow inserts (from N8N via service role or authenticated user)
CREATE POLICY "Allow insert extracted contacts"
    ON extracted_contacts FOR INSERT
    WITH CHECK (true);
