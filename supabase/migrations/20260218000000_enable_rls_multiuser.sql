-- Enable RLS and create policies for multi-user support
-- This migration is self-contained: it creates any missing tables before enabling RLS.
-- Safe to run multiple times (idempotent).

-- ============================================
-- PRE-FLIGHT: Create tables that may not exist yet
-- (from migrations that may not have been applied)
-- ============================================

-- meetings table (from 20260124155400)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_company_wide BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  location TEXT,
  meeting_link TEXT,
  status TEXT DEFAULT 'scheduled',
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT FALSE,
  outcome TEXT,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_contact_id ON meetings(contact_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON meetings(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(user_id, status);

-- meeting_notes table (from 20260124170000)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_action_item BOOLEAN DEFAULT FALSE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting_id ON meeting_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_user_id ON meeting_notes(user_id);

-- dialer_drafts table (from 20260125100000)
CREATE TABLE IF NOT EXISTS dialer_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_dialer_drafts_user_id ON dialer_drafts(user_id);

-- user_targets table (from 20260125200000)
CREATE TABLE IF NOT EXISTS user_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('daily', 'weekly')),
  calls_target INT NOT NULL DEFAULT 50,
  connected_target INT NOT NULL DEFAULT 15,
  meetings_target INT NOT NULL DEFAULT 3,
  voicemails_target INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_type)
);
CREATE INDEX IF NOT EXISTS idx_user_targets_user_id ON user_targets(user_id);

-- dialer_sessions table (from 20260125200000 + 20260127300001)
CREATE TABLE IF NOT EXISTS dialer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INT GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INT
      ELSE NULL
    END
  ) STORED,
  total_calls INT NOT NULL DEFAULT 0,
  connected_calls INT NOT NULL DEFAULT 0,
  meetings_booked INT NOT NULL DEFAULT 0,
  voicemails INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  no_answers INT NOT NULL DEFAULT 0,
  gatekeepers INT NOT NULL DEFAULT 0,
  wrong_numbers INT NOT NULL DEFAULT 0,
  busy INT NOT NULL DEFAULT 0,
  total_talk_time_seconds INT NOT NULL DEFAULT 0,
  avg_call_duration_seconds INT GENERATED ALWAYS AS (
    CASE
      WHEN connected_calls > 0
      THEN total_talk_time_seconds / connected_calls
      ELSE 0
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dialer_sessions_user_id ON dialer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dialer_sessions_started_at ON dialer_sessions(started_at DESC);
-- Extra columns added in 20260127300001
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS first_pickup_at TIMESTAMPTZ;
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS first_meeting_set_at TIMESTAMPTZ;
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ[] DEFAULT '{}';
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ[] DEFAULT '{}';
ALTER TABLE dialer_sessions ADD COLUMN IF NOT EXISTS total_pause_duration_seconds INTEGER DEFAULT 0;

-- dialer_pool_events table (from 20260126200000)
CREATE TABLE IF NOT EXISTS dialer_pool_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'contact')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  entity_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('paused', 'unpaused', 'deleted')),
  paused_until DATE,
  duration_months INTEGER,
  reason_code TEXT,
  reason_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dialer_pool_events_user ON dialer_pool_events(user_id, created_at DESC);

-- capacity_settings table (from 20260127000000)
CREATE TABLE IF NOT EXISTS capacity_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  target_per_day INTEGER DEFAULT 600,
  new_quota_per_day INTEGER DEFAULT 150,
  schedule_window_days INTEGER DEFAULT 20,
  bloat_threshold INTEGER DEFAULT 800,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- task_contacts + meeting_attendees (from 20260129000000)
CREATE TABLE IF NOT EXISTS task_contacts (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_task_contacts_contact_id ON task_contacts(contact_id);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_contact_id ON meeting_attendees(contact_id);

-- ============================================
-- STEP 1: Enable RLS on ALL tables
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialer_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialer_pool_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop existing policies (avoid duplicates)
-- ============================================
-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- contacts
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;
-- calls
DROP POLICY IF EXISTS "Users can view own calls" ON calls;
DROP POLICY IF EXISTS "Users can insert own calls" ON calls;
DROP POLICY IF EXISTS "Users can update own calls" ON calls;
DROP POLICY IF EXISTS "Users can delete own calls" ON calls;
-- tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
-- notes
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
-- email_templates
DROP POLICY IF EXISTS "Users can view own templates" ON email_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON email_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON email_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON email_templates;
-- emails
DROP POLICY IF EXISTS "Users can view own emails" ON emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON emails;
DROP POLICY IF EXISTS "Users can update own emails" ON emails;
DROP POLICY IF EXISTS "Users can delete own emails" ON emails;
-- call_lists
DROP POLICY IF EXISTS "Users can view own call lists" ON call_lists;
DROP POLICY IF EXISTS "Users can insert own call lists" ON call_lists;
DROP POLICY IF EXISTS "Users can update own call lists" ON call_lists;
DROP POLICY IF EXISTS "Users can delete own call lists" ON call_lists;
-- call_list_items
DROP POLICY IF EXISTS "Users can view own call list items" ON call_list_items;
DROP POLICY IF EXISTS "Users can insert own call list items" ON call_list_items;
DROP POLICY IF EXISTS "Users can update own call list items" ON call_list_items;
DROP POLICY IF EXISTS "Users can delete own call list items" ON call_list_items;
-- activity_log
DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
DROP POLICY IF EXISTS "Users can insert own activity" ON activity_log;
-- call_scripts
DROP POLICY IF EXISTS "Users can view own scripts" ON call_scripts;
DROP POLICY IF EXISTS "Users can insert own scripts" ON call_scripts;
DROP POLICY IF EXISTS "Users can update own scripts" ON call_scripts;
DROP POLICY IF EXISTS "Users can delete own scripts" ON call_scripts;
-- user_settings
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

-- ============================================
-- STEP 3: Create policies for ALL tables
-- ============================================

-- profiles (keyed on id, not user_id)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- contacts
CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "contacts_delete" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- calls
CREATE POLICY "calls_select" ON calls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calls_insert" ON calls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calls_update" ON calls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "calls_delete" ON calls FOR DELETE USING (auth.uid() = user_id);

-- tasks
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- notes
CREATE POLICY "notes_select" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete" ON notes FOR DELETE USING (auth.uid() = user_id);

-- email_templates
CREATE POLICY "email_templates_select" ON email_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "email_templates_insert" ON email_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "email_templates_update" ON email_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "email_templates_delete" ON email_templates FOR DELETE USING (auth.uid() = user_id);

-- emails
CREATE POLICY "emails_select" ON emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "emails_insert" ON emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "emails_update" ON emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "emails_delete" ON emails FOR DELETE USING (auth.uid() = user_id);

-- call_lists
CREATE POLICY "call_lists_select" ON call_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "call_lists_insert" ON call_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "call_lists_update" ON call_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "call_lists_delete" ON call_lists FOR DELETE USING (auth.uid() = user_id);

-- call_list_items (through parent call_list)
CREATE POLICY "call_list_items_select" ON call_list_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM call_lists WHERE call_lists.id = call_list_items.call_list_id AND call_lists.user_id = auth.uid()));
CREATE POLICY "call_list_items_insert" ON call_list_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM call_lists WHERE call_lists.id = call_list_items.call_list_id AND call_lists.user_id = auth.uid()));
CREATE POLICY "call_list_items_update" ON call_list_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM call_lists WHERE call_lists.id = call_list_items.call_list_id AND call_lists.user_id = auth.uid()));
CREATE POLICY "call_list_items_delete" ON call_list_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM call_lists WHERE call_lists.id = call_list_items.call_list_id AND call_lists.user_id = auth.uid()));

-- activity_log
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- call_scripts
CREATE POLICY "call_scripts_select" ON call_scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "call_scripts_insert" ON call_scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "call_scripts_update" ON call_scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "call_scripts_delete" ON call_scripts FOR DELETE USING (auth.uid() = user_id);

-- user_settings (keyed on user_id which is the PK)
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- companies
CREATE POLICY "companies_select" ON companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "companies_insert" ON companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "companies_update" ON companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "companies_delete" ON companies FOR DELETE USING (auth.uid() = user_id);

-- persona_sets
CREATE POLICY "persona_sets_select" ON persona_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "persona_sets_insert" ON persona_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "persona_sets_update" ON persona_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "persona_sets_delete" ON persona_sets FOR DELETE USING (auth.uid() = user_id);

-- meetings
CREATE POLICY "meetings_select" ON meetings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meetings_insert" ON meetings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meetings_update" ON meetings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meetings_delete" ON meetings FOR DELETE USING (auth.uid() = user_id);

-- meeting_notes
CREATE POLICY "meeting_notes_select" ON meeting_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meeting_notes_insert" ON meeting_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meeting_notes_update" ON meeting_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meeting_notes_delete" ON meeting_notes FOR DELETE USING (auth.uid() = user_id);

-- meeting_attendees (through parent meeting)
CREATE POLICY "meeting_attendees_select" ON meeting_attendees FOR SELECT
  USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = meeting_attendees.meeting_id AND meetings.user_id = auth.uid()));
CREATE POLICY "meeting_attendees_insert" ON meeting_attendees FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = meeting_attendees.meeting_id AND meetings.user_id = auth.uid()));
CREATE POLICY "meeting_attendees_delete" ON meeting_attendees FOR DELETE
  USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = meeting_attendees.meeting_id AND meetings.user_id = auth.uid()));

-- task_contacts (through parent task)
CREATE POLICY "task_contacts_select" ON task_contacts FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_contacts.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "task_contacts_insert" ON task_contacts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_contacts.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "task_contacts_delete" ON task_contacts FOR DELETE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_contacts.task_id AND tasks.user_id = auth.uid()));

-- user_targets
CREATE POLICY "user_targets_select" ON user_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_targets_insert" ON user_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_targets_update" ON user_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_targets_delete" ON user_targets FOR DELETE USING (auth.uid() = user_id);

-- dialer_sessions
CREATE POLICY "dialer_sessions_select" ON dialer_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dialer_sessions_insert" ON dialer_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dialer_sessions_update" ON dialer_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "dialer_sessions_delete" ON dialer_sessions FOR DELETE USING (auth.uid() = user_id);

-- dialer_drafts
CREATE POLICY "dialer_drafts_select" ON dialer_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dialer_drafts_insert" ON dialer_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dialer_drafts_update" ON dialer_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "dialer_drafts_delete" ON dialer_drafts FOR DELETE USING (auth.uid() = user_id);

-- dialer_pool_events
CREATE POLICY "dialer_pool_events_select" ON dialer_pool_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dialer_pool_events_insert" ON dialer_pool_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- capacity_settings (keyed on user_id which is the PK)
CREATE POLICY "capacity_settings_select" ON capacity_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "capacity_settings_insert" ON capacity_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "capacity_settings_update" ON capacity_settings FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- STEP 4: Auto-create profile + settings on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO public.user_targets (user_id, target_type, calls_target, connected_target, meetings_target, voicemails_target)
  VALUES (NEW.id, 'daily', 50, 15, 3, 20);

  INSERT INTO public.user_targets (user_id, target_type, calls_target, connected_target, meetings_target, voicemails_target)
  VALUES (NEW.id, 'weekly', 250, 75, 15, 100);

  INSERT INTO public.capacity_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Done!
SELECT 'RLS enabled for all tables, policies created, signup trigger updated!' as result;
