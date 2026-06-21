-- Outlook calendar (read-only ICS share link) + meeting-reminder action tracking.

-- Where the user pastes their published Outlook calendar .ics URL.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS outlook_ics_url TEXT;

-- Tracks which reminder actions the user has completed/ticked off. Reminder
-- actions themselves are computed live from the calendar; we only persist the
-- "done" marks so the morning checklist knows what's left.
CREATE TABLE IF NOT EXISTS reminder_done (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_uid TEXT NOT NULL,        -- ICS event UID (or a stable hash)
  action_type TEXT NOT NULL,      -- text_week | demo_2day | text_dayof | call_30 | call_20
  action_date DATE NOT NULL,      -- the day the action was due (CST)
  done_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, event_uid, action_type, action_date)
);

CREATE INDEX IF NOT EXISTS idx_reminder_done_user ON reminder_done (user_id, action_date);

ALTER TABLE reminder_done ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own reminder_done" ON reminder_done;
CREATE POLICY "own reminder_done" ON reminder_done
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
