-- PezCRM Initial Schema
-- Run this migration in your Supabase SQL Editor

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  title TEXT,
  calendar_link TEXT,
  email_signature TEXT,
  daily_call_goal INTEGER DEFAULT 50,
  daily_email_goal INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Apollo reference
  apollo_id TEXT,
  enrichment_status TEXT DEFAULT 'pending',
  enriched_at TIMESTAMPTZ,
  
  -- Person info
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  linkedin_url TEXT,
  title TEXT,
  seniority TEXT,
  department TEXT,
  
  -- Company info
  company_name TEXT,
  company_domain TEXT,
  company_linkedin TEXT,
  industry TEXT,
  industry_code TEXT,
  employee_count INTEGER,
  employee_range TEXT,
  annual_revenue TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  
  -- CRM fields
  stage TEXT DEFAULT 'fresh',
  status TEXT DEFAULT 'active',
  source TEXT,
  source_list TEXT,
  lead_score INTEGER DEFAULT 0,
  
  -- Qualification (BANT)
  has_budget BOOLEAN DEFAULT FALSE,
  is_authority BOOLEAN DEFAULT FALSE,
  has_need BOOLEAN DEFAULT FALSE,
  has_timeline BOOLEAN DEFAULT FALSE,
  
  -- Tags
  tags TEXT[] DEFAULT '{}',
  
  -- Tracking
  last_contacted_at TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,
  total_calls INTEGER DEFAULT 0,
  total_emails INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_next_follow_up ON contacts(user_id, next_follow_up);
CREATE INDEX IF NOT EXISTS idx_contacts_apollo_id ON contacts(apollo_id);

-- ============================================
-- CALLS
-- ============================================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  outcome TEXT NOT NULL,
  disposition TEXT,
  notes TEXT,
  tags_applied TEXT[] DEFAULT '{}',
  
  confirmed_budget BOOLEAN,
  confirmed_authority BOOLEAN,
  confirmed_need BOOLEAN,
  confirmed_timeline BOOLEAN,
  
  follow_up_date TIMESTAMPTZ,
  follow_up_task_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_contact_id ON calls(contact_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(user_id, started_at);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'follow_up',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  
  due_date TIMESTAMPTZ,
  due_time TIME,
  reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);

-- Add foreign key for follow_up_task_id in calls
ALTER TABLE calls ADD CONSTRAINT fk_calls_follow_up_task
  FOREIGN KEY (follow_up_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- ============================================
-- NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes(contact_id);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  category TEXT,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  
  use_count INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);

-- ============================================
-- EMAILS (composed/sent)
-- ============================================
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON emails(contact_id);

-- ============================================
-- CALL LISTS
-- ============================================
CREATE TABLE IF NOT EXISTS call_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  filter_stages TEXT[] DEFAULT '{}',
  filter_tags TEXT[] DEFAULT '{}',
  filter_industries TEXT[] DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_lists_user_id ON call_lists(user_id);

-- ============================================
-- CALL LIST ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS call_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_list_id UUID NOT NULL REFERENCES call_lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  
  called_at TIMESTAMPTZ,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_list_items_list ON call_list_items(call_list_id, position);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB DEFAULT '{}',
  summary TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_contact ON activity_log(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC);

-- ============================================
-- CALL SCRIPTS
-- ============================================
CREATE TABLE IF NOT EXISTS call_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  industry TEXT,
  
  opener TEXT,
  value_prop TEXT,
  qualifying_questions TEXT[] DEFAULT '{}',
  objection_handlers JSONB DEFAULT '{}',
  close TEXT,
  
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_scripts_user_id ON call_scripts(user_id);

-- ============================================
-- USER SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  apollo_api_key TEXT,
  
  default_call_script_id UUID REFERENCES call_scripts(id) ON DELETE SET NULL,
  default_email_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  
  reminder_email BOOLEAN DEFAULT TRUE,
  reminder_browser BOOLEAN DEFAULT TRUE,
  reminder_minutes_before INTEGER DEFAULT 15,
  
  theme TEXT DEFAULT 'light',
  timezone TEXT DEFAULT 'America/New_York',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  
  work_start_time TIME DEFAULT '09:00',
  work_end_time TIME DEFAULT '17:00',
  work_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
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

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Contacts policies
CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- Calls policies
CREATE POLICY "Users can view own calls" ON calls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calls" ON calls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calls" ON calls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calls" ON calls FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

-- Email templates policies
CREATE POLICY "Users can view own templates" ON email_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON email_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON email_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON email_templates FOR DELETE USING (auth.uid() = user_id);

-- Emails policies
CREATE POLICY "Users can view own emails" ON emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emails" ON emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emails" ON emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emails" ON emails FOR DELETE USING (auth.uid() = user_id);

-- Call lists policies
CREATE POLICY "Users can view own call lists" ON call_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own call lists" ON call_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own call lists" ON call_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own call lists" ON call_lists FOR DELETE USING (auth.uid() = user_id);

-- Call list items policies (through call_lists)
CREATE POLICY "Users can view own call list items" ON call_list_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM call_lists WHERE call_lists.id = call_list_items.call_list_id AND call_lists.user_id = auth.uid()));
CREATE POLICY "Users can insert own call list items" ON call_list_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM call_lists WHERE call_lists.id = call_list_items.call_list_id AND call_lists.user_id = auth.uid()));
CREATE POLICY "Users can update own call list items" ON call_list_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM call_lists WHERE call_lists.id = call_list_items.call_list_id AND call_lists.user_id = auth.uid()));
CREATE POLICY "Users can delete own call list items" ON call_list_items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM call_lists WHERE call_lists.id = call_list_items.call_list_id AND call_lists.user_id = auth.uid()));

-- Activity log policies
CREATE POLICY "Users can view own activity" ON activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Call scripts policies
CREATE POLICY "Users can view own scripts" ON call_scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scripts" ON call_scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scripts" ON call_scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scripts" ON call_scripts FOR DELETE USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on signup
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_scripts_updated_at BEFORE UPDATE ON call_scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DEFAULT EMAIL TEMPLATES (inserted per user via trigger or manually)
-- ============================================
-- These will be created when user first accesses templates
