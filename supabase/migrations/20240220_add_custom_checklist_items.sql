-- 커스텀 체크리스트 항목 테이블
CREATE TABLE IF NOT EXISTS custom_checklist_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  item TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('필수', '권장', '조건부')),
  method TEXT NOT NULL CHECK (method IN ('육안확인', '작동확인', '측정확인')),
  evidence TEXT NOT NULL CHECK (evidence IN ('사진', '점검표', '측정기록')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_custom_checklist_items_project_id ON custom_checklist_items(project_id);

-- diagnostic_responses 테이블에 item_id 컬럼 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_responses' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE diagnostic_responses ADD COLUMN item_id TEXT;
  END IF;
END $$;

-- diagnostic_responses 테이블에 subcategory 컬럼 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagnostic_responses' AND column_name = 'subcategory'
  ) THEN
    ALTER TABLE diagnostic_responses ADD COLUMN subcategory TEXT;
  END IF;
END $$;

-- RLS 정책 (Row Level Security)
ALTER TABLE custom_checklist_items ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "Allow read custom_checklist_items" ON custom_checklist_items;
DROP POLICY IF EXISTS "Allow insert custom_checklist_items" ON custom_checklist_items;
DROP POLICY IF EXISTS "Allow update custom_checklist_items" ON custom_checklist_items;
DROP POLICY IF EXISTS "Allow delete custom_checklist_items" ON custom_checklist_items;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Allow read custom_checklist_items" ON custom_checklist_items
  FOR SELECT USING (true);

-- 인증된 사용자가 생성 가능
CREATE POLICY "Allow insert custom_checklist_items" ON custom_checklist_items
  FOR INSERT WITH CHECK (true);

-- 인증된 사용자가 수정 가능
CREATE POLICY "Allow update custom_checklist_items" ON custom_checklist_items
  FOR UPDATE USING (true);

-- 인증된 사용자가 삭제 가능
CREATE POLICY "Allow delete custom_checklist_items" ON custom_checklist_items
  FOR DELETE USING (true);
