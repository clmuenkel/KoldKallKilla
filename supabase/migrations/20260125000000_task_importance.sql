-- Add importance column to tasks table
-- Importance is a 1-10 scale where 1 is low and 10 is critical

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10);

-- Create index for sorting by importance
CREATE INDEX IF NOT EXISTS idx_tasks_importance ON tasks(importance DESC);

-- Done!
SELECT 'Task importance column added!' as result;
