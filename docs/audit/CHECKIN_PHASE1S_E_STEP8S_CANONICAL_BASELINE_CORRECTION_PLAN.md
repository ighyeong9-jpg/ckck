# Check-In Phase 1S-E Step 8S — Canonical Baseline Correction Plan

> Date: 2026-06-14
> Author: Claude Code (Opus 4.6)
> Role: Phase 1S-E Step 8S 담당자 (Read-Only Plan)
> Baseline: supabase/canonical-safe-baseline.sql (d90abda, 45 tables)
> Mapping Doc: docs/audit/CHECKIN_PHASE1S_E_STEP8R_SCHEMA_CODE_COMPATIBILITY_MAP.md (2c26070)
> Branch: develop
> Revision: Step 8S-S-R2 — shares base table anon public SELECT 완전 폐기, API route service role 내부 조회로 한정
> Previous: Step 8S-S-R (6개 data table public RLS 폐기) / Step 8S-S (trigger_type 9값, overall_score generated column 확정) / Step 8S-R (field map 보강)

---

## 1. Verdict

**PASS candidate** — Correction plan 문서 작성 완료. Codex review 대기.

---

## 2. Executive Summary

- DB 적용 가능 여부: **NO** — baseline SQL이 아직 보정되지 않음
- SQL 수정 가능 여부: **아직 NO** — 이 plan이 Codex PASS 받은 후 수정 진행
- 이번 문서의 목적: canonical-safe-baseline.sql을 src 코드 기준으로 어떻게 보정할지 구체적 계획 수립
- 권장 보정 방향: **Option B (Code → Baseline)** — src Supabase 호출을 truth source로 삼고, baseline SQL을 src 기준으로 보정한다. 현재 DB 미적용 상태이므로, 동작 중인 src Supabase 호출이 유일한 truth source다.

---

## 3. Repository State

| Item | Value |
|------|-------|
| Branch | develop |
| HEAD | 2c26070 `docs: map schema code compatibility gaps` |
| Working tree | M CLAUDE.md (non-scope, 커밋 제외) / ?? docs/audit/CHECKIN_PHASE1S_E_STEP8S_CANONICAL_BASELINE_CORRECTION_PLAN.md |
| Baseline file | supabase/canonical-safe-baseline.sql (1684 lines, 45 tables) |
| .env.local.bak | NOT present (Test-Path = False) |

---

## 4. Correction Principles

1. **src Supabase 호출을 truth source로 삼는다** — src 코드가 현재 동작하는 앱이며, baseline은 아직 어디에도 적용되지 않았다
2. **baseline SQL을 src 기준으로 보정한다** — src 코드를 수정하지 않는다
3. **보안 원칙은 유지한다:**
   - DISABLE RLS 금지
   - USING(true) 남발 금지 (public reference data만 예외)
   - WITH CHECK(true) 금지
   - authenticated-only storage 금지
   - project/member/user 기반 권한 유지
4. **direct migration replay 금지** — 기존 migration 파일을 그대로 재실행하지 않는다
5. **기존 SQL 삭제 금지** — canonical-safe-baseline.sql은 보정만 하고, 기존 migration 파일은 건드리지 않는다

---

## 5. Projects Table Correction Plan

### 5.1 현재 상태 비교

| Column | Baseline (d90abda) | Src 코드 기대 | Gap | 보정안 |
|--------|-------------------|--------------|-----|--------|
| id | UUID PK | UUID PK | MATCH | 유지 |
| owner_id | `UUID NOT NULL REFERENCES profiles(id)` | 미사용 (0건) | **CONFLICT** | user_id로 rename |
| user_id | 없음 | 20+곳에서 사용 (insert, FK join, filter) | **MISSING** | 추가 (owner_id 대체) |
| title | `TEXT NOT NULL` | 미사용 (0건 on projects table) | **CONFLICT** | name으로 rename |
| name | 없음 | 10+곳에서 사용 | **MISSING** | 추가 (title 대체) |
| progress | 없음 | 30+곳 (insert=0, select, update) | **MISSING** | `INTEGER DEFAULT 0` 추가 |
| status | CHECK: planning, diagnosis, in_progress, completed, disputed | src: planning, in_progress, review, completed | **MISMATCH** | CHECK 통합 (아래 §8) |
| industry | `TEXT NOT NULL DEFAULT 'general'` | src insert에서 사용 | MATCH | 유지 |
| address | TEXT | src insert에서 사용 | MATCH | 유지 |
| client_name | TEXT | src insert에서 사용 | MATCH | 유지 |
| client_phone | TEXT | 미확인 | KEEP | 유지 (삭제 불필요) |
| start_date | DATE | src insert에서 사용 | MATCH | 유지 |
| end_date | DATE | src insert에서 사용 | MATCH | 유지 |
| budget | DECIMAL(12,2) | src update에서 사용 | MATCH | 유지 |
| risk_score | DECIMAL(5,2) DEFAULT 0 | src insert/update/select | MATCH | 유지 |
| risk_grade | TEXT CHECK (A-F) | src에서 diagnostic에서 사용 | MATCH | 유지 |
| description | TEXT | src update에서 사용 | MATCH | 유지 |
| actual_end_date | DATE | 미확인 | KEEP | 유지 |
| created_at | TIMESTAMPTZ | 공통 | MATCH | 유지 |
| updated_at | TIMESTAMPTZ | 공통 | MATCH | 유지 |

### 5.2 보정 추천안

1. **owner_id → user_id rename**
   - `owner_id UUID NOT NULL REFERENCES profiles(id)` → `user_id UUID NOT NULL REFERENCES auth.users(id)`
   - FK 대상도 profiles(id) → auth.users(id)로 변경 (src에서 `user.id`는 auth.users의 id)
   - 리스크: auto_add_project_owner 트리거가 owner_id를 참조 → 트리거도 user_id로 보정 필요
   - idx_projects_owner 인덱스도 user_id로 보정

2. **title → name rename**
   - `title TEXT NOT NULL` → `name TEXT NOT NULL`
   - 단순 rename, 리스크 낮음

3. **progress 컬럼 추가**
   - `progress INTEGER DEFAULT 0`
   - src에서 insert 시 0으로 초기화, update로 갱신

4. **status CHECK 보정** — §8에서 상세

5. **owner_id 유지 여부: NO** — src 참조 0건이므로 user_id로 완전 대체
6. **name/title 동시 유지 여부: NO** — src 참조 기준 name만 사용, title 불필요

### 5.3 리스크

| Risk | Level | Mitigation |
|------|-------|------------|
| auto_add_project_owner 트리거 깨짐 | HIGH | 트리거 내 owner_id → user_id로 동시 보정 |
| FK 대상 변경 (profiles → auth.users) | MEDIUM | auth.users(id)는 Supabase 기본 제공, 안전 |
| backfill_project_owner 함수 깨짐 | HIGH | 함수 내 owner_id → user_id로 동시 보정 |

---

## 6. Missing Tables Correction Plan

### 6.1 우선순위 분류

**P0 (네비게이션 컴포넌트에서 사용, 없으면 앱 깨짐):**

#### P0-1: dispute_signals (7 refs)

**Key Files:** Sidebar.tsx, MobileTabBar.tsx, TodayStatusBar.tsx, brain.ts, ContractorBadge.tsx, ProjectTimeline.tsx, proactive-engine.ts

**Field Map (src 역추출):**

| Column | Type | Nullable | Default | Source | Operation |
|--------|------|----------|---------|--------|-----------|
| id | UUID PK | NO | gen_random_uuid() | — | auto |
| project_id | UUID FK→projects | YES | NULL | brain.ts:100 | INSERT |
| user_id | UUID FK→auth.users | NO | — | brain.ts:101 | INSERT |
| signal_type | TEXT | NO | — | brain.ts:102 | INSERT, SELECT (ProjectTimeline:84) |
| description | TEXT | NO | — | brain.ts:103 | INSERT, SELECT |
| detected_from | TEXT | YES | NULL | brain.ts:104 | INSERT |
| source_text | TEXT | YES | NULL | brain.ts:105 | INSERT |
| legal_basis | TEXT | YES | NULL | brain.ts:106 | INSERT, SELECT |
| recommended_action | TEXT | YES | NULL | brain.ts:107 | INSERT, SELECT |
| resolved | BOOLEAN | NO | false | Sidebar:117 `.eq('resolved', false)` | SELECT filter |
| created_at | TIMESTAMPTZ | NO | NOW() | ProjectTimeline:84 | SELECT, ORDER BY |

**RLS:** project_members scoped via project_id. INSERT는 service_role path (brain.ts uses SERVICE_ROLE_KEY).

---

#### P0-2: warranty_tracking (10 refs)

**Key Files:** Sidebar.tsx, MobileTabBar.tsx, TodayStatusBar.tsx, warranty/page.tsx, warranty-tracker.ts, proactive-engine.ts

**Field Map (src 역추출):**

| Column | Type | Nullable | Default | Source | Operation |
|--------|------|----------|---------|--------|-----------|
| id | UUID PK | NO | gen_random_uuid() | — | auto |
| project_id | UUID FK→projects | YES | NULL | warranty-tracker:117, warranty/page:119 | INSERT |
| process_name | TEXT | NO | — | warranty-tracker:118 | INSERT |
| completed_date | DATE | NO | — | warranty-tracker:119 | INSERT |
| warranty_period_months | INTEGER | NO | — | warranty-tracker:120 | INSERT |
| warranty_expires_date | DATE | NO | — | **DB trigger 자동 계산** | SELECT, ORDER BY, filter (.lt/.gt/.gte/.lte) |
| reminder_sent_30d | BOOLEAN | NO | false | WarrantyRecord type:88 | (future cron용) |
| reminder_sent_7d | BOOLEAN | NO | false | WarrantyRecord type:89 | (future cron용) |
| created_at | TIMESTAMPTZ | NO | NOW() | WarrantyRecord type:90 | SELECT |

**warranty_expires_date trigger/function 계획:**

src 코드 주석 (warranty-tracker.ts:5): `warranty_expires_date는 DB 트리거(trg_warranty_expires)가 자동 계산한다.`

필요한 DB 객체:

1. **Function: `calculate_warranty_expires()`**
   - 입력: `completed_date` + `warranty_period_months`
   - 출력: `completed_date + warranty_period_months * INTERVAL '1 month'`
   - `NEW.warranty_expires_date := NEW.completed_date + (NEW.warranty_period_months * INTERVAL '1 month');`

2. **Trigger: `trg_warranty_expires`**
   - BEFORE INSERT OR UPDATE ON warranty_tracking
   - FOR EACH ROW EXECUTE FUNCTION calculate_warranty_expires()
   - UPDATE 시에도 completed_date나 warranty_period_months 변경되면 재계산

3. **대안 비교:**
   - Generated column: `warranty_expires_date DATE GENERATED ALWAYS AS (completed_date + warranty_period_months * INTERVAL '1 month') STORED` — PostgreSQL 12+에서 가능하나 INTERVAL 연산이 generated column에서 제한적
   - BEFORE INSERT/UPDATE trigger: **권장** — 유연하고 src 코드 주석과 일치

**RLS:** project_members scoped via project_id. INSERT는 service_role path (warranty-tracker.ts uses SERVICE_ROLE_KEY) + client path (warranty/page.tsx uses client supabase).

---

**P1 (주요 페이지에서 사용):**

#### P1-3: site_issues (6 refs)

**Key Files:** issues/page.tsx, projects/page.tsx, classify-issue/route.ts, prediction-engine.ts, autoWorkflow.ts

**Field Map (src 역추출):**

| Column | Type | Nullable | Default | Source | Operation |
|--------|------|----------|---------|--------|-----------|
| id | UUID PK | NO | gen_random_uuid() | — | auto |
| project_id | UUID FK→projects | NO | — | autoWorkflow:55, projects/page:78 | INSERT, DELETE filter |
| user_id | UUID FK→auth.users | NO | — | autoWorkflow:56 | INSERT |
| title | TEXT | NO | — | autoWorkflow:57 | INSERT |
| description | TEXT | YES | NULL | autoWorkflow:58 | INSERT |
| severity | TEXT | NO | — | autoWorkflow:59 `'high'` | INSERT, SELECT filter |
| status | TEXT | NO | 'open' | issues/page:66 | UPDATE |
| resolved_at | TIMESTAMPTZ | YES | NULL | issues/page:66 | UPDATE |
| created_at | TIMESTAMPTZ | NO | NOW() | issues/page:29 | SELECT, ORDER BY |

**RLS:** project_members scoped. DELETE는 project owner만 허용 고려.

---

#### P1-4: verification_certificates (12 refs)

**Key Files:** profile/page.tsx, certificate/page.tsx, certificateService.ts, VerificationBadge.tsx, share pages, verify page

**Field Map (src 역추출 — types/verification.ts + certificateService.ts 기반):**

| Column | Type | Nullable | Default | Source | Operation |
|--------|------|----------|---------|--------|-----------|
| id | UUID PK | NO | gen_random_uuid() | — | auto |
| project_id | UUID FK→projects | NO | — | certificateService:110 | INSERT |
| user_id | UUID FK→auth.users | NO | — | certificateService:111 | INSERT |
| code | TEXT UNIQUE | NO | — | certificateService:112, `'CHK-2026-XXXXX'` | INSERT, SELECT filter |
| total_score | NUMERIC | NO | — | certificateService:113 `score.total` | INSERT, SELECT (certificate/page:180, VerificationBadge:41, verify page:72) |
| grade | TEXT | NO | — | certificateService:114 | INSERT, SELECT |
| cost_score | NUMERIC | NO | — | certificateService:115 | INSERT |
| process_score | NUMERIC | NO | — | certificateService:116 | INSERT |
| contract_score | NUMERIC | NO | — | certificateService:117 | INSERT |
| schedule_score | NUMERIC | NO | — | certificateService:118 | INSERT |
| project_name | TEXT | NO | — | certificateService:119 `project.name` | INSERT |
| industry | TEXT | YES | NULL | certificateService:120 | INSERT |
| client_name | TEXT | YES | NULL | certificateService:121 | INSERT |
| status | TEXT | NO | 'active' | certificateService:122, CHECK ('active','expired','revoked') | INSERT, UPDATE, SELECT filter |
| badge_eligible | BOOLEAN | NO | — | certificateService:123 `score.total >= 70` | INSERT |
| issued_at | TIMESTAMPTZ | NO | — | certificateService:124 | INSERT, ORDER BY |
| expires_at | TIMESTAMPTZ | NO | — | certificateService:125 | INSERT, 만료 체크 |
| created_at | TIMESTAMPTZ | NO | NOW() | types/verification.ts:26 | auto |
| updated_at | TIMESTAMPTZ | NO | NOW() | types/verification.ts:27 | auto |

**overall_score vs total_score 호환 전략 — 확정:**

사용처 전수 분석:

| Column | Usage Count | Files | Operation |
|--------|------------|-------|-----------|
| total_score | 7+ | verification.ts:13 (type), certificateService:113 (INSERT), certificate/page:180, VerificationBadge:41,55, verify/page:72, tools-extended:1042 | type def, INSERT, display |
| overall_score | 2 | profile/page:56 (SELECT), share/page:137,154 (SELECT) | SELECT only |

**결론: total_score = primary persisted column, overall_score = generated column**

- DB에 `total_score NUMERIC NOT NULL`를 정규 컬럼으로 생성한다 (TypeScript type + INSERT + 다수 display 기준)
- DB에 `overall_score NUMERIC GENERATED ALWAYS AS (total_score) STORED`를 generated column으로 생성한다
- profile/page와 share/page의 `.select('overall_score')` 호출이 DB에서 직접 해소된다
- src 코드 변경 없이 양쪽 호환 달성

Generated column 적용 가능성:
- PostgreSQL 12+ 지원 (Supabase는 PostgreSQL 15 사용)
- `GENERATED ALWAYS AS (total_score) STORED`는 단순 참조이므로 제약 없음
- INSERT 시 overall_score를 지정하면 에러 → 현재 src INSERT에서 overall_score를 지정하지 않으므로 안전

대안이 불필요한 이유:
- 일반 컬럼 + trigger sync: 불필요한 복잡성
- src 코드에서 overall_score → total_score 변경: DB-only 해결이 가능하므로 코드 변경 불필요

**RLS — 확정:**

| Context | Policy | Detail |
|---------|--------|--------|
| Dashboard (인증 사용자) | project_members scoped SELECT | `EXISTS (SELECT 1 FROM project_members WHERE project_id = verification_certificates.project_id AND user_id = auth.uid())` |
| INSERT/UPDATE | service_role only | certificateService는 createAdminClient(service_role) 사용. client INSERT 없음. WITH CHECK(true) 금지. |
| 공개 share link | API route + service_role + projection allowlist | 아래 §6.1-share 참조. base table anon public SELECT 없음. |
| 공개 코드 검증 (/verify/[code]) | service_role API 경유 | certificateService.verifyCertificate()는 createAdminClient 사용. client-side direct access 없음. |

#### §6.1-share: Public Share Access 전략 — 확정 (API Route with Service Role)

**기존 Share-linked public RLS 전략은 폐기한다.**

폐기 사유:
- base table에 active share EXISTS만으로 anon public SELECT를 허용하면, RLS는 컬럼 제한이 불가능하므로 `select *` 요청 시 base table 행 전체가 노출된다
- projects, processes, quote_line_items, change_orders, diagnostic_responses, verification_certificates 6개 테이블에 동일 패턴을 적용하면 과공개 위험이 심각하다
- user_id, client_name, budget, internal scores 등 비공개 필드가 anon에게 노출될 수 있다

**확정 전략: API Route with Service Role + Token 검증 + Projection Allowlist**

원칙:
1. public share page는 client supabase로 base table을 직접 조회하지 않는다
2. public share page는 API route (`/api/share/[shareId]`)를 호출한다
3. API route가 service_role key로 shares 테이블을 server-side only로 조회한다
4. API route가 token/shareId match, `is_active = true`, `expires_at > NOW()`를 검증한다
5. API route가 service_role key로 필요한 base table을 조회한다
6. API route가 허용된 컬럼만 response에 포함한다 (projection allowlist)
7. DB base tables는 project_members/user scoped RLS만 유지한다
8. anon public SELECT RLS는 shares 포함 어떤 base table에도 만들지 않는다
9. anon 클라이언트는 shares 테이블을 직접 조회할 수 없다 — shares token 검증은 API route service role 내부 조회로만 처리한다
10. client는 shares 또는 base table을 직접 SELECT 하지 않는다

**src 코드 변경 필요 범위:**

현재 share page는 client supabase direct select를 사용한다 (share/[shareId]/page.tsx). API route 전환 시 share page의 Supabase 호출을 API fetch로 변경해야 한다. 이 코드 변경은 SQL baseline 보정 이후, 별도 단계에서 수행한다. Codex review 필요.

**SECURITY DEFINER RPC/View 대안 비교:**

| Approach | Pros | Cons | 채택 |
|----------|------|------|------|
| **API route + service_role** | 컬럼 allowlist + token 검증을 코드에서 명확히 제어. 표준 Next.js 패턴. | src 코드 변경 필요 (share page → API fetch) | **O (채택)** |
| SECURITY DEFINER RPC | DB 내부 projection 가능, SQL만으로 해결 | 함수 보안/search_path/권한 실수 위험. Supabase PostgREST에서 RPC 호출 시 인자 노출 가능. 디버깅 어려움. | X |
| SECURITY DEFINER View | View로 공개 컬럼만 노출, anon에게 view SELECT 허용 | View 생성/관리 복잡. 테이블당 view 필요. token 검증을 view에서 하려면 set_config/current_setting 필요 → 복잡. | X |

**채택 근거:** API route가 가장 단순하고 안전하다. 컬럼 allowlist는 TypeScript 코드에서 명시적으로 제어되며, token 검증 로직이 투명하다. DB 수준 공개 정책이 없으므로 RLS 설계가 단순해진다.

---

**§6.1.1: 6개 테이블별 Public Projection Allowlist**

API route가 public share response에 포함할 컬럼 allowlist:

**1. projects (share/page.tsx:118 — 현재 `select('*')`)**

| Allowed | Blocked |
|---------|---------|
| name, status, progress, industry, start_date, end_date, risk_score, risk_grade | user_id, client_name, client_phone, budget, address, description (보안 검토 대상) |

Note: client_name은 공유 대상에 따라 허용 여부 다름. 보안 검토 대상으로 표시.

**2. processes (share/page.tsx:129 — 현재 `select('id, name, status, progress, start_date, end_date')`)**

| Allowed | Blocked |
|---------|---------|
| id, name, status, progress, start_date, end_date | project_id, order_index (내부 구조 노출 최소화) |

**3. quote_line_items (share/page.tsx:131 — 현재 `select('quantity, unit_price')`)**

| Allowed | Blocked |
|---------|---------|
| quantity, unit_price (합계 계산용) | id, project_id, description, 기타 세부 |

**4. change_orders (share/page.tsx:133 — 현재 `select('amount')`)**

| Allowed | Blocked |
|---------|---------|
| amount (합계 계산용) | id, project_id, title, description, status, 기타 세부 |

**5. diagnostic_responses (share/page.tsx:135 — 현재 `select('checked')`)**

| Allowed | Blocked |
|---------|---------|
| checked (완료율 계산용) | id, project_id, question, response, 기타 세부 |

**6. verification_certificates (share/page.tsx:137 — 현재 `select('grade, overall_score')`)**

| Allowed | Blocked |
|---------|---------|
| grade, overall_score (= total_score generated), status, badge_eligible, issued_at, expires_at | user_id, project_id, code, cost_score, process_score, contract_score, schedule_score, client_name (내부 점수 원장) |

Note: project_name은 masked/optional (보안 검토 대상). 공유 컨텍스트에서 이미 프로젝트를 특정할 수 있으므로 허용 가능.

**Projection 금지 필드 (전 테이블 공통):** share_token, project_id, user_id, client_name, internal metadata, private notes. `select *` 금지.

**§6.1.2: Share Layout (OG Metadata) 처리**

share/[shareId]/layout.tsx는 server component로 `createClient` from `@/lib/supabase/server`를 사용한다. server component가 service_role을 사용하는 경우 RLS 우회가 가능하므로, layout의 OG metadata 조회는 현재 코드 그대로 동작할 수 있다. 확인 필요:
- `@/lib/supabase/server`의 createClient가 service_role인지 anon인지 → SQL 보정 후 런타임 검증 대상

**§6.1.3: SQL Baseline 영향**

이 전략에서 canonical-safe-baseline.sql에 추가할 public RLS policy: **없음.**

- shares 포함 모든 base table에 anon public SELECT policy를 추가하지 않는다
- shares 테이블의 기존 "Active shares are publicly readable" 정책은 **삭제한다** — shares base table anon public SELECT is prohibited
- verification_certificates 등 6개 data table도 project_members/user scoped RLS만 유지한다
- shares table은 authenticated project owner/member scoped RLS만 유지한다 (owner CRUD + member SELECT)
- shares token validation is performed only inside API route using service role
- API route 구현은 SQL baseline 범위 밖 (src 코드 변경 → 별도 단계)

**§6.1.4: 실행 순서**

| Step | Action | Scope |
|------|--------|-------|
| 1 | canonical-safe-baseline.sql 보정: shares "Active shares are publicly readable" 정책 삭제 + base table RLS만 유지 + public policy 없음 | SQL |
| 2 | SQL Codex review + 익현 승인 | Review |
| 3 | DB 적용 | DB |
| 4 | share page → API route 전환 구현 (share token 검증 + projection allowlist) | src 코드 |
| 5 | API route Codex review | Review |
| 6 | share page 런타임 검증 | QA |

Step 1-3은 DB baseline 범위. Step 4-6은 별도 코드 변경 단계.

**중요:** canonical baseline 적용과 public share API route 전환은 같은 release gate로 묶는다. API route 전환 전에는 public share 기능을 production-ready로 보지 않는다. 새 dev Supabase에서도 share access는 API route projection 설계 완료 후 검증한다.

---

#### P1-5: proactive_notifications (9 refs)

**Key Files:** NotificationCenter.tsx, proactive-engine.ts, prediction-engine.ts, handlers.ts

**Field Map (src 역추출 — proactive-engine.ts:399-410 + handlers.ts:34-43 기반):**

| Column | Type | Nullable | Default | Source | Operation |
|--------|------|----------|---------|--------|-----------|
| id | UUID PK | NO | gen_random_uuid() | — | auto |
| user_id | UUID FK→auth.users | NO | — | proactive-engine:400, handlers:35 | INSERT, SELECT filter |
| project_id | UUID FK→projects | YES | NULL | proactive-engine:401, handlers:36 | INSERT |
| trigger_type | TEXT | NO | — | proactive-engine:402, handlers:37 | INSERT |
| severity | TEXT | NO | — | proactive-engine:403, handlers:38 | INSERT |
| title | TEXT | NO | — | proactive-engine:404, handlers:39 | INSERT |
| message | TEXT | NO | — | proactive-engine:405, handlers:40 | INSERT |
| action_url | TEXT | YES | NULL | proactive-engine:406, handlers:41 | INSERT |
| action_label | TEXT | YES | NULL | proactive-engine:407, handlers:42 | INSERT |
| metadata | JSONB | YES | NULL | proactive-engine:408, handlers:43 `{ riskScore, source }` | INSERT |
| read | BOOLEAN | NO | false | proactive-engine:409, NotificationCenter:90 `.eq('read', false)` | INSERT, SELECT filter, UPDATE |
| created_at | TIMESTAMPTZ | NO | NOW() | NotificationCenter:91 `.gte('created_at', todayStart)` | SELECT filter, ORDER BY |

**trigger_type 전체 관측값 (src 코드 전수 확인):**

| # | Value | Source | Line | Description |
|---|-------|--------|------|-------------|
| 1 | `WARRANTY_EXPIRING` | proactive-engine.ts (ProactiveTriggerType) | 22 | 하자담보 만료 임박 |
| 2 | `AI_CHECK_PENDING` | proactive-engine.ts (ProactiveTriggerType) | 23 | 미확인 AI 확인 |
| 3 | `DISPUTE_UNRESOLVED` | proactive-engine.ts (ProactiveTriggerType) | 24 | 미해결 기록 관리 징후 |
| 4 | `PROCESS_NEXT_STEP` | proactive-engine.ts (ProactiveTriggerType) | 25 | 공정 완료 후 다음 단계 |
| 5 | `DAILY_REPORT_MISSING` | proactive-engine.ts (ProactiveTriggerType) | 26 | 일보 미작성 |
| 6 | `RISK_HIGH` | handlers.ts INSERT | 37 | 리스크 점수 높음 |
| 7 | `DISPUTE_SIGNAL` | handlers.ts INSERT | 63 | 기록 관리 징후 감지 |
| 8 | `WARRANTY_REGISTER` | handlers.ts INSERT | 89 | 하자담보 등록 안내 |
| 9 | `DEADLINE_OVERDUE` | handlers.ts INSERT | 115 | 마감 초과 알림 |

**trigger_type CHECK 전략 — 확정:**

CHECK 제약 없이 `TEXT` 타입으로 둔다. app-level validation만 사용.

근거:
- 현재 관측값 9개이나, handlers.ts 패턴상 새 이벤트 타입 추가 시 trigger_type 값도 늘어남
- CHECK 제약을 두면 코드에서 새 trigger_type 추가 시 DB migration이 필요 → 경직
- trigger_type은 내부 서비스 path(service_role)에서만 INSERT → 외부 입력 검증 불필요
- app-level validation: ProactiveTriggerType union type + handlers.ts 상수로 충분

대안 비교:

| Option | Pros | Cons | 채택 |
|--------|------|------|------|
| CHECK 9값 고정 | DB 무결성 강제 | 새 값 추가 시 ALTER TABLE 필요, 경직 | X |
| CHECK 없이 TEXT | 유연, migration 불필요 | DB 무결성 약화 | **O (채택)** |
| ENUM type | 명확한 타입 | PostgreSQL ENUM 변경이 번거로움 | X |

Risk: trigger_type CHECK 미적용으로 잘못된 값 입력 가능 → Risk Register에 등록 (INSERT가 service_role 전용이므로 실질 위험 낮음)

**severity 값 범위 (ProactiveSeverity):** `CRITICAL`, `WARNING`, `INFO` — 3값 고정. CHECK 적용 가능 (변경 가능성 낮음).

```sql
severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO'))
```

**RLS:** user_id = auth.uid() 기반. INSERT는 service/internal path (proactive-engine uses SERVICE_ROLE_KEY, handlers uses createClient server-side). client-side는 SELECT/UPDATE만 (NotificationCenter). public access 금지.

**INSERT path 정리:**
- proactive-engine.ts: Vercel Cron POST → service_role key 사용 → 다건 INSERT
- handlers.ts: eventBus 이벤트 → server-side createClient → 단건 INSERT
- 두 경로 모두 서버 측. 클라이언트에서 직접 INSERT 없음.

**P2 (기능 보조):**

| # | Table | .from() Count | Key Files | 최소 컬럼 |
|---|-------|---------------|-----------|-----------|
| 6 | quote_analyses | 4 | quotes/page, quote-analyzer, budget-guide | id, project_id, total_amount, overcharge_items, undercharge_items, overall_risk, ai_comment, analyzed_at |
| 7 | daily_reports | 3 | autoWorkflow, tools-extended | id, project_id, user_id, date, auto_check_count, go_count, nogo_count, created_at |
| 8 | contractor_badges | 1 | ContractorBadge | id, user_id, badge_level, usage_months, pass_rate, dispute_count, created_at |

**P3 (벤치마크 참조 데이터):**

| # | Table | .from() Count | Key Files | 최소 컬럼 |
|---|-------|---------------|-----------|-----------|
| 9 | price_benchmarks | 1 | benchmarks.ts | id, category, space_type, region, size_min_pyeong, size_max_pyeong, price_per_pyeong, is_active |
| 10 | labor_rates | 1 | benchmarks.ts | id, trade_name, daily_rate, reference_year |
| 11 | process_benchmarks | 2 | benchmarks.ts | id, process_key, avg_duration_days, avg_cost_per_pyeong |
| 12 | estimate_validations | 1 | estimate/validate/route | id, project_id, user_id, quoted_total, benchmark_low, benchmark_avg, benchmark_high, deviation_percent, overall_status, total_amount_status, created_at |

### 6.2 RLS 정책 방향

| Table | RLS 정책 |
|-------|---------|
| dispute_signals | project_members scoped (project_id → project_members join) |
| warranty_tracking | project_members scoped |
| site_issues | project_members scoped |
| verification_certificates | project_members scoped (SELECT) + owner scoped (INSERT/UPDATE) |
| proactive_notifications | user scoped (user_id = auth.uid()) |
| quote_analyses | project_members scoped |
| daily_reports | project_members scoped |
| contractor_badges | user scoped (user_id = auth.uid()) |
| price_benchmarks | public SELECT (참조 데이터), admin INSERT/UPDATE |
| labor_rates | public SELECT, admin INSERT/UPDATE |
| process_benchmarks | public SELECT, admin INSERT/UPDATE |
| estimate_validations | user scoped |

### 6.3 baseline 추가 여부

12개 전부 추가한다. src에서 .from() 호출이 있으므로 DB에 없으면 런타임 에러.

---

## 7. Baseline-only Tables Review

| # | Table | 분류 | 근거 |
|---|-------|------|------|
| 1 | mandatory_processes | **KEEP (future use)** | 진단 필수공정, all-in-one.sql 원본. src 미참조이나 진단 확장 시 필요 |
| 2 | operational_constraints | **KEEP (future use)** | 운영 제약, 동일 |
| 3 | scope_items | **KEEP (future use)** | 공사 범위 항목 |
| 4 | quotes | **KEEP (reference)** | quote_line_items FK 부모. src에서 line_items만 참조하나 FK 무결성 필요 |
| 5 | payments | **KEEP (future use)** | 결제 기능 확장 시 필요 |
| 6 | compliance_checks | **KEEP (future use)** | 준수 검사. compliance_evidence FK 부모 |
| 7 | compliance_evidence | **KEEP (future use)** | 준수 증거 |
| 8 | defect_updates | **KEEP (reference)** | defects FK 자식. defects는 src 참조됨 |
| 9 | audit_logs | **KEEP (future use)** | 감사 로그, activity_logs와 별도 용도 |
| 10 | special_terms | **KEEP (future use)** | 특약 사항 |
| 11 | timeline_events | **KEEP (future use)** | 타임라인 이벤트 |
| 12 | service_payments | **KEEP (future use)** | 서비스 결제 |
| 13 | read_receipts | **KEEP (future use)** | 읽음 확인 |

**결론:** 13개 전부 KEEP. 이유:
- 삭제 시 복구 어려움
- 존재해도 앱 동작에 해 없음
- FK 무결성 (quotes → quote_line_items, compliance_checks → compliance_evidence 등)
- 향후 기능 확장 대비

**익현 최종 판단 필요:** 삭제 원하면 별도 지시.

---

## 8. Status Enum / CHECK Correction Plan

### 8.1 현재 상태

| Source | Values |
|--------|--------|
| Baseline CHECK | `planning`, `diagnosis`, `in_progress`, `completed`, `disputed` |
| Src status map | `planning`, `in_progress`, `review`, `completed` |

### 8.2 Gap 분석

| Value | Baseline | Src | Action |
|-------|----------|-----|--------|
| planning | O | O | KEEP |
| in_progress | O | O | KEEP |
| completed | O | O | KEEP |
| review | X | O | **ADD** — src에서 사용, 없으면 INSERT 실패 |
| diagnosis | O | X | **KEEP** — all-in-one.sql 원본, 향후 진단 기능 |
| disputed | O | X | **KEEP** — dispute_signals 테이블과 연관 |

### 8.3 통합 CHECK 제안

```sql
CHECK (status IN ('planning', 'diagnosis', 'in_progress', 'review', 'completed', 'disputed'))
```

- 기존 5개 유지 + `review` 추가 = 6개
- 삭제 없음 → 기존 데이터 호환성 보장
- src에서 review 사용 가능해짐

### 8.4 위험

- 값이 6개로 늘어나나, 실제 사용은 src 코드가 제어
- diagnosis, disputed는 미래 기능용으로 예비

---

## 9. Storage Correction Plan

### 9.1 현재 상태

| Bucket | Baseline | Src Calls | Direction |
|--------|----------|-----------|-----------|
| evidence | O (private, project_members RLS) | 19 calls / 8 files | **KEEP** — 핵심 버킷 |
| avatars | O (public read + 본인 폴더 write) | 0 calls | **KEEP** — 프로필 아바타 확장 대비, 존재해도 무해 |
| project-files | O (private, auth.uid() 폴더) | 0 calls | **KEEP** — 파일 관리 확장 대비, 존재해도 무해 |
| templates | baseline에 없음 | 0 calls | **추가하지 않음** |

### 9.2 Storage Policy 방향

| Bucket | Policy |
|--------|--------|
| evidence | project_members 기반: 같은 프로젝트 멤버만 upload/view/delete. 현재 baseline 정책 유지. |
| avatars | public read + auth.uid() 폴더 write/update. 현재 baseline 정책 유지. |
| project-files | auth.uid() 폴더 기반. 현재 baseline 정책 유지. |

### 9.3 보정 필요 사항

evidence bucket의 baseline RLS 정책이 project_members join을 사용하는데, projects 테이블의 owner_id → user_id 변경이 이 정책에 영향을 주는지 확인 필요. evidence policy 내에서 projects 테이블을 직접 join하지 않으면 영향 없음.

---

## 10. RLS Safety Plan

### 10.1 분류별 정책 원칙

| 분류 | 대상 테이블 | 정책 |
|------|-----------|------|
| **Owner/User scoped** | projects, profiles, user_settings, contractor_badges, proactive_notifications, estimate_validations | `auth.uid() = user_id` |
| **Project members scoped** | project_members, diagnostic_responses, change_orders, defects, files, reports, shares, custom_checklist_items, evidence_files, cost_analysis, agreements, processes, workforce, materials, comparison_pairs, issues, change_requests, issue_comments, notebooks, ai_check_results, law_checks, risk_scores, warranties, dispute_signals, warranty_tracking, site_issues, verification_certificates, quote_analyses, daily_reports, quote_line_items, scope_items, compliance_checks, compliance_evidence, defect_updates, special_terms, timeline_events | `EXISTS (SELECT 1 FROM project_members WHERE project_id = <table>.project_id AND user_id = auth.uid())` |
| **Public reference data** | laws, knowledge_chunks, price_benchmarks, labor_rates, process_benchmarks | `USING(true)` FOR SELECT only. INSERT/UPDATE는 service_role only. |
| **Admin/Service only** | audit_logs, activity_logs | INSERT: service_role. SELECT: user scoped or project_members scoped. |
| **Standalone** | clients, payments, service_payments, read_receipts, mandatory_processes, operational_constraints, quotes, notifications | 케이스별 판단 (user_id 또는 project_id 기반) |

### 10.2 절대 금지

- DISABLE RLS: 어떤 테이블에도 금지
- USING(true): public reference data(laws, knowledge_chunks, benchmarks) SELECT 외 금지
- WITH CHECK(true): 금지
- authenticated-only INSERT/UPDATE: 반드시 user/member 범위 제한
- anon public SELECT on shares: 금지 — shares 테이블은 project_members scoped만 허용. "Active shares are publicly readable" 정책은 삭제 대상
- anon public SELECT on data tables: shares, projects, processes, quote_line_items, change_orders, diagnostic_responses, verification_certificates — 7개 테이블 모두 anon public SELECT 금지
- anon clients must not query shares directly — public share access must go through API route projection only

---

## 11. Implementation Plan — Not Executed

이 plan은 실행하지 않는다. 단계만 작성한다.

| Step | Action | Gate |
|------|--------|------|
| 1 | 이 correction plan을 Codex review | Codex PASS 필요 |
| 2 | PASS 후 canonical-safe-baseline.sql 보정 | SQL 수정 승인 필요 |
| 3 | 보정된 SQL diff review (git diff) | 변경 범위 확인 |
| 4 | 보정된 baseline Codex review | Codex PASS 필요 |
| 5 | PASS 후 새 Supabase target 연결 확인 | 연결 테스트 |
| 6 | 적용 전 final dry checklist | 체크리스트 작성 |
| 7 | DB 적용 여부 총감독(익현) 최종 판정 | 익현 승인 필요 |

**현재 위치: Step 1 이전 (plan 작성 완료, Codex review 대기)**

---

## 12. Risk Register

| # | Risk | Level | Mitigation |
|---|------|-------|------------|
| 1 | src 기준 보정 시 보안 약화 | MEDIUM | RLS Safety Plan(§10) 엄격 적용, Codex 보안 리뷰 |
| 2 | owner_id → user_id 변경 시 트리거/함수 깨짐 | HIGH | auto_add_project_owner, backfill_project_owner, recalculate_risk_score 동시 보정 |
| 3 | status CHECK 값 난립 (6개) | LOW | 실사용은 src 코드가 제어, 예비값은 미래 기능용 |
| 4 | 12개 누락 테이블 최소 설계 부정확 | MEDIUM | src .from() 호출에서 역추출, 실행 후 런타임 테스트로 검증 |
| 5 | RLS 정책 누락 | HIGH | 모든 테이블 ENABLE RLS 필수, §10 정책 매핑 전수 적용 |
| 6 | storage policy drift | LOW | evidence만 활성 사용, avatars/project-files는 기존 정책 유지 |
| 7 | FK 참조 변경 (profiles → auth.users) | MEDIUM | auth.users는 Supabase 기본 제공, FK 안전 |
| 8 | 13개 미사용 테이블의 RLS 누락 | LOW | 미사용이어도 ENABLE RLS + project_members scoped 적용 |
| 9 | proactive_notifications trigger_type CHECK 미적용 | LOW | INSERT가 service_role 전용 (proactive-engine, handlers)이므로 외부 입력 없음. app-level TypeScript union으로 검증. |
| 10 | share page → API route 전환 시 src 코드 변경 필요 | MEDIUM | canonical baseline 적용과 API route 전환은 같은 release gate로 묶는다. API route 전환 전에는 public share 기능을 production-ready로 보지 않는다. |
| 11 | API route projection allowlist 누락 | MEDIUM | 7개 테이블별(shares 포함) Allowed/Blocked 컬럼 목록 문서화 완료. 구현 시 allowlist 대조 필수. select * 금지. |
| 12 | layout.tsx server component의 supabase client 종류 미확인 | LOW | service_role이면 RLS 무관. anon이면 API route 필요. SQL 보정 후 런타임 검증 대상. |
| 13 | shares base table "Active shares are publicly readable" 정책 잔존 시 share_token/project_id 노출 | HIGH | baseline SQL 보정 시 해당 정책 삭제 필수. shares table은 authenticated project owner/member scoped RLS만 유지. anon direct query 금지. |

---

## 13. Final Recommendation

| Item | Status |
|------|--------|
| SQL 수정 가능 여부 | **Codex re-review PASS 후 가능** |
| Codex review 필요 여부 | **YES — 이 보정된 plan을 Codex에 재제출** |
| DB 적용 가능 여부 | **NO — SQL 보정 + 재리뷰 + 익현 승인 전까지 금지** |

**확정된 다음 단계 체인:**

| Step | Action | Gate | Scope |
|------|--------|------|-------|
| 1 | 이 correction plan Codex re-review | Codex PASS 필요 | docs |
| 2 | PASS 시 8S 문서 커밋 (docs/audit only) | git commit | docs |
| 3 | canonical-safe-baseline.sql 보정: shares "Active shares are publicly readable" 삭제 + base table RLS만 유지 + public policy 없음 | SQL 수정 승인 | SQL |
| 4 | 보정된 SQL Codex review | Codex PASS 필요 | SQL |
| 5 | PASS 후 SQL 커밋 | git commit | SQL |
| 6 | 익현 승인 | 익현 판정 | — |
| 7 | 새 Supabase target 연결 확인 + DB 적용 | DB 적용 | DB |
| 8 | share page → API route 전환 구현 | 별도 Codex review | src |
| 9 | share page 런타임 검증 | QA | src |

Note: Step 3-7은 SQL baseline 범위. Step 8-9는 별도 코드 변경 단계. canonical baseline 적용과 public share API route 전환은 같은 release gate로 묶는다. API route 전환 전에는 public share 기능을 production-ready로 보지 않는다. 새 dev Supabase에서도 share access는 API route projection 설계 완료 후 검증한다.

**현재 위치: Step 1 (Codex re-review 대기)**

---

## 14. Forbidden Actions Confirmation

이 문서 작성 과정에서 다음 행위는 **일절 수행하지 않았다:**

- [x] 코드 수정: 0회
- [x] SQL 수정: 0회
- [x] DB 실행: 0회
- [x] SQL 적용: 0회
- [x] migration 실행: 0회
- [x] .env.local 열람: 0회
- [x] .env.local.bak 열람: 0회
- [x] 시크릿 출력: 0회
- [x] git add/commit/push: 0회

이 문서는 순수 정적 분석(grep, read) 결과물이다.

---

*End of Step 8S Canonical Baseline Correction Plan*
