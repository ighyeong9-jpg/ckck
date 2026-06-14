# Check-In Phase 1S-E New Supabase Setup Plan

> Date: 2026-06-14
> Revised: 2026-06-14 (Phase 1S-E-R — Codex HOLD feedback 반영)
> Auditor: Claude Code (Static Analysis)
> Target: E:/dev/check-in-stable (branch: develop)
> Prerequisite: Phase 1S-C commit 23981de, Phase 1S-C-DBR HOLD (DB paused)
> DB execution: 0

---

## 1. Executive Summary

### Verdict (항목별 분리)

| 항목 | 판정 | 사유 |
|------|------|------|
| New Supabase project creation | **PASS candidate** | 기존 paused, data 0, 새 시작이 유리 |
| Env replacement (3 keys) | **PASS candidate** | URL, ANON, SERVICE_ROLE만 교체 |
| Schema/RLS/Storage application | **HOLD** | canonical safe baseline 작성 + Codex review 전 SQL 적용 금지 |
| Existing SQL deletion | **NO** | 기존 SQL 파일은 reference/inventory 용도로 유지 |
| Direct migration replay | **NO** | 기존 migration 파일 직접 실행 금지 |

### 핵심 원칙

1. **위험 SQL을 먼저 적용하고 나중에 패치하는 방식 금지**
2. **canonical safe SQL baseline을 작성하고 Codex review 후에만 새 DB에 적용**
3. **DISABLE RLS / USING(true) / WITH CHECK(true) / authenticated-only storage 정책은 canonical baseline에 포함 금지**
4. **기존 SQL 파일은 삭제하지 않음 — reference/inventory 용도로만 유지**

### 새 Supabase vs 기존 Resume 비교

| 항목 | 새 Supabase | 기존 Resume |
|------|------------|-------------|
| env 교체 | 3개 (URL, ANON, SERVICE_ROLE) | 0개 |
| schema 적용 | canonical baseline 작성 후 적용 | 이미 적용됨 (추정) |
| RLS 안전 정책 | **canonical baseline에서 처음부터 안전하게 적용** | USING(true) 등 위험 정책 잔존 |
| DISABLE RLS migration | **canonical baseline에 포함 안 함** | 이미 적용됐을 수 있음 |
| 기존 데이터 | 없음 (data 0 확인) | 없음 (data 0 확인) |
| 프로젝트 위치 | 명확 | 불확실 |
| 소요 시간 | 프로젝트 생성 10분 + canonical 작성 별도 | 불확실 (resume 가능 여부 불명) |

**data 0이므로 새 프로젝트가 유리. 단, SQL 적용은 canonical baseline 완료 후.**

---

## 2. Current Repository State

| 항목 | 값 |
|------|-----|
| Branch | `develop` |
| HEAD | `a6ed32c` docs: add Phase 1S-C DB verification and policy snapshot |
| Previous | `23981de` docs: verify db state and schema constraints |
| git status | ` M CLAUDE.md` (non-scope) |
| Remote | `https://github.com/ighyeong9-jpg/ckck.git` |

---

## 3. Required Environment Variables

| 변수명 | 용도 | 구분 | 새 프로젝트 시 교체 | .env.example |
|--------|------|------|-------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | client+server | **YES** | YES |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon JWT | client+server | **YES** | YES |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin JWT | server only | **YES** | YES |
| `GEMINI_API_KEY` | Gemini AI API | server only | NO (변경 불요) | NO |
| `ANTHROPIC_API_KEY` | Claude AI API | server only | NO | NO |
| `CRON_SECRET` | Cron 인증 | server only | NO | NO |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Toss Payments | client | NO | YES |
| `NEXT_PUBLIC_KAKAO_APP_KEY` | 카카오 공유 | client | NO | NO |
| `NEXT_PUBLIC_APP_URL` | 앱 base URL | client | NO | YES |
| `NEXT_PUBLIC_APP_NAME` | 앱 이름 | client | NO | YES |

**교체 필요: 3개** (SUPABASE 관련만)

---

## 4. Schema / Migration Inventory (Reference Only)

> **이 섹션은 inventory 목적이다. 이 파일들을 직접 새 DB에 적용하지 않는다.**
> **canonical safe baseline이 이 파일들을 참조하여 안전한 SQL만 추출한다.**

### 기본 Schema 파일 (non-migration)

| 파일 | 라인 | 역할 | Direct Apply | 위험 |
|------|------|------|-------------|------|
| `all-in-one.sql` | 547 | 전체 스키마 + 트리거 + 함수 (통합본) | **REFERENCE ONLY** | LOW — 가장 완전한 단일 파일 |
| `schema.sql` | 404 | 테이블/인덱스/함수만 (all-in-one 부분) | **REFERENCE ONLY** | LOW |
| `rls.sql` | 95 | RLS ENABLE + 정책 | **DANGEROUS_DO_NOT_APPLY** | HIGH — USING(true) 포함 |
| `storage.sql` | 40 | Storage bucket + 정책 | **DANGEROUS_DO_NOT_APPLY** | HIGH — authenticated-only |
| `seed.sql` | 12 | 시드 데이터 | **REFERENCE ONLY** | LOW |
| `fix-rls.sql` | 22 | projects DISABLE RLS | **DANGEROUS_DO_NOT_APPLY** | CRITICAL |
| `reset-projects.sql` | 23 | projects 리셋 + DISABLE RLS | **DANGEROUS_DO_NOT_APPLY** | CRITICAL |
| `create-missing-tables.sql` | 281 | 누락 테이블 보충 | **REFERENCE ONLY** | MEDIUM |
| `create-missing-tables-clean.sql` | 294 | 위와 동일 (clean 버전) | **REFERENCE ONLY** | MEDIUM |

### Migration 파일

| 파일 | 라인 | 역할 | Direct Apply | DISABLE RLS | Unsafe Policy | 위험 |
|------|------|------|-------------|-------------|---------------|------|
| `001_create_projects.sql` | 44 | projects 테이블 (구버전) | **REFERENCE ONLY** | NO | — | LOW |
| `002_create_diagnostic_responses.sql` | 21 | diagnostic_responses | **DANGEROUS_DO_NOT_APPLY** | **YES** | — | MEDIUM |
| `003_create_quote_line_items.sql` | 25 | quote_line_items | **DANGEROUS_DO_NOT_APPLY** | **YES** | — | MEDIUM |
| `004_create_cost_analysis.sql` | 32 | cost_analysis | **DANGEROUS_DO_NOT_APPLY** | **YES** | — | MEDIUM |
| `005_create_change_orders.sql` | 26 | change_orders | **DANGEROUS_DO_NOT_APPLY** | **YES** | — | MEDIUM |
| `006_create_evidence_files.sql` | 23 | evidence_files | **DANGEROUS_DO_NOT_APPLY** | **YES** | — | MEDIUM |
| `007_create_agreements.sql` | 38 | agreements | **DANGEROUS_DO_NOT_APPLY** | **YES** | — | MEDIUM |
| `008_create_reports.sql` | 31 | reports | **DANGEROUS_DO_NOT_APPLY** | **YES** | — | MEDIUM |
| `009_create_all_tables.sql` | 136 | clients, processes 등 6개 | **DANGEROUS_DO_NOT_APPLY** | **YES (6개)** | — | MEDIUM |
| `20240220_add_custom_checklist_items.sql` | 63 | custom_checklist_items + RLS | **DANGEROUS_DO_NOT_APPLY** | NO | **USING(true) 4건** | CRITICAL |
| `20240304_comparison_pairs.sql` | 83 | comparison_pairs | **REFERENCE ONLY** | NO | — | LOW |
| `20240305_project_collaboration.sql` | 422 | 협업 시스템 (issues 등) | **REFERENCE ONLY** | NO | — | LOW |
| `20240305_project_collaboration_v2.sql` | 389 | 위와 동일 (순환참조 제거) | **REFERENCE ONLY** | NO | — | LOW |
| `20240306_add_user_email_to_comments.sql` | 5 | issue_comments에 user_email 추가 | **REFERENCE ONLY** | NO | — | LOW |
| `20260219_add_knowledge_rpc.sql` | 35 | 벡터 검색 RPC | **REFERENCE ONLY** | NO | — | LOW |
| `20260219_add_missing_columns.sql` | 24 | 누락 컬럼 추가 | **REFERENCE ONLY** | NO | — | LOW |
| `20260219_add_vector_search.sql` | 51 | pgvector 테이블 | **REFERENCE ONLY** | NO | — | LOW |
| `20260219_create_activity_logs.sql` | 75 | activity_logs | **REFERENCE ONLY** | NO | — | LOW |
| `20260219_fix_embedding_dimension.sql` | 49 | 임베딩 차원 수정 | **REFERENCE ONLY** | NO | — | LOW |
| `20260219_v2_schema_update.sql` | 82 | v2 컬럼 추가 (shares.is_active 등) | **REFERENCE ONLY** | NO | — | LOW |
| `20260226_add_law_engine_tables.sql` | 130 | 법령 테이블 4개 | **DANGEROUS_DO_NOT_APPLY** | **YES (4개)** | — | MEDIUM |
| `20260226_seed_laws.sql` | 186 | 법령 시드 12개 | **REFERENCE ONLY** | NO | — | LOW |
| `20260227_add_fire_safety_laws.sql` | 82 | 소방 법령 5개 추가 | **REFERENCE ONLY** | NO | — | LOW |
| `20260227_projects_new_fields.sql` | 28 | projects 컬럼 추가 | **REFERENCE ONLY** | NO | — | LOW |

### DANGEROUS_DO_NOT_APPLY 파일 요약

| 분류 | 파일 | 사유 |
|------|------|------|
| DISABLE RLS | fix-rls.sql | DISABLE ROW LEVEL SECURITY 포함 |
| DISABLE RLS | reset-projects.sql | DISABLE + DELETE 포함 |
| DISABLE RLS | 002~009 migration (8개) | 각각 DISABLE ROW LEVEL SECURITY 포함 |
| DISABLE RLS | 20260226_add_law_engine_tables.sql | DISABLE RLS 4건 (laws, law_checks, risk_scores, warranties) |
| Unsafe Policy | rls.sql | USING(true) 정책 포함 (shares, custom_checklist_items) |
| Unsafe Policy | storage.sql | authenticated-only project-files 정책 |
| Unsafe Policy | 20240220_add_custom_checklist_items.sql | USING(true) / WITH CHECK(true) 4건 |

**총 13개 파일 direct apply 금지. 이 파일들의 안전한 부분만 canonical baseline에 추출.**

---

## 5. RLS / Storage Security Baseline (Canonical Baseline 설계 원칙)

> **이 섹션은 canonical safe SQL baseline 작성 시 따를 원칙이다.**
> **canonical baseline은 별도 문서/파일로 작성하며, Codex review 후에만 새 DB에 적용한다.**

### Canonical Baseline에 포함해야 할 정책

| 대상 | 적용 내용 | 출처 | 안전성 |
|------|----------|------|--------|
| 24개 테이블 RLS ENABLE | ALTER TABLE ... ENABLE ROW LEVEL SECURITY | rls.sql (ENABLE 부분만) | SAFE |
| profiles SELECT/UPDATE | auth.uid() 기반 | rls.sql (안전 정책) | SAFE |
| projects SELECT/UPDATE/INSERT | owner_id + project_members 기반 | rls.sql (안전 정책) | SAFE |
| project_members SELECT/ALL | project_id 기반 | rls.sql (안전 정책) | SAFE |
| shares SELECT | **is_active + expires_at 조건** | Phase 1S-B 패치안 | SAFE |
| custom_checklist_items 4건 | **project_members 기반** | Phase 1S-B 패치안 | SAFE |
| storage project-files | **project_members 기반** (path 구조 확인 후) | Phase 1S-B 패치안 | SAFE |
| storage avatars | public + 본인 폴더 | storage.sql (안전 정책) | SAFE |
| storage evidence | **신규 설계 필요** | Phase 1S-B 발견 | TBD |

### Canonical Baseline에 절대 포함 금지

| 정책/구문 | 사유 |
|-----------|------|
| `USING(true)` | 무조건 허용 — 접근 제어 무효화 |
| `WITH CHECK(true)` | 무조건 허용 — 쓰기 제어 무효화 |
| `DISABLE ROW LEVEL SECURITY` | RLS 비활성화 |
| `auth.role() = 'authenticated'` (storage) | 인증만으로 모든 프로젝트 파일 접근 허용 |
| `DROP TABLE ... CASCADE` | 데이터 삭제 위험 |
| `DELETE FROM` | 데이터 삭제 |

---

## 6. New Supabase Manual Steps for 익현

### Step 1: Supabase 대시보드 접속

1. https://supabase.com/dashboard 접속
2. GitHub 계정으로 로그인

### Step 2: 새 프로젝트 생성

1. 좌측 상단 Organization 선택 (또는 Personal)
2. **"New Project"** 클릭
3. 입력 항목:

| 항목 | 추천값 | 주의 |
|------|--------|------|
| Project name | `check-in-stable-dev` | 자유 |
| Database Password | 강력한 비밀번호 | **반드시 별도 저장** (1Password, 메모장 등) |
| Region | `Northeast Asia (ap-northeast-2)` | 한국 사용자 기준 |
| Pricing Plan | Free | 개발 단계 |

4. **"Create new project"** 클릭
5. 생성 완료까지 1~2분 대기

### Step 3: API Keys 확보

1. 프로젝트 생성 완료 후 **Settings → API** 이동
2. 아래 3개 값을 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: .env.local 업데이트

```
# 아래 3줄만 새 값으로 교체
NEXT_PUBLIC_SUPABASE_URL=https://새프로젝트ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=새_anon_key
SUPABASE_SERVICE_ROLE_KEY=새_service_role_key

# 나머지는 그대로 유지
GEMINI_API_KEY=기존값유지
ANTHROPIC_API_KEY=기존값유지
NEXT_PUBLIC_TOSS_CLIENT_KEY=기존값유지
NEXT_PUBLIC_KAKAO_APP_KEY=기존값유지
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Check-In
```

### 절대 주의

- **채팅/메신저/이메일에 key 붙여넣지 말 것**
- **Claude Code 채팅에 key 값 보내지 말 것**
- `.env.local` 파일에만 저장
- `.env.local`은 `.gitignore`에 포함되어 있음 (git에 올라가지 않음)

### Step 5: 완료 알림

- "새 Supabase 만들었다" 또는 ".env.local 업데이트 완료" 라고만 알려주면 됨
- Claude Code가 DNS 확인 → 연결 테스트만 수행 (SQL 적용 안 함)

---

## 7. Setup Sequence Proposal

### 전체 순서

| 단계 | 작업 | 실행 주체 | 전제 | SQL 적용 |
|------|------|----------|------|----------|
| 1 | 이 문서 보정 완료 | Claude Code | Codex HOLD feedback | NO |
| 2 | Codex re-review | Codex | 1 완료 | NO |
| 3 | 새 Supabase 프로젝트 생성 | **익현** (수동) | 2 PASS | NO |
| 4 | .env.local 3개 교체 | **익현** (수동) | 3 완료 | NO |
| 5 | DNS + REST API 연결 확인만 | Claude Code | 4 완료 | **NO — 연결 확인만** |
| 6 | SQL inventory 최종 확정 | Claude Code | 5 PASS | NO |
| 7 | **Canonical Safe SQL Baseline 작성** | Claude Code | 6 완료 | NO — 문서 작성만 |
| 8 | Codex review (canonical baseline) | Codex | 7 완료 | NO |
| 9 | 새 DB에 canonical baseline만 적용 | Claude Code | **8 PASS 필수** | **YES — canonical만** |
| 10 | Phase 1S-C-DBR read-only verification | Claude Code | 9 완료 | NO |
| 11 | Phase 2S 진입 판정 | 총감독 (GPT) | 10 PASS | NO |

### 단계 7 상세: Canonical Safe SQL Baseline 작성 원칙

Canonical baseline은 **새로운 단일 SQL 파일**로 작성한다. 기존 SQL 파일들에서 안전한 부분만 추출하고, 위험한 부분은 Phase 1S-B 패치안으로 대체한다.

**Canonical baseline 작성 규칙:**

1. 기존 SQL 파일을 직접 실행하지 않는다
2. 기존 SQL 파일에서 안전한 CREATE TABLE / ALTER TABLE / CREATE INDEX만 추출한다
3. RLS ENABLE은 포함하되, 위험 정책은 제외한다
4. USING(true) / WITH CHECK(true) 대신 Phase 1S-B 패치안의 안전 정책을 사용한다
5. DISABLE ROW LEVEL SECURITY는 절대 포함하지 않는다
6. Storage bucket 생성은 포함하되, authenticated-only 정책 대신 안전 정책을 사용한다
7. Codex review 없이 적용하지 않는다

### 적용하지 않는 파일 (DANGEROUS_DO_NOT_APPLY)

| 파일 | 사유 |
|------|------|
| `rls.sql` | USING(true) 포함 — risky SQL must not be applied directly |
| `storage.sql` | authenticated-only project-files 정책 — risky SQL must not be applied directly |
| `fix-rls.sql` | DISABLE RLS — DISABLE RLS files are reference only |
| `reset-projects.sql` | DISABLE RLS + DELETE — DISABLE RLS files are reference only |
| `001~009` migration | DISABLE RLS 포함 — DISABLE RLS files are reference only |
| `20240220_add_custom_checklist_items.sql` | USING(true) / WITH CHECK(true) 4건 — risky SQL must not be applied directly |
| `20260226_add_law_engine_tables.sql` | DISABLE RLS 4건 — DISABLE RLS files are reference only |

**RLS/storage policies must be safe at first application. 위험 정책을 먼저 적용하고 나중에 패치하는 방식은 금지.**

### Reference Only 파일 (직접 적용 안 함, canonical 작성 시 참조)

| 파일 | 참조 대상 |
|------|----------|
| `all-in-one.sql` | 테이블 스키마, 인덱스, 함수, 트리거 |
| `schema.sql` | all-in-one 부분 집합 |
| `20240304_comparison_pairs.sql` | comparison_pairs 테이블 |
| `20240305_project_collaboration_v2.sql` | 협업 시스템 테이블 + 안전 RLS |
| `20240306_add_user_email_to_comments.sql` | user_email 컬럼 |
| `20260219_*.sql` (5개) | v2 컬럼, pgvector, activity_logs, RPC |
| `20260226_seed_laws.sql` | 법령 시드 데이터 |
| `20260227_*.sql` (2개) | 소방 법령, 프로젝트 컬럼 |
| `seed.sql` | 시드 데이터 |

---

## 8. Risks

| # | 위험 | 심각도 | 대응 |
|---|------|--------|------|
| 1 | 기존 SQL 직접 적용 시 USING(true) 잔존 | CRITICAL | canonical baseline에 포함 금지 |
| 2 | DISABLE RLS migration 실수 적용 | CRITICAL | DANGEROUS_DO_NOT_APPLY 라벨링 |
| 3 | canonical baseline 없이 SQL 적용 | HIGH | Codex review 전 SQL 적용 금지 원칙 |
| 4 | all-in-one.sql과 migration 간 스키마 충돌 | HIGH | canonical baseline에서 통합 |
| 5 | project_members role CHECK 값 충돌 (소문자 vs 대문자) | MEDIUM | canonical baseline 작성 시 결정 |
| 6 | evidence bucket 정책 미정의 | HIGH | canonical baseline에서 신규 설계 |
| 7 | service_role key .env.local 이외 노출 | CRITICAL | 채팅/커밋/로그 출력 금지 |
| 8 | 20240305 v1 vs v2 중복 적용 | HIGH | v2만 참조, v1 참조 금지 |
| 9 | pgvector extension 미설치 | LOW | Supabase dashboard에서 enable 필요 |

---

## 9. Final Recommendation

### 새 Supabase 생성 여부: **추천 (프로젝트 생성만)**

- 기존 프로젝트: paused, 위치 불확실, data 0
- 새 프로젝트: 깨끗한 시작
- env 교체: 3개만 (SUPABASE 관련)
- 기존 데이터 손실: 없음 (data 0)

### SQL 적용 여부: **HOLD**

- canonical safe SQL baseline 작성 전까지 SQL 적용 금지
- canonical baseline은 Codex review 후에만 새 DB에 적용

### 익현이 해야 할 다음 행동

1. Codex re-review 결과 대기 (이 문서)
2. PASS 시 Supabase 대시보드에서 새 프로젝트 생성 (Section 6 참조)
3. .env.local에 새 키 3개 입력
4. "완료" 알림

### Claude Code가 할 다음 행동

1. Codex re-review 요청 (이 문서)
2. PASS 후 익현 프로젝트 생성 대기
3. DNS + REST API 연결 확인만 (SQL 적용 안 함)
4. canonical safe SQL baseline 작성
5. Codex review 요청 (canonical baseline)
6. PASS 후 canonical baseline만 새 DB에 적용
7. Phase 1S-C-DBR read-only verification

---

## 10. Forbidden Actions Confirmation

| 항목 | 상태 |
|------|------|
| DB/Supabase 실행 | 0회 |
| SQL 적용 | 0회 |
| SQL 파일 수정 | 0회 |
| SQL 파일 삭제 | 0회 |
| migration 실행 | 0회 |
| npm install | 0회 |
| 배포 | 0회 |
| .env.local 내용 출력 | 0회 |
| 시크릿 출력 | 0회 |
| git add/commit/push | 0회 |
| CLAUDE.md 수정 | 0회 |

---

> Phase 1S-E-R 보정 완료.
> New Supabase project creation: **PASS candidate**.
> Schema/RLS/Storage application: **HOLD** until canonical safe baseline is written and reviewed.
> Risky SQL must not be applied directly. DISABLE RLS files are reference only.
> Canonical baseline must exclude unsafe policies.
> RLS/storage policies must be safe at first application.
