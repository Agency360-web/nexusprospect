-- Add is_synced column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS is_synced boolean DEFAULT false;

-- Optional: Initialize is_synced as true for leads created before today 
-- to avoid syncing thousands of old records at once if user prefers.
-- For now, we default to false as per plan.
