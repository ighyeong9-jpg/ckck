-- 기존 테이블 완전 삭제
DROP TABLE IF EXISTS projects CASCADE;

-- 새로 생성 (코드와 100% 일치)
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  status TEXT DEFAULT 'planning',
  progress INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 확인
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'projects';
