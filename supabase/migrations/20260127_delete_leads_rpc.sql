-- Migration: Create RPC function for bulk lead deletion
-- Path: /Users/conectamarketing/Documents/nexusprospect/supabase/migrations/20260127_delete_leads_rpc.sql

CREATE OR REPLACE FUNCTION delete_leads_in_bulk(lead_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with high privileges to bypass RLS overhead, but we check ownership manually
AS $$
BEGIN
  -- Security check: Ensure the user owns the clients of THESE leads
  -- This is a condensed version of the RLS policy but more efficient for mass deletion
  DELETE FROM public.leads
  WHERE id = ANY(lead_ids)
  AND client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  );
END;
$$;
