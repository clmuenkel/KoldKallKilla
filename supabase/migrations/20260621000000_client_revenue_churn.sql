-- Foundation for goals/business-health tracking: client deal value + lifecycle.
-- A "won" contact is treated as a client. Active = stage='won' AND churned_at IS NULL.
-- Effective annual value = deal_value_annual if set, else the plan_tier price from
-- business_settings.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS plan_tier TEXT,                 -- 'good' | 'better' | 'best' | null
  ADD COLUMN IF NOT EXISTS deal_value_annual NUMERIC,      -- optional exact $/yr override
  ADD COLUMN IF NOT EXISTS became_client_at DATE,          -- when they became a paying client
  ADD COLUMN IF NOT EXISTS churned_at DATE;                -- when they churned (null = active)

CREATE INDEX IF NOT EXISTS idx_contacts_client
  ON contacts (user_id, stage, churned_at);

-- Per-user pricing config + the monthly close goal (the 3 tier prices Zad sets once).
CREATE TABLE IF NOT EXISTS business_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tier_good_annual   NUMERIC,
  tier_better_annual NUMERIC,
  tier_best_annual   NUMERIC,
  monthly_close_goal INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own business_settings" ON business_settings;
CREATE POLICY "own business_settings" ON business_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
