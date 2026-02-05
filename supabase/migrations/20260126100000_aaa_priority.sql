-- Add AAA priority flag for high-value prospects
-- AAA contacts get visual distinction and priority sorting in dialer sessions

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_aaa BOOLEAN DEFAULT false;

-- Partial index for efficient AAA filtering (only indexes true values)
CREATE INDEX IF NOT EXISTS idx_contacts_is_aaa ON contacts(is_aaa) WHERE is_aaa = true;
