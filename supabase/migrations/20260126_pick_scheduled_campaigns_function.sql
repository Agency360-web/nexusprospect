-- Database function for atomic campaign picking
CREATE OR REPLACE FUNCTION pick_scheduled_campaigns()
RETURNS SETOF public.campaigns AS $$
BEGIN
    RETURN QUERY
    UPDATE public.campaigns
    SET status = 'processing'
    WHERE id IN (
        SELECT id
        FROM public.campaigns
        WHERE status = 'scheduled'
          AND (scheduled_at <= NOW() OR scheduled_at IS NULL)
        ORDER BY scheduled_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 10 -- Process in batches
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
