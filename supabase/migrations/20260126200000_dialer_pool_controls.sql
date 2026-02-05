-- Dialer Pool Controls: Company/Contact pause with reason tracking and cascade deletes
-- Enables removing companies/contacts from dialer pool with duration + reason

-- ============================================
-- COMPANY DIALER PAUSE FIELDS
-- ============================================
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS dialer_paused_until DATE;

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS dialer_pause_reason_code TEXT;

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS dialer_pause_reason_notes TEXT;

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS dialer_paused_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_dialer_paused_until ON companies(dialer_paused_until);

-- ============================================
-- CONTACT DIALER PAUSE REASON FIELDS
-- (contacts already has dialer_status, dialer_paused_until from cadence migration)
-- ============================================
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS dialer_pause_reason_code TEXT;

ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS dialer_pause_reason_notes TEXT;

ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS dialer_paused_at TIMESTAMPTZ;

-- ============================================
-- DIALER POOL EVENTS TABLE (audit/history)
-- ============================================
CREATE TABLE IF NOT EXISTS dialer_pool_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Entity being affected
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'contact')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Snapshot of name at time of event (for history after deletion)
  entity_name TEXT NOT NULL,
  
  -- Action taken
  action TEXT NOT NULL CHECK (action IN ('paused', 'unpaused', 'deleted')),
  
  -- Pause details (null for unpause/delete actions)
  paused_until DATE,
  duration_months INTEGER,
  reason_code TEXT,
  reason_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialer_pool_events_user ON dialer_pool_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dialer_pool_events_company ON dialer_pool_events(company_id);
CREATE INDEX IF NOT EXISTS idx_dialer_pool_events_contact ON dialer_pool_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_dialer_pool_events_entity_type ON dialer_pool_events(entity_type, created_at DESC);

-- Disable RLS for single-user mode
ALTER TABLE dialer_pool_events DISABLE ROW LEVEL SECURITY;

-- ============================================
-- CASCADE DELETE: contacts.company_id
-- Change from SET NULL to CASCADE so deleting company deletes its contacts
-- ============================================
-- First drop the existing foreign key constraint
ALTER TABLE contacts 
  DROP CONSTRAINT IF EXISTS contacts_company_id_fkey;

-- Re-add with CASCADE
ALTER TABLE contacts 
  ADD CONSTRAINT contacts_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- ============================================
-- CASCADE DELETE: tasks.contact_id
-- Change from SET NULL to CASCADE so deleting contact deletes its tasks
-- ============================================
-- First drop the existing foreign key constraint
ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_contact_id_fkey;

-- Re-add with CASCADE
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- ============================================
-- CASCADE DELETE: notes.company_id (for company-wide notes)
-- ============================================
-- First drop the existing foreign key constraint if exists
ALTER TABLE notes 
  DROP CONSTRAINT IF EXISTS notes_company_id_fkey;

-- Re-add with CASCADE
ALTER TABLE notes 
  ADD CONSTRAINT notes_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- ============================================
-- CASCADE DELETE: meetings.company_id
-- ============================================
ALTER TABLE meetings 
  DROP CONSTRAINT IF EXISTS meetings_company_id_fkey;

ALTER TABLE meetings 
  ADD CONSTRAINT meetings_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- ============================================
-- CASCADE DELETE: dialer_drafts.company_id
-- ============================================
ALTER TABLE dialer_drafts 
  DROP CONSTRAINT IF EXISTS dialer_drafts_company_id_fkey;

ALTER TABLE dialer_drafts 
  ADD CONSTRAINT dialer_drafts_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Done!
SELECT 'Dialer pool controls migration complete!' as result;
