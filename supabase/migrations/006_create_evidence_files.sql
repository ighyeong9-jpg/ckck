-- Evidence Files 테이블 생성
DROP TABLE IF EXISTS evidence_files CASCADE;

CREATE TABLE evidence_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  sha256_hash TEXT,
  category TEXT DEFAULT 'other',
  description TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화
ALTER TABLE evidence_files DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_evidence_files_project ON evidence_files(project_id);
CREATE INDEX idx_evidence_files_category ON evidence_files(category);
