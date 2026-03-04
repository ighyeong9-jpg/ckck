-- =============================================
-- 프로젝트 협업 시스템 (순환 참조 완전 제거 버전)
-- =============================================

-- 1. 이슈 테이블 생성
CREATE TABLE IF NOT EXISTS issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  issue_type TEXT DEFAULT 'OTHER' CHECK (issue_type IN ('DESIGN_CHANGE','DIMENSION_MISMATCH','MATERIAL_ISSUE','SAFETY','OTHER')),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  notify_roles TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_created_by ON issues(created_by);

-- 2. 프로젝트 멤버 테이블
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('OWNER','MANAGER','DESIGNER','TECHNICIAN','CLIENT')),
  invited_email TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- 3. 변경 요청 테이블
CREATE TABLE IF NOT EXISTS change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('COST','SCHEDULE','DESIGN','OTHER')),
  title TEXT NOT NULL,
  description TEXT,
  amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_change_requests_project ON change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);

-- 4. 이슈 코멘트 테이블
CREATE TABLE IF NOT EXISTS issue_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_user ON issue_comments(user_id);

-- 5. evidence_files 테이블 수정
DO $$
BEGIN
  -- uploaded_by 컬럼이 TEXT인 경우에만 UUID로 변경
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evidence_files'
    AND column_name = 'uploaded_by'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE evidence_files ALTER COLUMN uploaded_by TYPE UUID USING uploaded_by::uuid;
  END IF;
END $$;

ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS shared_to_client BOOLEAN DEFAULT FALSE;
ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES processes(id);

-- 6. RLS 활성화 및 기존 정책 제거
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거
DROP POLICY IF EXISTS "Users can view their own evidence files" ON evidence_files;
DROP POLICY IF EXISTS "Users can insert their own evidence files" ON evidence_files;
DROP POLICY IF EXISTS "Users can update their own evidence files" ON evidence_files;
DROP POLICY IF EXISTS "Users can delete their own evidence files" ON evidence_files;

DROP POLICY IF EXISTS "Users can view their own comparison pairs" ON comparison_pairs;
DROP POLICY IF EXISTS "Users can insert their own comparison pairs" ON comparison_pairs;
DROP POLICY IF EXISTS "Users can update their own comparison pairs" ON comparison_pairs;
DROP POLICY IF EXISTS "Users can delete their own comparison pairs" ON comparison_pairs;

-- 7. RLS 정책: project_members (projects만 참조)
CREATE POLICY "Members can view project members"
  ON project_members FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can invite members"
  ON project_members FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update members"
  ON project_members FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete members"
  ON project_members FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 8. RLS 정책: issues (projects만 참조)
CREATE POLICY "Members can view issues"
  ON issues FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create issues"
  ON issues FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update issues"
  ON issues FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete issues"
  ON issues FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 9. RLS 정책: change_requests
CREATE POLICY "Members can view change requests"
  ON change_requests FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create change requests"
  ON change_requests FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update change requests"
  ON change_requests FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete change requests"
  ON change_requests FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 10. RLS 정책: issue_comments
CREATE POLICY "Members can view comments"
  ON issue_comments FOR SELECT
  USING (
    issue_id IN (
      SELECT id FROM issues WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can create comments"
  ON issue_comments FOR INSERT
  WITH CHECK (
    issue_id IN (
      SELECT id FROM issues WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can update comments"
  ON issue_comments FOR UPDATE
  USING (
    issue_id IN (
      SELECT id FROM issues WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can delete comments"
  ON issue_comments FOR DELETE
  USING (
    issue_id IN (
      SELECT id FROM issues WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

-- 11. RLS 정책: evidence_files
CREATE POLICY "Members can view evidence files"
  ON evidence_files FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can upload evidence files"
  ON evidence_files FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update evidence files"
  ON evidence_files FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete evidence files"
  ON evidence_files FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 12. RLS 정책: comparison_pairs
CREATE POLICY "Members can view comparison pairs"
  ON comparison_pairs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert comparison pairs"
  ON comparison_pairs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update comparison pairs"
  ON comparison_pairs FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete comparison pairs"
  ON comparison_pairs FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 13. RLS 정책: processes
CREATE POLICY "Members can view processes"
  ON processes FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert processes"
  ON processes FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update processes"
  ON processes FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete processes"
  ON processes FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 14. updated_at 트리거
CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issue_comments_updated_at
  BEFORE UPDATE ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 15. 기존 프로젝트 마이그레이션 함수
CREATE OR REPLACE FUNCTION migrate_existing_projects_to_members()
RETURNS void AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, status, joined_at)
  SELECT id, user_id, 'OWNER', 'ACTIVE', created_at
  FROM projects
  WHERE user_id IS NOT NULL
  ON CONFLICT (project_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 16. 신규 프로젝트 자동 OWNER 등록
CREATE OR REPLACE FUNCTION add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, status, joined_at, invited_by)
  VALUES (NEW.id, NEW.user_id, 'OWNER', 'ACTIVE', NOW(), NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_add_project_owner ON projects;
CREATE TRIGGER auto_add_project_owner
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_owner();
