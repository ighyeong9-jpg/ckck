-- Check-In v2.0 Schema Migration
-- Run this in Supabase SQL Editor

-- defects - photos 컬럼 추가
ALTER TABLE defects ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

-- defects - sha256_hash 컬럼 추가
ALTER TABLE defects ADD COLUMN IF NOT EXISTS sha256_hash VARCHAR(64);

-- defects - updated_at 컬럼 추가
ALTER TABLE defects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- notifications - link 컬럼 추가
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500);

-- shares - is_active 컬럼 추가
ALTER TABLE shares ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- shares - view_count 컬럼 추가
ALTER TABLE shares ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- shares - updated_at 컬럼 추가
ALTER TABLE shares ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- profiles - company_name 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);

-- profiles - description 컬럼 추가 (company)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT;

-- profiles - specialty_tags 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty_tags JSONB DEFAULT '[]';

-- profiles - address 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- profiles - logo_url 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- profiles - portfolio_images 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_images JSONB DEFAULT '[]';

-- profiles - avg_verification_score 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_verification_score FLOAT DEFAULT 0;

-- profiles - total_projects 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_projects INTEGER DEFAULT 0;

-- profiles - avg_duration_days 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_duration_days INTEGER DEFAULT 0;

-- profiles - profile_token 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_token VARCHAR(32) UNIQUE;

-- profiles - is_public 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;


-- Indexes
CREATE INDEX IF NOT EXISTS idx_defects_project ON defects(project_id);
CREATE INDEX IF NOT EXISTS idx_defects_status ON defects(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(share_token);
CREATE INDEX IF NOT EXISTS idx_profiles_token ON profiles(profile_token);

-- RLS Policies
-- shares public read

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shares' AND policyname = 'shares_public_read') THEN
    CREATE POLICY shares_public_read ON shares FOR SELECT USING (is_active = true AND expires_at > now());
  END IF;
END $$;

-- profiles public read

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_public_read') THEN
    CREATE POLICY profiles_public_read ON profiles FOR SELECT USING (is_public = true);
  END IF;
END $$;

