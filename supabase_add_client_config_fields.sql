-- Add new columns for extended client configuration
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS corporate_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address text;

-- Update status check constraint to include new statuses
-- Postgres doesn't allow easy modification of CHECK constraints, so we drop and add.
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive', 'overdue', 'terminated'));
