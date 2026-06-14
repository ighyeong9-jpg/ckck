# Check-In Stable RLS/Storage Patch Plan

> Date: 2026-06-14
> Status: DRAFT — requires schema verification before execution
> Target: E:/dev/check-in-stable (branch: develop)
> DB execution: 0 (document only)

---

## 1. custom_checklist_items — RLS 정책 개선안

### 현재 상태 (CRITICAL)

```sql
-- 현재: 모든 사용자 무제한 CRUD
CREATE POLICY "Allow read custom_checklist_items" ON custom_checklist_items FOR SELECT USING (true);
CREATE POLICY "Allow insert custom_checklist_items" ON custom_checklist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update custom_checklist_items" ON custom_checklist_items FOR UPDATE USING (true);
CREATE POLICY "Allow delete custom_checklist_items" ON custom_checklist_items FOR DELETE USING (true);
```

### DRAFT 패치 후보

```sql
-- DRAFT: requires schema verification
-- custom_checklist_items.project_id → projects.id → project_members 체인 확인 필요

DROP POLICY IF EXISTS "Allow read custom_checklist_items" ON custom_checklist_items;
DROP POLICY IF EXISTS "Allow insert custom_checklist_items" ON custom_checklist_items;
DROP POLICY IF EXISTS "Allow update custom_checklist_items" ON custom_checklist_items;
DROP POLICY IF EXISTS "Allow delete custom_checklist_items" ON custom_checklist_items;

-- 프로젝트 멤버만 조회
CREATE POLICY "Project members can view checklist items" ON custom_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = custom_checklist_items.project_id
      AND user_id = auth.uid()
    )
  );

-- 프로젝트 멤버만 생성
CREATE POLICY "Project members can create checklist items" ON custom_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = custom_checklist_items.project_id
      AND user_id = auth.uid()
    )
  );

-- 프로젝트 멤버만 수정
CREATE POLICY "Project members can update checklist items" ON custom_checklist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = custom_checklist_items.project_id
      AND user_id = auth.uid()
    )
  );

-- 프로젝트 소유자만 삭제
CREATE POLICY "Project owner can delete checklist items" ON custom_checklist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = custom_checklist_items.project_id
      AND owner_id = auth.uid()
    )
  );
```

### Schema Verification Required

- `custom_checklist_items.project_id` FK → `projects(id)` 존재 확인
- `project_members(project_id, user_id)` 존재 확인
- 프로젝트 소유자가 `project_members`에 자동 포함되는지 확인 (아니면 DELETE 정책에 `OR owner_id = auth.uid()` 추가)

---

## 2. shares — SELECT 정책 개선안

### 현재 상태 (HIGH)

```sql
-- rls.sql / all-in-one.sql: 무조건 공개
CREATE POLICY "Anyone with token can view share" ON shares FOR SELECT USING (true);

-- v2_schema_update.sql: 조건부 공개 (is_active + expires_at)
CREATE POLICY shares_public_read ON shares FOR SELECT USING (is_active = true AND expires_at > now());
```

두 정책이 동시 존재할 경우, `USING(true)`가 우선 적용되어 shares_public_read는 무의미.

### DRAFT 패치 후보

```sql
-- DRAFT: requires schema verification
-- shares.is_active BOOLEAN 컬럼 존재 확인 필요 (v2_schema_update에서 추가)
-- shares.expires_at TIMESTAMPTZ 컬럼 존재 확인 필요

-- 1. 기존 무조건 공개 정책 제거
DROP POLICY IF EXISTS "Anyone with token can view share" ON shares;

-- 2. 토큰 기반 + 활성 + 만료 전 조건으로 대체
CREATE POLICY "Active shares are publicly readable" ON shares
  FOR SELECT USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- 3. 프로젝트 소유자는 자신의 shares 전체 조회 가능
CREATE POLICY "Project owner can view all shares" ON shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = shares.project_id
      AND owner_id = auth.uid()
    )
  );
```

### Schema Verification Required

- `shares.is_active` 컬럼 존재 확인 (v2_schema_update에서 ALTER TABLE ADD COLUMN)
- `shares.expires_at` NULL 허용 여부 확인
- 기존 `shares_public_read` 정책과 충돌 여부 확인

---

## 3. Storage — project-files 정책 개선안

### 현재 상태 (HIGH)

```sql
-- 인증 사용자면 누구나 project-files 업로드/조회 가능
CREATE POLICY "Project members can upload files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Project members can view files" ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');
```

정책명은 "Project members"이지만 실제로는 인증 사용자 전체 접근 가능.

### DRAFT 패치 후보

```sql
-- DRAFT: requires schema verification
-- storage.objects의 name 컬럼이 project_id를 prefix로 사용하는지 확인 필요
-- 예: name = '{project_id}/{filename}' 형식이면 아래 가능

-- Option A: folder name 기반 project member 검증
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can view files" ON storage.objects;

CREATE POLICY "Project members can upload files" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = (storage.foldername(name))[1]::uuid
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view files" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = (storage.foldername(name))[1]::uuid
      AND user_id = auth.uid()
    )
  );

-- Option B: storage.foldername이 UUID가 아닌 경우 별도 매핑 테이블 필요
-- → requires schema verification
```

### Schema Verification Required

- Storage upload 시 파일 path가 `{project_id}/...` 형식인지 프론트엔드 코드 확인
- `storage.foldername(name)[1]`이 UUID로 캐스팅 가능한지 확인
- 기존 파일이 이 형식을 따르는지 확인 (migration 전 기존 데이터 보호)

---

## 4. Storage — avatars 정책 (현재 적정)

```sql
-- 현재: public bucket, 누구나 조회 가능
-- 업로드/수정은 본인 폴더만
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

avatars는 public bucket이므로 현재 정책 적정. 변경 불필요.

---

## 5. RLS DISABLE 존재 파일 목록

| 파일 | 테이블 | 상태 |
|------|--------|------|
| `fix-rls.sql` | projects | DISABLE (개발용) |
| `002_create_diagnostic_responses.sql` | diagnostic_responses | DISABLE |
| `003_create_quote_line_items.sql` | quote_line_items | DISABLE |
| `004_create_cost_analysis.sql` | cost_analysis | DISABLE |
| `005_create_change_orders.sql` | change_orders | DISABLE |
| `006_create_evidence_files.sql` | evidence_files | DISABLE |
| `007_create_agreements.sql` | agreements | DISABLE |
| `008_create_reports.sql` | reports | DISABLE |
| `009_create_all_tables.sql` | clients, processes, workforce, materials, user_settings, activity_logs | DISABLE |
| `20260226_add_law_engine_tables.sql` | laws, law_checks, risk_scores, warranties | DISABLE |
| `reset-projects.sql` | projects | DISABLE |

총 17개 테이블에 DISABLE RLS 존재. all-in-one.sql과 rls.sql에서는 ENABLE로 재설정하지만, migration 실행 순서에 따라 최종 상태가 다를 수 있음.

**실제 DB에서 현재 RLS 상태 확인 필요** (이번에는 DB 실행 금지).

---

## 6. admin.ts ANON_KEY Fallback 제거안

### 현재 상태

```typescript
const key = serviceRoleKey || anonKey  // SERVICE_ROLE_KEY 없으면 ANON_KEY로 fallback
```

### DRAFT 패치 후보

```typescript
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
}
// ANON_KEY fallback 제거 — admin client는 반드시 SERVICE_ROLE_KEY 사용
```

---

## 7. SERVICE_ROLE_KEY 서버 전용 원칙

| 원칙 | 규칙 |
|------|------|
| client component에서 사용 금지 | `'use client'` 파일에서 SUPABASE_SERVICE_ROLE_KEY 참조 금지 |
| API route에서만 사용 | `src/app/api/` 경로에서만 허용 |
| server-only lib에서 사용 | `src/lib/` 경로에서 server-only 모듈로 사용 허용 |
| scripts에서 사용 | `.env.local` 읽는 scripts는 kill-switch 필수 (Phase 1S-A 완료) |

---

## 8. 적용 전 필수 검증 절차

1. **Schema Verification**: 실제 DB에서 컬럼 존재 확인 (`\d custom_checklist_items`, `\d shares`)
2. **Staging 검증**: 로컬 Supabase 또는 별도 staging에서 먼저 적용
3. **기존 데이터 보호**: SELECT count(*) 실행으로 데이터 존재 확인
4. **Rollback SQL 준비**: 정책 DROP + 원래 정책 재생성 스크립트
5. **Codex read-only review**: 패치 SQL 리뷰
6. **프론트엔드 동작 확인**: RLS 변경 후 클라이언트 CRUD 정상 동작 확인

---

> 이 문서는 DRAFT다. 실제 DB 실행 없이 코드 정적 분석으로만 작성됨.
> migration 실행 전 반드시 schema verification + staging 검증 필요.
