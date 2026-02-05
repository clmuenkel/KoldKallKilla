-- Sprint 1: Add event timestamps to dialer_sessions table
-- Track first pickup, first meeting set, and pause/resume events

-- Add first_pickup_at - timestamp of first connected call in session
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS first_pickup_at TIMESTAMPTZ;

-- Add first_meeting_set_at - timestamp when first meeting was booked in session
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS first_meeting_set_at TIMESTAMPTZ;

-- Add paused_at array - track all pause events
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ[] DEFAULT '{}';

-- Add resumed_at array - track all resume events
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ[] DEFAULT '{}';

-- Add total_pause_duration_seconds - computed from pause/resume pairs
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS total_pause_duration_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN dialer_sessions.first_pickup_at IS 'Timestamp of first connected call in this session';
COMMENT ON COLUMN dialer_sessions.first_meeting_set_at IS 'Timestamp when first meeting was booked in this session';
COMMENT ON COLUMN dialer_sessions.paused_at IS 'Array of timestamps when session was paused';
COMMENT ON COLUMN dialer_sessions.resumed_at IS 'Array of timestamps when session was resumed';
COMMENT ON COLUMN dialer_sessions.total_pause_duration_seconds IS 'Total time spent paused (computed from pause/resume pairs)';
