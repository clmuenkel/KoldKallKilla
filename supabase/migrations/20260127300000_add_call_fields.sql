-- Sprint 1: Add company_id, session_id to calls table
-- These fields enable linking calls to sessions and companies for analytics

-- Add company_id for company-level analytics
ALTER TABLE calls ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Add session_id to link calls to explicit dialer sessions
ALTER TABLE calls ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES dialer_sessions(id) ON DELETE SET NULL;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_calls_session_id ON calls(session_id);
CREATE INDEX IF NOT EXISTS idx_calls_company_id ON calls(company_id);

-- Index for same-day recall check - efficiently find all contacts called today
-- Uses started_at timestamp for range queries (e.g., WHERE started_at >= today)
CREATE INDEX IF NOT EXISTS idx_calls_user_started ON calls(user_id, started_at);

-- Index for quick contact lookup in same-day queries
CREATE INDEX IF NOT EXISTS idx_calls_contact_started ON calls(contact_id, started_at);

COMMENT ON COLUMN calls.company_id IS 'Company associated with this call (for analytics)';
COMMENT ON COLUMN calls.session_id IS 'Dialer session this call belongs to';
