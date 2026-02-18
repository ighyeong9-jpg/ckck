-- =============================================
-- RLS 비활성화 (개발 단계용)
-- =============================================

-- projects 테이블 RLS 비활성화
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Users manage own projects" ON projects;

-- 다른 테이블들도 RLS 비활성화 (나중에 추가될 테이블들)
-- ALTER TABLE IF EXISTS workers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS materials DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS processes DISABLE ROW LEVEL SECURITY;
