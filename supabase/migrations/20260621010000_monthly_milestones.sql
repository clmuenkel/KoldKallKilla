-- Monthly business milestones (the 30-month ramp) + a closes target on user_targets.

CREATE TABLE IF NOT EXISTS monthly_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL,                       -- first day of the month
  target_active_clients INTEGER,
  target_closes INTEGER,
  target_arr NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_milestones_user_month
  ON monthly_milestones (user_id, month);

ALTER TABLE monthly_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own monthly_milestones" ON monthly_milestones;
CREATE POLICY "own monthly_milestones" ON monthly_milestones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Closes target for the monthly activity goal.
ALTER TABLE user_targets
  ADD COLUMN IF NOT EXISTS closes_target INTEGER;
