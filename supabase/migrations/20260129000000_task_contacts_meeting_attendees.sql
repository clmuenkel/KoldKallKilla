-- Batch B: Multi-contact task and meeting (5.4 + 5.3)
-- Junction tables only; no backfill. Primary contact stays in tasks.contact_id / meetings.contact_id.

-- ============================================
-- TASK_CONTACTS (additional contacts per task)
-- ============================================
CREATE TABLE IF NOT EXISTS task_contacts (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_task_contacts_contact_id ON task_contacts(contact_id);

-- ============================================
-- MEETING_ATTENDEES (additional attendees per meeting)
-- ============================================
CREATE TABLE IF NOT EXISTS meeting_attendees (
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_contact_id ON meeting_attendees(contact_id);
