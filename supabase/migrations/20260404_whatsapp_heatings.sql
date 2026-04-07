-- Tabela para armazenar configurações de aquecimento de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_heatings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    instance_1_id TEXT NOT NULL,
    instance_1_name TEXT,
    instance_2_id TEXT NOT NULL,
    instance_2_name TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE whatsapp_heatings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own heatings"
    ON whatsapp_heatings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own heatings"
    ON whatsapp_heatings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own heatings"
    ON whatsapp_heatings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own heatings"
    ON whatsapp_heatings FOR DELETE
    USING (auth.uid() = user_id);
