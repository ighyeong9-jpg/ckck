# Check-In Stable Phase 1S-C DB State Verification

> Date: 2026-06-14
> Auditor: Claude Code (Read-Only Verification)
> Target: E:/dev/check-in-stable (branch: develop)
> Prerequisite: Phase 1S-B commit 5113ee1
> DB execution: 0 (connection unavailable)

---

## 1. Executive Summary

### Verdict: **REVIEW**

| 항목 | 상태 |
|------|------|
| DB 연결 | **NOT AVAILABLE** — Supabase 프로젝트 일시 중지 또는 네트워크 차단 |
| Schema verification | 코드 정적 분석으로 수행 (실제 DB 상태 미확인) |
| Phase 2S 진입 가능 여부 | **조건부 가능** — custom_checklist_items, shares, admin.ts는 즉시 패치 설계 가능 |

### 실제 RLS 위험 TOP 5 (코드 기준)

| # | 항목 | 심각도 | 상태 |
|---|------|--------|------|
| 1 | custom_checklist_items USING(true) 4건 | **CRITICAL** | project_id FK 확인 → 패치 설계 가능 |
| 2 | shares USING(true) + shares_public_read 충돌 | **HIGH** | is_active, expires_at 컬럼 확인 → 패치 설계 가능 |
| 3 | 13개 테이블 RLS ENABLE + 정책 0개 | **HIGH** | 실제 DB 상태 미확인 |
| 4 | storage project-files authenticated-only | **HIGH** | project-files path 구조는 src에서 미확인, evidence bucket path만 코드에서 확인 |
| 5 | project_members 스키마 충돌 (all-in-one vs migration) | **MEDIUM** | 실제 DB 상태 미확인 |

---

## 2. Repository State

| 항목 | 값 |
|------|-----|
| Branch | `develop` |
| Latest commits | `5113ee1` docs: precheck rls and storage security risks |
| | `b1eaeb0` fix: restore dashboard auth guard and block DB mutation script |
| git status | `M CLAUDE.md` (non-scope) |

---

## 3. Actual RLS State

**DB 접근 불가로 실제 rowsecurity 상태 미확인. 코드 정적 분석 기준:**

| Table | RLS ENABLE (코드) | DISABLE 존재 | 정책 수 (rls.sql) | 정책 수 (migration) | Risk |
|-------|------------------|-------------|-------------------|---------------------|------|
| profiles | YES | — | 2 | +1 (v2) | LOW |
| projects | YES | YES (fix-rls) | 3 | — | **MEDIUM** (DISABLE 충돌) |
| project_members | YES | — | 2 | +4 (20240305) | LOW |
| diagnostic_responses | YES | YES (002) | 2 | — | **MEDIUM** |
| change_orders | YES | YES (005) | 2 | — | **MEDIUM** |
| defects | YES | — | 2 | — | LOW |
| files | YES | — | 2 | — | LOW |
| notifications | YES | — | 2 | — | LOW |
| service_payments | YES | — | 2 | — | LOW |
| read_receipts | YES | — | 2 | — | LOW |
| shares | YES | — | 2 (**USING(true)**) | +1 (v2) | **HIGH** |
| custom_checklist_items | YES | — | 4 (**ALL USING(true)**) | — | **CRITICAL** |
| mandatory_processes | YES | — | **0** | — | **HIGH** |
| operational_constraints | YES | — | **0** | — | **HIGH** |
| scope_items | YES | — | **0** | — | **HIGH** |
| quotes | YES | — | **0** | — | **HIGH** |
| quote_line_items | YES | YES (003) | **0** | — | **HIGH** |
| payments | YES | — | **0** | — | **HIGH** |
| compliance_checks | YES | — | **0** | — | **HIGH** |
| compliance_evidence | YES | — | **0** | — | **HIGH** |
| defect_updates | YES | — | **0** | — | **HIGH** |
| audit_logs | YES | — | **0** | — | **HIGH** |
| reports | YES | YES (008) | **0** | — | **HIGH** |
| special_terms | YES | — | **0** | — | **HIGH** |
| timeline_events | YES | — | **0** | — | **HIGH** |
| evidence_files | YES (20240305) | YES (006) | — | 4 (20240305) | **MEDIUM** |
| agreements | — | YES (007) | — | — | **MEDIUM** |
| cost_analysis | — | YES (004) | — | — | **MEDIUM** |
| issues | YES (20240305) | — | — | 3 (20240305) | LOW |
| change_requests | YES (20240305) | — | — | 3 (20240305) | LOW |
| issue_comments | YES (20240305) | — | — | 2 (20240305) | LOW |
| processes | YES (20240305) | YES (009) | — | 4 (20240305) | **MEDIUM** |

---

## 4. Actual Policy State

**DB 접근 불가. 코드에서 확인된 정책 요약:**

### CRITICAL — USING(true) 정책

| Table | Policy | Cmd | qual | with_check | Risk |
|-------|--------|-----|------|------------|------|
| custom_checklist_items | Allow read | SELECT | `true` | — | **CRITICAL** |
| custom_checklist_items | Allow insert | INSERT | — | `true` | **CRITICAL** |
| custom_checklist_items | Allow update | UPDATE | `true` | — | **CRITICAL** |
| custom_checklist_items | Allow delete | DELETE | `true` | — | **CRITICAL** |
| shares | Anyone with token can view share | SELECT | `true` | — | **HIGH** |

### 충돌 — 동일 테이블 복수 정책

| Table | Policy 1 | Policy 2 | 충돌 |
|-------|----------|----------|------|
| shares | Anyone... USING(true) | shares_public_read USING(is_active AND expires_at > now()) | USING(true)가 우선 → shares_public_read 무효 |
| project_members | rls.sql 2개 | 20240305.sql 4개 | 역할 CHECK 값 다름 (소문자 vs 대문자) |

---

## 5. Schema Verification

### custom_checklist_items

| Required Column | Exists | Notes |
|----------------|--------|-------|
| id | **YES** | TEXT PK (gen_random_uuid()::text) |
| project_id | **YES** | UUID FK → projects(id) ON DELETE CASCADE |
| category | **YES** | TEXT NOT NULL |
| subcategory | **YES** | TEXT NOT NULL |
| item | **YES** | TEXT NOT NULL |
| priority | **YES** | TEXT CHECK ('필수','권장','조건부') |
| method | **YES** | TEXT CHECK ('육안확인','작동확인','측정확인') |
| evidence | **YES** | TEXT CHECK ('사진','점검표','측정기록') |
| user_id | **NO** | 개별 항목 소유자 추적 불가 |
| created_by | **NO** | 생성자 추적 불가 |

### shares

| Required Column | Exists | Notes |
|----------------|--------|-------|
| id | **YES** | UUID PK |
| project_id | **YES** | UUID FK → projects(id) |
| share_token | **YES** | TEXT UNIQUE |
| expires_at | **YES** | TIMESTAMPTZ (nullable) |
| is_active | **YES** | BOOLEAN DEFAULT true (v2 migration) |
| created_by | **YES** | UUID FK → profiles(id) |
| revoked_at | **NO** | 공유 취소 이력 추적 불가 |

### projects

| Required Column | Exists | Notes |
|----------------|--------|-------|
| id | **YES** | UUID PK |
| owner_id | **YES** | UUID FK → profiles(id) |
| customer_id | **NO** | Customer Capture MVP 전 추가 필요 |
| contractor_id | **NO** | project_members로 대체 가능 |
| organization_id | **NO** | 향후 확장 |

### project_members

| Required Column | Exists | Notes |
|----------------|--------|-------|
| project_id | **YES** | UUID FK |
| user_id | **YES** | UUID FK (profiles.id 또는 auth.users.id — 정의 충돌) |
| role | **YES** | TEXT CHECK — **두 정의 간 값 충돌** |

**역할 충돌**: all-in-one.sql = `('owner','contractor','client','viewer')` vs 20240305.sql = `('OWNER','MANAGER','DESIGNER','TECHNICIAN','CLIENT')`

### profiles

| Required Column | Exists | Notes |
|----------------|--------|-------|
| id | **YES** | UUID PK FK → auth.users |
| role | **YES** | TEXT CHECK ('admin','contractor','client') |

---

## 6. FK / Constraint Verification

| Relationship | Exists | Source |
|-------------|--------|--------|
| custom_checklist_items.project_id → projects.id | **YES** | 20240220.sql:4 |
| shares.project_id → projects.id | **YES** | all-in-one.sql:247 |
| shares.created_by → profiles.id | **YES** | all-in-one.sql:252 |
| projects.owner_id → profiles.id | **YES** | all-in-one.sql:34 |
| project_members.project_id → projects.id | **YES** | all-in-one.sql:53 |
| project_members.user_id → profiles.id | **YES** (all-in-one) | all-in-one.sql:54 |
| project_members.user_id → auth.users.id | **YES** (migration) | 20240305.sql:30 |
| profiles.id → auth.users.id | **YES** | all-in-one.sql:21 |

---

## 7. Storage Verification

| Bucket | Source | Public | Path Pattern | Risk | Action |
|--------|--------|--------|-------------|------|--------|
| project-files | storage.sql policy only | false | **UNKNOWN** — not confirmed in src | **HIGH** — authenticated-only access, project member check missing | DB/storage usage verification required |
| avatars | storage.sql | true | `{userId}/{filename}` (추정) | LOW — public, 업로드는 본인만 | 유지 |
| evidence | src code upload path only | ? | `{projectId}/{timestamp}_{filename}` | **MEDIUM** — bucket 존재 및 policy가 storage.sql/all-in-one.sql에 미정의 | DB resume 후 bucket/policy 확인 필요 |

**발견**:
- `project-files` bucket은 storage.sql에 정책이 정의되어 있으나, src 코드에서 실제 upload path 사용처가 확인되지 않음. project-files의 실제 path 구조는 DB resume 또는 실제 업로드 코드 확인 전까지 미확정.
- `evidence` bucket은 프론트엔드 6곳에서 사용하지만 storage.sql/all-in-one.sql에 bucket/policy 정의 없음. Supabase 대시보드에서 수동 생성된 것으로 추정.
- 따라서 project-files RLS 패치는 path structure verification 필요.

---

## 8. Service Role Boundary Verification

| 구분 | 위치 수 | 위험 |
|------|---------|------|
| Server-side lib (src/lib/) | 9곳 | LOW — 적정 위치 |
| API route (src/app/api/) | 1곳 | LOW — 적정 위치 |
| Scripts (scripts/) | 15+곳 | MEDIUM — kill-switch 1곳만 적용 |
| Client component 노출 | **0곳** | SAFE |
| admin.ts ANON_KEY fallback | **존재** | MEDIUM — 제거 필요 |

---

## 9. Phase 2S Readiness

| 패치 대상 | 즉시 가능 | 조건 |
|-----------|----------|------|
| custom_checklist_items | **YES** | project_id FK 확인, project_members 기반 정책 설계 가능 |
| shares | **YES** | is_active + expires_at 컬럼 확인 |
| admin.ts fallback 제거 | **YES** | 1행 수정 |
| storage project-files | **조건부** | project-files path 구조 미확인 (src에서 사용처 없음). evidence bucket path만 코드에서 확인됨. DB resume 후 path structure verification 필요 |
| 13개 정책 미정의 테이블 | **NO** | 실제 DB RLS 상태 확인 필요 |

### Blockers

1. **DB 접근 불가** — Supabase 프로젝트 resume 필요
2. **project_members 스키마 충돌** — 실제 DB의 role CHECK 값 확인 필요
3. **evidence bucket 미정의** — storage.sql에 없음, DB 확인 필요
4. **DISABLE RLS migration** — 실행 여부/순서 미확인

---

## 10. Forbidden Actions Confirmation

| 항목 | 상태 |
|------|------|
| INSERT / UPDATE / DELETE | 0회 |
| DROP / ALTER / CREATE | 0회 |
| DDL/DML 실행 | 0회 |
| 데이터 변경 | 0회 |
| migration 실행 | 0회 |
| SQL 적용 | 0회 |
| project scripts 실행 | 0회 |
| DB 확인용 임시 스크립트 | 생성 → 실행 시도 → 연결 실패 → 삭제 완료 |
| npm install | 0회 |
| 배포 | 0회 |
| .env.local 내용 출력 | 0회 |
| 시크릿 출력 | 0회 |
| 개인정보 출력 | 0회 |
| git add/commit/push | 0회 |
| CLAUDE.md 수정 | 0회 |

DB 확인용 임시 스크립트 `_temp_db_verify.js`, `_temp_db_verify_rest.js`를 생성하여 read-only SELECT 쿼리 실행을 시도했으나, Supabase 연결 실패(ENOTFOUND)로 쿼리 실행 자체가 이루어지지 않았음. 두 파일 모두 즉시 삭제 완료. 데이터 변경 0회, DDL/DML 실행 0회.

---

## 11. Final Recommendation

### 판정: **REVIEW**

DB 연결 불가로 실제 상태 미확인이지만, 코드 정적 분석으로 충분한 schema verification이 가능.

### Phase 2S 진행 가능 여부

**조건부 가능.**

| 즉시 가능 | DB resume 후 가능 |
|-----------|------------------|
| custom_checklist_items 패치 SQL 설계 | 패치 적용 |
| shares 패치 SQL 설계 | 패치 적용 |
| admin.ts 코드 수정 | — |
| Rollback SQL 준비 | — |

### Codex Review 필요 여부

**필수.** Schema verification 결과 + Patch Plan DRAFT SQL 검토.

### 다음 단계

1. **Supabase 프로젝트 resume** (익현 수동)
2. DB resume 후 Phase 1S-C 재실행 (실제 RLS/정책/스키마 확인)
3. 또는 DB resume 없이 Phase 2S SQL 설계 선행 (코드 기준)
4. Codex read-only review

---

> Phase 1S-C 완료. 판정: **REVIEW**.
> DB 접근 불가 (Supabase 프로젝트 paused 추정).
> 코드 정적 분석으로 schema verification 수행.
> custom_checklist_items, shares, admin.ts는 즉시 패치 설계 가능.
> 13개 정책 미정의 테이블과 storage evidence bucket은 DB resume 후 확인 필요.
