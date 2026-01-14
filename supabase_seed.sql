-- Seed Initial Data

-- Insert Clients (using specific UUIDs to make testing easier if needed, but standardizing on generated ones is fine too. Let's use generated ones but capture them for relationships)
-- Only insert if table is empty to avoid duplicates on re-run
DO $$
DECLARE
    client1_id uuid;
    client2_id uuid;
    tag1_id uuid;
    tag2_id uuid;
    tag_external_id uuid;
BEGIN
    -- 1. Client 1 (Alpargatas)
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE email = 'admin@alpargatas.com') THEN
        INSERT INTO public.clients (name, status, email)
        VALUES ('Alpargatas S.A.', 'active', 'admin@alpargatas.com')
        RETURNING id INTO client1_id;

        -- Insert Tags for Client 1
        INSERT INTO public.tags (client_id, name, color) VALUES (client1_id, 'Prospect', 'bg-blue-100 text-blue-700') RETURNING id INTO tag1_id;
        INSERT INTO public.tags (client_id, name, color) VALUES (client1_id, 'VIP', 'bg-slate-900 text-white') RETURNING id INTO tag2_id;

        -- Insert Goals for Client 1
        INSERT INTO public.goals (client_id, month, year, channel, monthly_target, annual_target, weekly_targets)
        VALUES 
        (client1_id, EXTRACT(MONTH FROM NOW())::int, EXTRACT(YEAR FROM NOW())::int, 'email', 4700, 56400, '[1175, 1175, 1175, 1175]'::jsonb),
        (client1_id, EXTRACT(MONTH FROM NOW())::int, EXTRACT(YEAR FROM NOW())::int, 'whatsapp', 2400, 28800, '[600, 600, 600, 600]'::jsonb);

        -- Insert Leads for Client 1 using Tag IDs
        INSERT INTO public.leads (client_id, name, phone, tags, status, custom_fields)
        VALUES
        (client1_id, 'João Silva', '5511999990001', ARRAY[tag1_id::text], 'valid', '{"empresa": "Tech Solutions"}'::jsonb),
        (client1_id, 'Maria Santos', '5511999990002', ARRAY[tag1_id::text, tag2_id::text], 'valid', '{"empresa": "Design Co"}'::jsonb),
        (client1_id, 'Pedro Costa', '5511999990003', ARRAY[tag2_id::text], 'valid', '{}'::jsonb);

        -- Insert Numbers for Client 1
        INSERT INTO public.whatsapp_numbers (client_id, nickname, phone, status, daily_limit, sent_today)
        VALUES (client1_id, 'Suporte SP', '5511999998888', 'active', 1000, 142);

        -- Insert Webhooks for Client 1
        INSERT INTO public.webhook_configs (client_id, name, url, type, active)
        VALUES (client1_id, 'CRM Sync', 'https://api.crm.com/webhook', 'status', true);

        -- Insert Transmissions for Client 1 (Actuals)
        INSERT INTO public.transmissions (client_id, channel, status, created_at)
        SELECT client1_id, 'email', 'sent', NOW() - (n || ' days')::interval
        FROM generate_series(1, 1500) n; 
        
        INSERT INTO public.transmissions (client_id, channel, status, created_at)
        SELECT client1_id, 'whatsapp', 'read', NOW() - (n || ' days')::interval
        FROM generate_series(1, 800) n;
    END IF;

    -- 2. Client 2 (Inova Tech)
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE email = 'contato@inova.io') THEN
        INSERT INTO public.clients (name, status, email)
        VALUES ('Inova Tech', 'active', 'contato@inova.io')
        RETURNING id INTO client2_id;
        
        -- Insert Tags for Client 2
        INSERT INTO public.tags (client_id, name, color) VALUES (client2_id, 'Leads Externos', 'bg-emerald-100 text-emerald-700') RETURNING id INTO tag_external_id;

        -- Insert Leads for Client 2
        INSERT INTO public.leads (client_id, name, phone, tags, status)
        VALUES
        (client2_id, 'Carlos Souza', '5521999990005', ARRAY[tag_external_id::text], 'valid');

        -- Insert Numbers for Client 2
        INSERT INTO public.whatsapp_numbers (client_id, nickname, phone, status, daily_limit, sent_today)
        VALUES (client2_id, 'Vendas RJ', '5521988887777', 'active', 500, 0);
    END IF;
END $$;
