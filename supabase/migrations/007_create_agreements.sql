-- Agreements 테이블 생성 (3자 합의)
DROP TABLE IF EXISTS agreements CASCADE;

CREATE TABLE agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- 발주자 (Client)
  client_agreed BOOLEAN DEFAULT FALSE,
  client_name TEXT,
  client_signed_at TIMESTAMPTZ,
  client_signature TEXT,
  -- 시공사 (Contractor)
  contractor_agreed BOOLEAN DEFAULT FALSE,
  contractor_name TEXT,
  contractor_signed_at TIMESTAMPTZ,
  contractor_signature TEXT,
  -- 관리자 (Manager)
  manager_agreed BOOLEAN DEFAULT FALSE,
  manager_name TEXT,
  manager_signed_at TIMESTAMPTZ,
  manager_signature TEXT,
  -- 합의 내용
  agreement_content TEXT,
  total_amount INTEGER DEFAULT 0,
  notes TEXT,
  -- 최종 상태
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화
ALTER TABLE agreements DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_agreements_project ON agreements(project_id);
CREATE INDEX idx_agreements_status ON agreements(status);
