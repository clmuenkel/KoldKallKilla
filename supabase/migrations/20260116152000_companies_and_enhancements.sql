-- PezCRM Schema Enhancement: Companies, Persona Sets, and Referrals
-- Run this migration in your Supabase SQL Editor after 001_initial_schema.sql

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  employee_count INTEGER,
  employee_range TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  timezone TEXT,
  website TEXT,
  linkedin_url TEXT,
  annual_revenue TEXT,
  intent_score INTEGER,
  intent_topics TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(user_id, industry);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(user_id, name);

-- ============================================
-- MODIFY CONTACTS TABLE
-- ============================================
-- Add company reference
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Add direct referral fields (for "X told me to call you" context)
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS direct_referral_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS direct_referral_note TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_referral ON contacts(direct_referral_contact_id);

-- ============================================
-- PERSONA SETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS persona_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  titles TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  employee_ranges TEXT[] DEFAULT '{}',
  include_intent_data BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persona_sets_user_id ON persona_sets(user_id);

-- ============================================
-- MODIFY CALLS TABLE
-- ============================================
-- Add timestamped notes support for notes during calls
-- Format: [{"time": "00:32", "note": "Interested in Q2"}, ...]
ALTER TABLE calls 
  ADD COLUMN IF NOT EXISTS timestamped_notes JSONB DEFAULT '[]';

-- ============================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================

-- Companies RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companies" ON companies 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies" ON companies 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies" ON companies 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies" ON companies 
  FOR DELETE USING (auth.uid() = user_id);

-- Persona Sets RLS
ALTER TABLE persona_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own persona sets" ON persona_sets 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own persona sets" ON persona_sets 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own persona sets" ON persona_sets 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own persona sets" ON persona_sets 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION: Get company contact count
-- ============================================
CREATE OR REPLACE FUNCTION get_company_contact_count(company_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM contacts WHERE company_id = company_uuid;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- HELPER FUNCTION: Get company last contacted date
-- ============================================
CREATE OR REPLACE FUNCTION get_company_last_contacted(company_uuid UUID)
RETURNS TIMESTAMPTZ AS $$
  SELECT MAX(c.last_contacted_at) 
  FROM contacts c 
  WHERE c.company_id = company_uuid;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- TRIGGER: Update company updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_company_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_company_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_company_updated_at();

-- ============================================
-- TRIGGER: Update persona_sets updated_at
-- ============================================
CREATE TRIGGER trigger_persona_sets_updated_at
  BEFORE UPDATE ON persona_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_company_updated_at();
