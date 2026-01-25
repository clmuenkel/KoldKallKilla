-- PezCRM Schema Enhancement: Meetings and Company-Wide Notes
-- Run this migration in your Supabase SQL Editor

-- ============================================
-- MODIFY NOTES TABLE - Add company-wide support
-- ============================================
ALTER TABLE notes 
  ADD COLUMN IF NOT EXISTS is_company_wide BOOLEAN DEFAULT FALSE;

ALTER TABLE notes 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notes_company_id ON notes(company_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_company_wide ON notes(is_company_wide) WHERE is_company_wide = TRUE;

-- ============================================
-- MEETINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  location TEXT,
  meeting_link TEXT,
  
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT FALSE,
  
  outcome TEXT, -- For post-meeting notes
  outcome_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_contact_id ON meetings(contact_id);
CREATE INDEX IF NOT EXISTS idx_meetings_company_id ON meetings(company_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON meetings(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(user_id, status);

-- ============================================
-- ROW LEVEL SECURITY FOR MEETINGS
-- ============================================
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGER: Update meetings updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meetings_updated_at ON meetings;
CREATE TRIGGER trigger_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();

-- ============================================
-- HELPER: Get upcoming meetings count
-- ============================================
CREATE OR REPLACE FUNCTION get_upcoming_meetings_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM meetings 
  WHERE user_id = user_uuid 
    AND status = 'scheduled'
    AND scheduled_at > NOW();
$$ LANGUAGE SQL STABLE;

-- ============================================
-- HELPER: Get today's meetings
-- ============================================
CREATE OR REPLACE FUNCTION get_todays_meetings(user_uuid UUID)
RETURNS SETOF meetings AS $$
  SELECT * 
  FROM meetings 
  WHERE user_id = user_uuid 
    AND status = 'scheduled'
    AND DATE(scheduled_at) = CURRENT_DATE
  ORDER BY scheduled_at ASC;
$$ LANGUAGE SQL STABLE;

-- Done!
SELECT 'Meetings table and company-wide notes columns created!' as result;
