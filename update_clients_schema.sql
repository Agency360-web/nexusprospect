-- Add columns to clients table for contract management
-- Fields: Contact Person, Detailed Address, Financial/Contract Defaults

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS corporate_name text,
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS default_services text,
ADD COLUMN IF NOT EXISTS default_term text,
ADD COLUMN IF NOT EXISTS default_value text,
ADD COLUMN IF NOT EXISTS default_payment_method text,
ADD COLUMN IF NOT EXISTS default_payment_conditions text;

-- Add comments for clarity
COMMENT ON COLUMN clients.corporate_name IS 'Razão Social';
COMMENT ON COLUMN clients.cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN clients.address IS 'Endereço completo (Rua, Número, Compl)';
COMMENT ON COLUMN clients.default_services IS 'Descrição padrão dos serviços para contratos';
