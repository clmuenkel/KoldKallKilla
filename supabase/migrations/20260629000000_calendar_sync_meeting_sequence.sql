-- Calendar sync + meeting-sequence "show" metrics.
--
-- (1) Let externally-booked Google Calendar events be imported as first-class
--     meeting rows: a stable dedup key (external_uid), a source tag, the raw
--     attendee emails (so an unmatched meeting can later create/link a contact),
--     and a manual sequence override.
-- (2) Allow a meeting with no contact yet (e.g. someone met in person who isn't
--     in the CRM) — so contact_id must be nullable.

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS external_uid TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'; -- manual | google_calendar
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS external_attendees TEXT[];
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS sequence_override INTEGER;

-- Imported meetings can be unlinked until a contact is attached.
ALTER TABLE meetings ALTER COLUMN contact_id DROP NOT NULL;

-- Dedup key for synced calendar events (one row per external event per user).
CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_external_uid
  ON meetings (user_id, external_uid)
  WHERE external_uid IS NOT NULL;
