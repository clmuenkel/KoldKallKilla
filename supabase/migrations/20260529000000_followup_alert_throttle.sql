-- Follow-up alert throttle: lets the dashboard alert fire at most twice per
-- follow-up (the day it's due, then once ~3 days later), then go quiet while
-- the contact remains in the Follow-ups Due dialer queue. Cross-device state so
-- the alert isn't naggy or reset by clearing browser storage.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS follow_up_alerted_at timestamptz;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS follow_up_alert_count integer NOT NULL DEFAULT 0;

-- Speeds up the Follow-ups Due queue + alert queries.
CREATE INDEX IF NOT EXISTS idx_contacts_next_follow_up
  ON contacts (user_id, next_follow_up)
  WHERE next_follow_up IS NOT NULL;
