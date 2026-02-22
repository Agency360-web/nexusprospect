-- Add user_id column to lead_folders
ALTER TABLE public.lead_folders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create an index to speed up queries by user_id
CREATE INDEX IF NOT EXISTS idx_lead_folders_user_id ON public.lead_folders(user_id);
