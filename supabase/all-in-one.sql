-- ========================================
-- Check-In Production Database - ALL IN ONE
-- Supabase SQL Editor에서 한 번에 실행
-- ========================================


-- ========================================
-- PART 1: SCHEMA (테이블, 인덱스, 함수)
-- ========================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. CORE TABLES
-- ========================================

-- 사용자 프로필
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'contractor' CHECK (role IN ('admin', 'contractor', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로젝트
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  industry TEXT NOT NULL,
  address TEXT,
  client_name TEXT,
  client_phone TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  risk_score DECIMAL(5,2) DEFAULT 0,
  risk_grade TEXT CHECK (risk_grade IN ('A', 'B', 'C', 'D', 'F')),
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'diagnosis', 'in_progress', 'completed', 'disputed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로젝트 멤버
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'contractor', 'client', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);

-- 진단 응답 (사전점검)
CREATE TABLE diagnostic_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('need_check', 'recommend_fix', 'confirmed')),
  note TEXT,
  evidence_urls TEXT[],
  recorded_by UUID REFERENCES profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 필수 공정
CREATE TABLE mandatory_processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  process_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  evidence_urls TEXT[]
);

-- 운영 제약사항
CREATE TABLE operational_constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  constraint_type TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_weight DECIMAL(3,2) DEFAULT 1.0
);

-- 변경 승인 (Change Order)
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  change_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT NOT NULL,
  cost_impact DECIMAL(12,2),
  schedule_impact_days INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 작업 범위 (Scope of Work)
CREATE TABLE scope_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity DECIMAL(10,2),
  unit TEXT,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  notes TEXT
);

-- 견적서
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL UNIQUE,
  total_amount DECIMAL(12,2) NOT NULL,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 견적 항목
CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity DECIMAL(10,2),
  unit TEXT,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2)
);

-- 결제 (10/40/40/10)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_stage TEXT NOT NULL CHECK (payment_stage IN ('contract', 'mid1', 'mid2', 'final')),
  percentage INTEGER NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 준수 점검
CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL,
  item_code TEXT NOT NULL,
  is_compliant BOOLEAN,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES profiles(id)
);

-- 준수 증빙
CREATE TABLE compliance_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compliance_check_id UUID NOT NULL REFERENCES compliance_checks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 하자 (Defects)
CREATE TABLE defects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved', 'closed')),
  location TEXT,
  reported_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 하자 업데이트
CREATE TABLE defect_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 파일 (GPS + Timestamp + SHA-256)
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),
  timestamp TIMESTAMPTZ NOT NULL,
  hash_sha256 TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 감사 로그
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 보고서
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('pre_contract', 'progress', 'completion', 'dispute')),
  file_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id)
);

-- 공유 (QR + 마스킹)
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  share_url TEXT NOT NULL,
  masked_fields TEXT[],
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 특약 사항
CREATE TABLE special_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  term_text TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 타임라인 이벤트
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 서비스 결제 (유료 플랜)
CREATE TABLE service_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 읽음 확인 (양방향)
CREATE TABLE read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  reader_id UUID NOT NULL REFERENCES profiles(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_type, document_id, reader_id)
);

-- ========================================
-- 2. INDEXES
-- ========================================

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_diagnostic_responses_project ON diagnostic_responses(project_id);
CREATE INDEX idx_change_orders_project ON change_orders(project_id);
CREATE INDEX idx_defects_project ON defects(project_id);
CREATE INDEX idx_files_project ON files(project_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_read_receipts_project ON read_receipts(project_id, reader_id);

-- ========================================
-- 3. FUNCTIONS & TRIGGERS
-- ========================================

-- 감사 로그 트리거 함수
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 감사 로그 트리거 적용
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_diagnostic_responses AFTER INSERT OR UPDATE OR DELETE ON diagnostic_responses
  FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_change_orders AFTER INSERT OR UPDATE OR DELETE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_defects AFTER INSERT OR UPDATE OR DELETE ON defects
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- 리스크 점수 재계산 함수 (특허 알고리즘)
CREATE OR REPLACE FUNCTION recalculate_risk_score(p_id UUID)
RETURNS VOID AS $$
DECLARE
  fp_count INTEGER;
  oc_count INTEGER;
  ch_count INTEGER;
  wf DECIMAL := 0.4;
  wo DECIMAL := 0.3;
  wc DECIMAL := 0.3;
  risk_score DECIMAL;
  risk_grade TEXT;
BEGIN
  -- Fp: 필수 공정 미완료 수
  SELECT COUNT(*) INTO fp_count
  FROM mandatory_processes
  WHERE project_id = p_id AND is_completed = FALSE;

  -- Oc: 운영 제약사항 수 (가중 평균)
  SELECT COALESCE(SUM(risk_weight), 0) INTO oc_count
  FROM operational_constraints
  WHERE project_id = p_id;

  -- Ch: 변경 승인 수
  SELECT COUNT(*) INTO ch_count
  FROM change_orders
  WHERE project_id = p_id AND status = 'approved';

  -- R = Fp×Wf + Oc×Wo + Ch×Wc
  risk_score := (fp_count * wf) + (oc_count * wo) + (ch_count * wc);

  -- 등급 산정
  IF risk_score >= 8 THEN risk_grade := 'F';
  ELSIF risk_score >= 6 THEN risk_grade := 'D';
  ELSIF risk_score >= 4 THEN risk_grade := 'C';
  ELSIF risk_score >= 2 THEN risk_grade := 'B';
  ELSE risk_grade := 'A';
  END IF;

  -- 업데이트
  UPDATE projects
  SET risk_score = risk_score, risk_grade = risk_grade, updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- PART 2: ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandatory_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;

-- Profiles: 본인만 조회/수정
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects: 소유자 + 멤버만 접근
CREATE POLICY "Project members can view" ON projects FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
  );
CREATE POLICY "Project owner can update" ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Project Members: 프로젝트 소유자만 관리
CREATE POLICY "Project members can view members" ON project_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()) OR
    user_id = auth.uid()
  );
CREATE POLICY "Project owner can manage members" ON project_members FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()));

-- Diagnostic Responses: 프로젝트 멤버만
CREATE POLICY "Project members can view diagnostics" ON diagnostic_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = diagnostic_responses.project_id AND user_id = auth.uid()));
CREATE POLICY "Project members can manage diagnostics" ON diagnostic_responses FOR ALL
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = diagnostic_responses.project_id AND user_id = auth.uid()));

-- Change Orders: 프로젝트 멤버만
CREATE POLICY "Project members can view changes" ON change_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = change_orders.project_id AND user_id = auth.uid()));
CREATE POLICY "Project members can create changes" ON change_orders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM project_members WHERE project_id = change_orders.project_id AND user_id = auth.uid()));

-- Defects: 프로젝트 멤버만
CREATE POLICY "Project members can view defects" ON defects FOR SELECT
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = defects.project_id AND user_id = auth.uid()));
CREATE POLICY "Project members can manage defects" ON defects FOR ALL
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = defects.project_id AND user_id = auth.uid()));

-- Files: 프로젝트 멤버만
CREATE POLICY "Project members can view files" ON files FOR SELECT
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = files.project_id AND user_id = auth.uid()));
CREATE POLICY "Project members can upload files" ON files FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM project_members WHERE project_id = files.project_id AND user_id = auth.uid()));

-- Notifications: 본인 알림만
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Service Payments: 본인 결제만
CREATE POLICY "Users can view own payments" ON service_payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own payments" ON service_payments FOR INSERT WITH CHECK (user_id = auth.uid());

-- Read Receipts: 프로젝트 멤버만
CREATE POLICY "Project members can view receipts" ON read_receipts FOR SELECT
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = read_receipts.project_id AND user_id = auth.uid()));
CREATE POLICY "Users can create receipts" ON read_receipts FOR INSERT
  WITH CHECK (reader_id = auth.uid());

-- Shares: 공개 토큰은 누구나, 프로젝트 멤버는 모두
CREATE POLICY "Anyone with token can view share" ON shares FOR SELECT USING (true);
CREATE POLICY "Project members can create shares" ON shares FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = shares.project_id AND owner_id = auth.uid()));


-- ========================================
-- PART 3: STORAGE BUCKETS
-- ========================================

-- Project Files Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false);

-- Project Files Storage Policy
CREATE POLICY "Project members can upload files" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Project members can view files" ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Project members can delete files" ON storage.objects FOR DELETE
  USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatar Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- ========================================
-- 완료!
-- ========================================
