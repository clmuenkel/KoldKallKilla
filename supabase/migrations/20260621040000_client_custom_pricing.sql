-- Per-client custom pricing overrides (for clients that don't fit a tier, e.g.
-- the early clients with a high deposit + low monthly).
-- deal_value_monthly overrides the tier's monthly; deposit_paid is the one-time
-- deposit actually collected from this client.
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS deal_value_monthly NUMERIC,
  ADD COLUMN IF NOT EXISTS deposit_paid NUMERIC;
