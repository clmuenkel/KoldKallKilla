-- Allow 'monthly' as a target_type (was daily/weekly only) so monthly activity
-- goals (closes, dials, etc.) can be stored.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
  WHERE conrelid = 'user_targets'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%target_type%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE user_targets DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE user_targets
  ADD CONSTRAINT user_targets_target_type_check
  CHECK (target_type IN ('daily', 'weekly', 'monthly'));
