-- Capacity Scheduling: User settings for daily capacity targets
-- Enables intelligent distribution of contacts across business days

-- ============================================
-- CAPACITY SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS capacity_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Daily targets
  target_per_day INTEGER DEFAULT 600,
  new_quota_per_day INTEGER DEFAULT 150,
  
  -- Scheduling window
  schedule_window_days INTEGER DEFAULT 20,
  
  -- Bloat threshold (when to trigger alerts)
  bloat_threshold INTEGER DEFAULT 800,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for single-user mode
ALTER TABLE capacity_settings DISABLE ROW LEVEL SECURITY;

-- Insert default settings for existing users
INSERT INTO capacity_settings (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Done!
SELECT 'Capacity scheduling settings table created!' as result;
