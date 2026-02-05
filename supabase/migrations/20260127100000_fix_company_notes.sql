-- Fix: Allow company-wide notes without a contact_id
-- The original notes table required contact_id to be NOT NULL,
-- but company-wide notes don't have a contact association.

-- Drop the NOT NULL constraint on contact_id
ALTER TABLE notes ALTER COLUMN contact_id DROP NOT NULL;

-- Add a check constraint to ensure either contact_id or company_id is set
-- (a note must belong to either a contact OR a company)
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_has_owner;
ALTER TABLE notes ADD CONSTRAINT notes_has_owner 
  CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL);

-- Done
SELECT 'Fixed notes table to allow company-wide notes without contact_id' as result;
