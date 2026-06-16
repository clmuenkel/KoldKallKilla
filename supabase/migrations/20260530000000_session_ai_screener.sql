-- dialer_sessions was missing the ai_screener counter that the app code inserts
-- on every session create/update. The mismatch made every session insert fail
-- (PGRST204 "Could not find the 'ai_screener' column"), silently swallowed by a
-- non-critical try/catch — so NO dialer sessions were ever saved, which is why
-- "session time" showed 0 and "Recent Sessions" was empty.
ALTER TABLE dialer_sessions
  ADD COLUMN IF NOT EXISTS ai_screener INT NOT NULL DEFAULT 0;
