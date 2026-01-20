-- Update the check constraint for contracts status to include 'sent_to_signature'
-- First, try to drop the existing constraint if we can guess the name, or just use a safe alter
-- Since we don't know the exact name, we might need to find it or drop the column constraint. 
-- However, easiest way is often to drop the constraint by name if standard, or replace it.
-- Let's assume a standard name `contracts_status_check` or similar, but safer is to do a direct update if possible.

-- Safest approach: Drop the constraint and re-add it with the new values.
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE contracts 
ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('draft', 'generated', 'sent_to_signature', 'signed'));
