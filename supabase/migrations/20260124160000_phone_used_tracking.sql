-- Track which phone number was used for each call
-- Allows tracking success rates for mobile vs office numbers

ALTER TABLE calls ADD COLUMN IF NOT EXISTS phone_used TEXT;

-- Add comment for documentation
COMMENT ON COLUMN calls.phone_used IS 'Which phone number was used: mobile or office';

-- Done!
SELECT 'Added phone_used column to calls table' as result;
