-- Unified Notes System Migration
-- Consolidates call notes and profile notes into a single notes table

-- Add source column to distinguish manual vs call notes
-- Default to 'manual' for existing notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add check constraint for source values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notes_source_check'
  ) THEN
    ALTER TABLE notes ADD CONSTRAINT notes_source_check 
      CHECK (source IN ('manual', 'call'));
  END IF;
END $$;

-- Add call timestamp for notes taken during calls (e.g., "01:23" or "01:23:45")
ALTER TABLE notes ADD COLUMN IF NOT EXISTS call_timestamp TEXT;

-- Index for efficient grouped queries by call
CREATE INDEX IF NOT EXISTS idx_notes_call_id ON notes(call_id);

-- Index for filtering by contact and source type
CREATE INDEX IF NOT EXISTS idx_notes_contact_source ON notes(contact_id, source);

-- Partial index for quickly finding pinned notes
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(contact_id, is_pinned) WHERE is_pinned = true;

-- Index for recent notes queries (ordered by created_at)
CREATE INDEX IF NOT EXISTS idx_notes_contact_created ON notes(contact_id, created_at DESC);

-- Done
SELECT 'Unified notes schema migration complete' as result;
