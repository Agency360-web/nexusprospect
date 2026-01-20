-- Add necessary columns for Manual Payment Override and Stable Sync
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS asaas_id text,
ADD COLUMN IF NOT EXISTS manual_override boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_method text;

-- Create a unique constraint on asaas_id to enable robust Upsert (Update-or-Insert)
-- This ensures we don't duplicate transactions for the same Asaas boleto.
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_asaas_id_key UNIQUE (asaas_id);
