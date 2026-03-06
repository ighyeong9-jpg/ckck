-- ========================================
-- 누락된 테이블 생성 SQL (기존 삭제 후 재생성)
-- 체크인 프로젝트 완성을 위한 7개 테이블
-- ========================================

-- 기존 테이블 삭제 (CASCADE로 관련 정책/인덱스도 삭제)
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS share_codes CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS risk_history CASCADE;
DROP TABLE IF EXISTS evidence_packages CASCADE;
DROP TABLE IF EXISTS project_invites CASCADE;

-- ========================================
-- 테이블 생성
-- ========================================

-- 1. photos (사진 갤러리)
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  category TEXT,
  description TEXT,
  location TEXT,
  taken_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_project_id ON photos(project_id);
CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_taken_at ON photos(taken_at);

-- 2. certificates (준공 증명서)
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('completion', 'inspection', 'warranty', 'permit')),
  certificate_number TEXT,
  title TEXT NOT NULL,
  issued_date DATE NOT NULL,
  issued_by UUID REFERENCES profiles(id),
  file_url TEXT,
  status TEXT DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'revoked')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, certificate_number)
);

CREATE INDEX idx_certificates_project_id ON certificates(project_id);
CREATE INDEX idx_certificates_type ON certificates(certificate_type);

-- 3. share_codes (외부 공유 코드)
CREATE TABLE share_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  share_code TEXT NOT NULL UNIQUE,
  share_type TEXT DEFAULT 'read_only' CHECK (share_type IN ('read_only', 'comment', 'edit')),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_share_codes_code ON share_codes(share_code);
CREATE INDEX idx_share_codes_project_id ON share_codes(project_id);
CREATE INDEX idx_share_codes_active ON share_codes(is_active);

-- 4. activities (활동 로그)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  description TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_project_id ON activities(project_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);

-- 5. risk_history (리스크 이력)
CREATE TABLE risk_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  risk_score DECIMAL(5,2) NOT NULL,
  risk_grade TEXT CHECK (risk_grade IN ('A', 'B', 'C', 'D', 'F')),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  financial_risk DECIMAL(5,2),
  operational_risk DECIMAL(5,2),
  change_risk DECIMAL(5,2),
  factors JSONB,
  notes TEXT,
  calculated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_history_project_id ON risk_history(project_id);
CREATE INDEX idx_risk_history_created_at ON risk_history(created_at DESC);
CREATE INDEX idx_risk_history_grade ON risk_history(risk_grade);

-- 6. evidence_packages (증거 패키지)
CREATE TABLE evidence_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  package_type TEXT DEFAULT 'standard' CHECK (package_type IN ('standard', 'legal', 'audit', 'dispute')),
  merkle_root TEXT,
  verification_code TEXT UNIQUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sealed', 'verified')),
  sealed_at TIMESTAMPTZ,
  sealed_by UUID REFERENCES profiles(id),
  file_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_packages_project_id ON evidence_packages(project_id);
CREATE INDEX idx_evidence_packages_verification_code ON evidence_packages(verification_code);
CREATE INDEX idx_evidence_packages_status ON evidence_packages(status);

-- 7. project_invites (프로젝트 초대)
CREATE TABLE project_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'contractor', 'client', 'viewer')),
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  message TEXT,
  UNIQUE(project_id, email)
);

CREATE INDEX idx_project_invites_project_id ON project_invites(project_id);
CREATE INDEX idx_project_invites_email ON project_invites(email);
CREATE INDEX idx_project_invites_code ON project_invites(invite_code);
CREATE INDEX idx_project_invites_status ON project_invites(status);

-- ========================================
-- RLS (Row Level Security) 정책
-- ========================================

-- photos RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photos_select_policy"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = photos.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "photos_insert_policy"
  ON photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = photos.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- certificates RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificates_select_policy"
  ON certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = certificates.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- share_codes RLS
ALTER TABLE share_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_codes_select_policy"
  ON share_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = share_codes.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- activities RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select_policy"
  ON activities FOR SELECT
  USING (
    project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = activities.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- risk_history RLS
ALTER TABLE risk_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_history_select_policy"
  ON risk_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = risk_history.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- evidence_packages RLS
ALTER TABLE evidence_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_packages_select_policy"
  ON evidence_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = evidence_packages.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- project_invites RLS
ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_invites_select_by_project"
  ON project_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_invites.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "project_invites_select_by_email"
  ON project_invites FOR SELECT
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- ========================================
-- 완료 확인
-- ========================================

SELECT
  'photos' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'photos'
UNION ALL
SELECT 'certificates', COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'certificates'
UNION ALL
SELECT 'share_codes', COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'share_codes'
UNION ALL
SELECT 'activities', COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activities'
UNION ALL
SELECT 'risk_history', COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'risk_history'
UNION ALL
SELECT 'evidence_packages', COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'evidence_packages'
UNION ALL
SELECT 'project_invites', COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_invites'
ORDER BY table_name;
