-- Dialer Drafts Table
-- Stores auto-saved dialer state so users never lose work
-- Upserted by (user_id, contact_id), cleared when call is finalized

CREATE TABLE IF NOT EXISTS dialer_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Stores all dialer state as JSON
  -- Includes: timestampedNotes, outcome, disposition, BANT flags, 
  -- selectedPhoneType, callStartTime, callDuration, etc.
  payload JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only have one draft per contact
  UNIQUE(user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_dialer_drafts_user_id ON dialer_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_dialer_drafts_contact_id ON dialer_drafts(contact_id);
CREATE INDEX IF NOT EXISTS idx_dialer_drafts_updated_at ON dialer_drafts(updated_at);

-- Disable RLS for single-user mode
ALTER TABLE dialer_drafts DISABLE ROW LEVEL SECURITY;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_dialer_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dialer_drafts_updated_at ON dialer_drafts;
CREATE TRIGGER trigger_dialer_drafts_updated_at
  BEFORE UPDATE ON dialer_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_dialer_drafts_updated_at();

-- Done!
SELECT 'Dialer drafts table created!' as result;
