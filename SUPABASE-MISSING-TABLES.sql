-- Missing tables for Check-In application
-- Run this in Supabase SQL Editor

-- 1. warranty_tracking 테이블
CREATE TABLE IF NOT EXISTS warranty_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  process_name TEXT NOT NULL,
  warranty_years INTEGER NOT NULL,
  completed_date DATE NOT NULL,
  expires_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE warranty_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warranty_tracking_policy" ON warranty_tracking
  FOR ALL
  USING (auth.uid() = user_id);

-- 2. quote_analyses 테이블
CREATE TABLE IF NOT EXISTS quote_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  original_amount BIGINT,
  analyzed_amount BIGINT,
  savings_amount BIGINT,
  analysis_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quote_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_analyses_policy" ON quote_analyses
  FOR ALL
  USING (auth.uid() = user_id);

-- 3. issues 테이블
CREATE TABLE IF NOT EXISTS issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  severity TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issues_policy" ON issues
  FOR ALL
  USING (auth.uid() = user_id);

-- 4. user_settings 테이블
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  display_name TEXT,
  role TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_policy" ON user_settings
  FOR ALL
  USING (auth.uid() = user_id);
