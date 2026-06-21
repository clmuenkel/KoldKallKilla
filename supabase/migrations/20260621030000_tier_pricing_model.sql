-- Real pricing model: deposit (one-time) + monthly (recurring) + buyout (one-time)
-- per tier. ARR per client = 12 * monthly (recurring); deposit is one-time cash.
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS tier_good_deposit   NUMERIC,
  ADD COLUMN IF NOT EXISTS tier_good_monthly   NUMERIC,
  ADD COLUMN IF NOT EXISTS tier_good_buyout    NUMERIC,
  ADD COLUMN IF NOT EXISTS tier_better_deposit NUMERIC,
  ADD COLUMN IF NOT EXISTS tier_better_monthly NUMERIC,
  ADD COLUMN IF NOT EXISTS tier_better_buyout  NUMERIC,
  ADD COLUMN IF NOT EXISTS tier_best_deposit   NUMERIC,
  ADD COLUMN IF NOT EXISTS tier_best_monthly   NUMERIC,
  ADD COLUMN IF NOT EXISTS tier_best_buyout    NUMERIC;

-- Legacy flat-annual columns are superseded by 12*monthly; drop them.
ALTER TABLE business_settings
  DROP COLUMN IF EXISTS tier_good_annual,
  DROP COLUMN IF EXISTS tier_better_annual,
  DROP COLUMN IF EXISTS tier_best_annual;
