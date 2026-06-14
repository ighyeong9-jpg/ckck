# Check-In Stable Schema Verification Results

> Date: 2026-06-14
> Method: Static code analysis (DB connection unavailable — project paused or network blocked)
> Source: supabase/all-in-one.sql, supabase/rls.sql, supabase/storage.sql, supabase/migrations/*.sql
> DB execution: 0

---

## DB Connection Status

**DB_CONNECTION_NOT_AVAILABLE**

- PostgreSQL pooler (port 6543): ENOTFOUND tenant/user
- PostgreSQL direct (port 5432): ENOTFOUND
- Supabase REST API: fetch failed (all endpoints)
- 원인 추정: Supabase 프로젝트 일시 중지(paused) 상태 또는 네트워크 차단

모든 schema verification은 코드 정적 분석으로 수행됨. 실제 DB 상태와 다를 수 있음.

---

## Verified Tables

| 테이블 | 정의 위치 | PK 타입 |
|--------|-----------|---------|
| profiles | all-in-one.sql:20 | UUID (auth.users FK) |
| projects | all-in-one.sql:32 | UUID |
| project_members | all-in-one.sql:51 + 20240305.sql:27 | UUID |
| diagnostic_responses | all-in-one.sql:62 | UUID |
| mandatory_processes | all-in-one.sql:75 | UUID |
| operational_constraints | all-in-one.sql:85 | UUID |
| change_orders | all-in-one.sql:94 | UUID |
| scope_items | all-in-one.sql:111 | UUID |
| quotes | all-in-one.sql:124 | UUID |
| quote_line_items | all-in-one.sql:135 | UUID |
| payments | all-in-one.sql:147 | UUID |
| compliance_checks | all-in-one.sql:162 | UUID |
| compliance_evidence | all-in-one.sql:173 | UUID |
| defects | all-in-one.sql:182 | UUID |
| defect_updates | all-in-one.sql:197 | UUID |
| files | all-in-one.sql:207 | UUID |
| audit_logs | all-in-one.sql:223 | UUID |
| reports | all-in-one.sql:235 | UUID |
| shares | all-in-one.sql:245 | UUID |
| special_terms | all-in-one.sql:257 | UUID |
| timeline_events | all-in-one.sql:266 | UUID |
| notifications | all-in-one.sql:278 | UUID |
| service_payments | all-in-one.sql:290 | UUID |
| read_receipts | all-in-one.sql:303 | UUID |
| custom_checklist_items | 20240220.sql:2 | TEXT (gen_random_uuid()::text) |
| issues | 20240305.sql:6 | UUID |
| change_requests | 20240305.sql:45 | UUID |
| issue_comments | 20240305.sql:64 | UUID |

---

## Verified Columns

### custom_checklist_items

| Column | Type | Nullable | FK | Notes |
|--------|------|----------|-----|-------|
| id | TEXT | NO | — | PK, gen_random_uuid()::text |
| project_id | UUID | NO | projects(id) ON DELETE CASCADE | **EXISTS — patch 가능** |
| category | TEXT | NO | — | |
| subcategory | TEXT | NO | — | |
| item | TEXT | NO | — | |
| priority | TEXT | NO | — | CHECK ('필수','권장','조건부') |
| method | TEXT | NO | — | CHECK ('육안확인','작동확인','측정확인') |
| evidence | TEXT | NO | — | CHECK ('사진','점검표','측정기록') |
| created_at | TIMESTAMPTZ | YES | — | |
| updated_at | TIMESTAMPTZ | YES | — | |
| **user_id** | — | — | — | **NOT EXISTS** |
| **created_by** | — | — | — | **NOT EXISTS** |

### shares

| Column | Type | Nullable | FK | Notes |
|--------|------|----------|-----|-------|
| id | UUID | NO | — | PK |
| project_id | UUID | NO | projects(id) ON DELETE CASCADE | |
| share_token | TEXT | NO | — | UNIQUE |
| share_url | TEXT | NO | — | |
| masked_fields | TEXT[] | YES | — | |
| expires_at | TIMESTAMPTZ | YES | — | |
| created_by | UUID | YES | profiles(id) | |
| created_at | TIMESTAMPTZ | YES | — | |
| **is_active** | BOOLEAN | YES | — | **v2 migration에서 ADD (DEFAULT true)** |
| **view_count** | INTEGER | YES | — | **v2 migration에서 ADD** |
| **updated_at** | TIMESTAMPTZ | YES | — | **v2 migration에서 ADD** |
| **revoked_at** | — | — | — | **NOT EXISTS** |

### projects

| Column | Type | Nullable | FK | Notes |
|--------|------|----------|-----|-------|
| id | UUID | NO | — | PK |
| owner_id | UUID | NO | profiles(id) ON DELETE CASCADE | |
| title | TEXT | NO | — | |
| industry | TEXT | NO | — | |
| address | TEXT | YES | — | |
| client_name | TEXT | YES | — | |
| client_phone | TEXT | YES | — | |
| start_date | DATE | YES | — | |
| end_date | DATE | YES | — | |
| budget | DECIMAL(12,2) | YES | — | |
| risk_score | DECIMAL(5,2) | YES | — | DEFAULT 0 |
| risk_grade | TEXT | YES | — | CHECK ('A','B','C','D','F') |
| status | TEXT | YES | — | CHECK (5 values) |
| created_at | TIMESTAMPTZ | YES | — | |
| updated_at | TIMESTAMPTZ | YES | — | |
| **customer_id** | — | — | — | **NOT EXISTS** |
| **contractor_id** | — | — | — | **NOT EXISTS** |
| **organization_id** | — | — | — | **NOT EXISTS** |

### project_members

두 개의 정의가 존재:

**all-in-one.sql:51** (기본):

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| user_id | UUID | FK profiles(id) |
| role | TEXT | CHECK ('owner','contractor','client','viewer') |
| invited_at | TIMESTAMPTZ | |
| accepted_at | TIMESTAMPTZ | |

**20240305_project_collaboration.sql:27** (확장):

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| user_id | UUID | FK auth.users(id) — **FK 대상 다름** |
| role | TEXT | CHECK ('OWNER','MANAGER','DESIGNER','TECHNICIAN','CLIENT') — **역할 다름** |
| invited_email | TEXT | |
| status | TEXT | CHECK ('PENDING','ACTIVE') |
| invited_at | TIMESTAMPTZ | |
| joined_at | TIMESTAMPTZ | |
| invited_by | UUID | FK auth.users(id) |

**충돌**: 두 스키마의 role 값과 FK 대상이 다름. 실제 DB 상태는 migration 실행 순서에 의존.

### profiles

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK, FK auth.users(id) |
| email | TEXT | NO | UNIQUE |
| full_name | TEXT | YES | |
| phone | TEXT | YES | |
| avatar_url | TEXT | YES | |
| role | TEXT | YES | CHECK ('admin','contractor','client') — **EXISTS** |
| created_at | TIMESTAMPTZ | YES | |
| updated_at | TIMESTAMPTZ | YES | |
| company_name | VARCHAR(200) | YES | v2 migration |
| description | TEXT | YES | v2 migration |
| specialty_tags | JSONB | YES | v2 migration |
| address | TEXT | YES | v2 migration |
| logo_url | TEXT | YES | v2 migration |
| portfolio_images | JSONB | YES | v2 migration |
| avg_verification_score | FLOAT | YES | v2 migration |
| total_projects | INTEGER | YES | v2 migration |
| avg_duration_days | INTEGER | YES | v2 migration |
| profile_token | VARCHAR(32) | YES | UNIQUE, v2 migration |
| is_public | BOOLEAN | YES | v2 migration |

---

## Verified Foreign Keys

| Relationship | Source | Exists |
|-------------|--------|--------|
| custom_checklist_items.project_id → projects.id | 20240220.sql:4 | **YES** |
| shares.project_id → projects.id | all-in-one.sql:247 | **YES** |
| shares.created_by → profiles.id | all-in-one.sql:252 | **YES** |
| projects.owner_id → profiles.id | all-in-one.sql:34 | **YES** |
| project_members.project_id → projects.id | all-in-one.sql:53 | **YES** |
| project_members.user_id → profiles.id | all-in-one.sql:54 | **YES** |
| project_members.user_id → auth.users.id | 20240305.sql:30 | **YES (다른 정의)** |
| profiles.id → auth.users.id | all-in-one.sql:21 | **YES** |

---

## Verified Policies (from code)

### RLS ENABLE 상태 (rls.sql 기준)

| 테이블 | ENABLE 선언 | 정책 수 (rls.sql) | 정책 수 (migration) |
|--------|-------------|------------------|---------------------|
| profiles | YES | 2 (SELECT, UPDATE) | +1 (profiles_public_read, v2) |
| projects | YES | 3 (SELECT, UPDATE, INSERT) | — |
| project_members | YES | 2 (SELECT, ALL) | +4 (20240305: SELECT, INSERT, UPDATE, DELETE) |
| diagnostic_responses | YES | 2 (SELECT, ALL) | — |
| change_orders | YES | 2 (SELECT, INSERT) | — |
| defects | YES | 2 (SELECT, ALL) | — |
| files | YES | 2 (SELECT, INSERT) | — |
| notifications | YES | 2 (SELECT, UPDATE) | — |
| service_payments | YES | 2 (SELECT, INSERT) | — |
| read_receipts | YES | 2 (SELECT, INSERT) | — |
| shares | YES | 2 (SELECT, INSERT) | +1 (shares_public_read, v2) |
| custom_checklist_items | YES (20240220) | 4 (SELECT, INSERT, UPDATE, DELETE) — **ALL USING(true)** | — |
| mandatory_processes | YES | **0** | — |
| operational_constraints | YES | **0** | — |
| scope_items | YES | **0** | — |
| quotes | YES | **0** | — |
| quote_line_items | YES | **0** | — |
| payments | YES | **0** | — |
| compliance_checks | YES | **0** | — |
| compliance_evidence | YES | **0** | — |
| defect_updates | YES | **0** | — |
| audit_logs | YES | **0** | — |
| reports | YES | **0** | — |
| special_terms | YES | **0** | — |
| timeline_events | YES | **0** | — |

### Migration 추가 정책 (20240305_project_collaboration.sql)

| 테이블 | 정책 | 유형 |
|--------|------|------|
| issues | 3 (SELECT, INSERT, UPDATE) | project_members 기반 |
| change_requests | 3 (SELECT, INSERT, UPDATE) | project_members 기반, 역할 제한 |
| issue_comments | 2 (SELECT, INSERT) | project_members 기반 |
| evidence_files | 4 (SELECT, INSERT, UPDATE, DELETE) | owner + project_members 기반 |
| comparison_pairs | 4 (SELECT, INSERT, UPDATE, DELETE) | owner + project_members 기반 |
| processes | 4 (SELECT, INSERT, UPDATE, DELETE) | owner + project_members 기반, 역할 제한 |

---

## Verified Storage Buckets (from code)

| Bucket | Public | Size Limit | MIME Types | Path Pattern | Source |
|--------|--------|------------|------------|-------------|--------|
| project-files | false | not set | not set | **UNKNOWN** — src에서 upload 사용처 미확인 | storage.sql:7-8 |
| avatars | true | not set | not set | `{userId}/{filename}` (추정) | storage.sql:24-25 |
| evidence | ? | ? | ? | `{projectId}/{timestamp}_{filename}` (src 코드 확인) | **storage.sql/all-in-one.sql에 미정의** — 프론트엔드 6곳에서 사용, Supabase 대시보드 수동 생성 추정 |

**참고**: project-files bucket은 storage.sql에 정책 정의가 있으나, src 코드에서 실제 upload path 사용처가 확인되지 않음. evidence bucket은 src 코드에서 사용하지만 SQL 파일에 bucket/policy 정의 없음.

---

## Missing Columns / Missing FK

| 테이블 | 누락 항목 | Phase 2S 영향 |
|--------|-----------|---------------|
| custom_checklist_items | `user_id` / `created_by` | 개별 항목 소유자 추적 불가 — project_id 기반 정책으로 대체 가능 |
| shares | `revoked_at` | 공유 취소 이력 추적 불가 — is_active=false로 대체 가능 |
| projects | `customer_id` | 고객 연결 불가 — owner_id만 존재. Customer Capture MVP 전 추가 필요 |
| projects | `contractor_id` | 시공업체 연결 불가 — project_members로 대체 가능 |
| projects | `organization_id` | 조직 단위 관리 불가 — 향후 확장 |

---

## Patch Implications

### custom_checklist_items 패치

- **즉시 가능**: project_id FK 존재 확인 → project_members 기반 정책 설계 가능
- **주의**: user_id/created_by 없음 → 개별 항목 소유자 구분 불가, project 단위로만 접근 제어
- **Rollback**: DROP 4 policies + CREATE 4 USING(true) policies

### shares 패치

- **즉시 가능**: is_active + expires_at 컬럼 존재 (v2 migration)
- **주의**: `USING(true)` 정책과 `shares_public_read` 정책이 동시 존재할 수 있음. DROP 순서 주의
- **Rollback**: DROP new policy + CREATE USING(true) policy

### storage project-files 패치

- **조건부 가능**: 파일 path가 `{project_id}/filename` 구조인지 확인 필요 (DB 접근 불가로 미확인)
- **주의**: project-files의 실제 upload path가 src 코드에서 확인되지 않음. evidence bucket path(`{projectId}/{timestamp}_{filename}`)만 코드에서 확인됨. DB resume 후 path structure verification 필요
- **Rollback**: DROP + CREATE authenticated-only policy

### admin.ts 패치

- **즉시 가능**: ANON_KEY fallback 제거 = 1행 수정
- **영향 확인**: certificateService.ts, scoreEngine.ts가 createAdminClient() 사용
- **Rollback**: 원래 코드 복원

---

## Rollback Requirements

| 패치 대상 | Rollback SQL |
|-----------|-------------|
| custom_checklist_items | `DROP POLICY ... ; CREATE POLICY ... USING(true);` × 4 |
| shares | `DROP POLICY ... ; CREATE POLICY ... USING(true);` |
| storage project-files | `DROP POLICY ... ; CREATE POLICY ... auth.role() = 'authenticated';` × 2 |
| admin.ts | git revert (코드 변경) |

---

## Phase 2S Inputs

### 즉시 적용 가능

1. **custom_checklist_items** → project_members 기반 정책 (project_id FK 확인됨)
2. **shares** → is_active + expires_at 조건부 정책 (컬럼 확인됨)
3. **admin.ts** → ANON_KEY fallback 제거

### DB 접근 후 적용 가능

4. **storage project-files** → path 구조 확인 후 project_members 기반 정책
5. **13개 정책 미정의 테이블** → 실제 RLS 상태 확인 후 정책 추가

### 향후 스키마 확장 필요 (Phase 2S 이후)

6. `projects.customer_id` 추가 → Customer Capture MVP 전
7. `shares.revoked_at` 추가 → 공유 관리 강화
8. `organizations` 테이블 → 업체 소속 관리
