-- Fix: Ensure contacts are deleted when their company is deleted
-- This migration ensures the ON DELETE CASCADE constraint is properly set

-- ============================================
-- FIX CONTACTS TABLE - company_id CASCADE
-- ============================================
-- Drop existing constraint (may have been SET NULL originally)
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_company_id_fkey;

-- Re-add with CASCADE - when company is deleted, delete all its contacts
ALTER TABLE contacts 
  ADD CONSTRAINT contacts_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Done
SELECT 'Fixed contacts.company_id to use ON DELETE CASCADE' as result;
