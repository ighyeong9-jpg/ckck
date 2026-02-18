-- =============================================
-- 1. Clients (고객관리) 테이블
-- =============================================
DROP TABLE IF EXISTS clients CASCADE;

CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  client_type TEXT DEFAULT 'client',
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clients_user ON clients(user_id);

-- =============================================
-- 2. Processes (공정관리) 테이블
-- =============================================
DROP TABLE IF EXISTS processes CASCADE;

CREATE TABLE processes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  sort_order INTEGER DEFAULT 0,
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE processes DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_processes_project ON processes(project_id);

-- =============================================
-- 3. Workforce (인력관리) 테이블
-- =============================================
DROP TABLE IF EXISTS workforce CASCADE;

CREATE TABLE workforce (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  daily_wage INTEGER DEFAULT 0,
  work_date DATE NOT NULL,
  hours_worked DECIMAL(4,2) DEFAULT 8,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workforce DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_workforce_project ON workforce(project_id);
CREATE INDEX idx_workforce_date ON workforce(work_date);

-- =============================================
-- 4. Materials (자재관리) 테이블
-- =============================================
DROP TABLE IF EXISTS materials CASCADE;

CREATE TABLE materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  unit TEXT DEFAULT 'ea',
  quantity INTEGER DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  supplier TEXT,
  status TEXT DEFAULT 'ordered',
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_materials_project ON materials(project_id);

-- =============================================
-- 5. User Settings (설정) 테이블
-- =============================================
DROP TABLE IF EXISTS user_settings CASCADE;

CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  phone TEXT,
  company TEXT,
  notify_email BOOLEAN DEFAULT TRUE,
  notify_push BOOLEAN DEFAULT TRUE,
  notify_sms BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_settings_user ON user_settings(user_id);

-- =============================================
-- 6. Activity Log (최근 활동) 테이블
-- =============================================
DROP TABLE IF EXISTS activity_logs CASCADE;

CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_project ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
