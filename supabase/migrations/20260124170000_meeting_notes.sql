-- Meeting Notes and Tasks Integration
-- Adds meeting_notes table and links tasks to meetings

-- ============================================
-- ADD MEETING_ID TO TASKS TABLE
-- ============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_meeting_id ON tasks(meeting_id);

-- ============================================
-- MEETING NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_action_item BOOLEAN DEFAULT FALSE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Links to auto-created task
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting_id ON meeting_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_user_id ON meeting_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_is_action_item ON meeting_notes(meeting_id, is_action_item) WHERE is_action_item = TRUE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE meeting_notes DISABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGER: Update meeting_notes updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_meeting_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meeting_notes_updated_at ON meeting_notes;
CREATE TRIGGER trigger_meeting_notes_updated_at
  BEFORE UPDATE ON meeting_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_notes_updated_at();

-- Done!
SELECT 'Meeting notes table created and tasks.meeting_id added!' as result;
