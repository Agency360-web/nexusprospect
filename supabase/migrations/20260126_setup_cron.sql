-- Final setup for scheduling dispatches via pg_cron

-- 1. Enable pg_cron if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Setup the cron job to call the Edge Function every minute
-- Note: Replace <project-ref> with the actual Supabase project reference if needed, 
-- but usually internal calls can use localhost or the service name.
-- Using net.http_post (requires pg_net extension) is the cleanest way.

CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
    'dispatch-campaigns-every-minute', -- name of the job
    '* * * * *',                       -- every minute
    $$
    SELECT net.http_post(
        url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/dispatch-campaigns',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Note: In a real Supabase environment, you might need to use the full project URL 
-- and ensure the service_role_key is accessible. 
-- Alternatively, many users use a simple Edge Function trigger or an external cron like n8n.
