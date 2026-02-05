-- Add cadence scheduling fields to contacts table
-- Enables call frequency management to avoid over-calling contacts

-- next_call_date: when this contact can be called next (null = never called, can call anytime)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_call_date DATE;

-- cadence_days: custom cadence override for this contact (null = use default of 2-3 business days)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS cadence_days INTEGER;

-- dialer_status: controls whether contact appears in dialer queue
-- Values: 'active' (default), 'paused' (temporary hold), 'exhausted' (max attempts reached), 'converted' (meeting booked/won)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dialer_status TEXT DEFAULT 'active';

-- dialer_paused_until: for "not interested" contacts, auto-resume after this date
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dialer_paused_until DATE;

-- Add indexes for efficient filtering in dialer queries
CREATE INDEX IF NOT EXISTS idx_contacts_next_call_date ON contacts(next_call_date);
CREATE INDEX IF NOT EXISTS idx_contacts_dialer_status ON contacts(dialer_status);
CREATE INDEX IF NOT EXISTS idx_contacts_dialer_paused_until ON contacts(dialer_paused_until);

-- Composite index for the most common dialer query pattern
CREATE INDEX IF NOT EXISTS idx_contacts_dialer_queue ON contacts(dialer_status, next_call_date, total_calls);
