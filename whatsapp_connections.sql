-- Create table for WhatsApp connections
-- Adjusted for Supabase/PostgreSQL with UUIDs

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL, -- Changed from INTEGER to UUID to match auth.users
    instance VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    qrcode TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_connection UNIQUE (user_id),
    -- Reference auth.users or public.profiles depending on strictness
    -- Ideally auth.users but RLS might be tricky from external PHP without service role
    -- For now, foreign key to profiles is safer if profiles exist for all users
    CONSTRAINT fk_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_user_id ON public.whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instance ON public.whatsapp_connections(instance);

-- Enable RLS (Optional but recommended)
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (since PHP connects via postgres user usually, bypassing RLS unless using anon/auth role)
-- If PHP connects as 'postgres' or 'service_role', it bypasses RLS.
-- If PHP connects as a restricted user, we need policies.
-- Assuming standard simplified setup:
CREATE POLICY "Allow full access to service role" ON public.whatsapp_connections
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
    
-- Additional instruction: If running this in Supabase SQL Editor, `auth.users` is hidden but accessible.
-- If using external tool, ensure the connecting user has permissions.
