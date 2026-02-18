-- Check-In 프로젝트 Supabase 스키마
-- 실행 순서대로 정렬됨

-- 1. Projects 테이블 (프로젝트 관리)
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  client_name TEXT,
  address TEXT,
  description TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'completed')),
  risk_score INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  industry TEXT DEFAULT 'interior',
  merkle_root TEXT,
  start_date DATE,
  end_date DATE,
  budget BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Clients 테이블 (고객 관리)
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  client_type TEXT DEFAULT 'client' CHECK (client_type IN ('client', 'contractor', 'supplier', 'subcontractor')),
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Diagnostic Responses 테이블 (진단 체크리스트 응답)
CREATE TABLE IF NOT EXISTS diagnostic_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  category TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  weight DECIMAL(3,2) DEFAULT 0,
  risk_factor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, question_id)
);

-- 4. SOW Items 테이블 (작업명세서 항목)
CREATE TABLE IF NOT EXISTS sow_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT,
  quantity DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Quote Line Items 테이블 (견적서 항목)
CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT,
  quantity DECIMAL(10,2) DEFAULT 0,
  unit_price BIGINT DEFAULT 0,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Cost Analysis 테이블 (비용 분석)
CREATE TABLE IF NOT EXISTS cost_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  base_cost BIGINT DEFAULT 0,
  adjusted_cost BIGINT DEFAULT 0,
  factors JSONB DEFAULT '[]',
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Changes 테이블 (변경 관리)
CREATE TABLE IF NOT EXISTS changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'design',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed')),
  cost_impact BIGINT DEFAULT 0,
  schedule_impact INTEGER DEFAULT 0,
  requested_by TEXT,
  approved_by TEXT,
  requested_date DATE,
  approved_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Evidence Files 테이블 (증빙 파일)
CREATE TABLE IF NOT EXISTS evidence_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  sha256_hash TEXT,
  category TEXT DEFAULT 'other',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Agreements 테이블 (계약서)
CREATE TABLE IF NOT EXISTS agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'signed', 'cancelled')),
  parties JSONB DEFAULT '[]',
  signed_date DATE,
  effective_date DATE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Processes 테이블 (공정 관리)
CREATE TABLE IF NOT EXISTS processes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  end_date DATE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Workforce 테이블 (인력 관리)
CREATE TABLE IF NOT EXISTS workforce (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  worker_type TEXT DEFAULT 'general',
  phone TEXT,
  daily_wage BIGINT DEFAULT 0,
  work_date DATE NOT NULL,
  attendance_status TEXT DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'late', 'half_day')),
  work_hours DECIMAL(4,2) DEFAULT 8,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Materials 테이블 (자재 관리)
CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  unit TEXT DEFAULT '개',
  quantity DECIMAL(10,2) DEFAULT 0,
  unit_price BIGINT DEFAULT 0,
  total_price BIGINT DEFAULT 0,
  supplier TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'shipped', 'delivered', 'returned')),
  expected_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. User Settings 테이블 (사용자 설정)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  company_name TEXT,
  phone TEXT,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  weekly_report BOOLEAN DEFAULT TRUE,
  risk_alerts BOOLEAN DEFAULT TRUE,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_responses_project_id ON diagnostic_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_sow_items_project_id ON sow_items(project_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_project_id ON quote_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_changes_project_id ON changes(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_project_id ON evidence_files(project_id);
CREATE INDEX IF NOT EXISTS idx_processes_project_id ON processes(project_id);
CREATE INDEX IF NOT EXISTS idx_workforce_project_id ON workforce(project_id);
CREATE INDEX IF NOT EXISTS idx_workforce_work_date ON workforce(work_date);
CREATE INDEX IF NOT EXISTS idx_materials_project_id ON materials(project_id);

-- RLS(Row Level Security) 정책 (선택적)
-- 필요시 아래 주석을 해제하고 사용

-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only see their own projects" ON projects
--   FOR ALL USING (auth.uid()::text = user_id);

-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only see their own clients" ON clients
--   FOR ALL USING (auth.uid()::text = user_id);

-- Storage 버킷 생성 (Supabase Dashboard에서 실행)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true);
