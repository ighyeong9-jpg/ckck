# Check-In Phase 1S-E Step 8R — Schema-Code Compatibility Map

> Date: 2026-06-14 (Step 8R-R revision: 2026-06-14)
> Author: Claude Code (Opus 4.6)
> Role: Phase 1S-E Step 8R 담당자 (Read-Only Analysis)
> Baseline Commit: d90abda (canonical-safe-baseline.sql, 45 tables)
> Branch: develop
> Verdict: **HOLD — 7 Blocking Gaps Found**
> Revision: Step 8R-R — B-7 storage 보정, evidence 사용처 보정, Option B 문구 명확화, .env.local.bak 상태 반영

---

## 1. Executive Summary

canonical-safe-baseline.sql (d90abda)과 src/ Supabase 호출을 전수 매핑한 결과,
**7개 Blocking Gap**이 확인되어 이 baseline을 그대로 새 Supabase에 적용하면 앱이 정상 작동하지 않는다.

주요 문제:
- projects 테이블의 컬럼명 3개 불일치 (owner_id↔user_id, title↔name, progress 누락)
- projects.status CHECK 제약 값 불일치
- 12개 테이블이 src에서 참조되나 baseline에 없음
- 13개 테이블이 baseline에 있으나 src에서 미참조
- 스토리지 버킷 불일치 (project-files src 미사용, avatars 문서 누락, evidence 사용처 과소 집계)

**이 문서는 읽기 전용 분석이며, 코드·SQL·DB 수정은 일절 없다.**

---

## 2. Repository State

| Item | Value |
|------|-------|
| HEAD | d90abda `feat: write canonical safe SQL baseline for new Supabase DB` |
| Branch | develop |
| Working tree | Clean (M CLAUDE.md only) |
| .env.local.bak | NOT present (Test-Path = False, repo root에 없음, 내용 열람 없음) |
| Baseline file | supabase/canonical-safe-baseline.sql (1684 lines, 45 tables) |

---

## 3. Supabase Call Inventory

### 3.1 Total .from() Calls in src/

**501 calls** across 45 unique table names.

### 3.2 Storage Bucket Calls

**Baseline storage buckets (canonical-safe-baseline.sql 기준):** project-files, avatars, evidence
**templates bucket은 canonical-safe-baseline.sql에 없다.**

| Bucket | Baseline | Src Calls | Src Files | Status |
|--------|----------|-----------|-----------|--------|
| evidence | O (private, project_members 기반 RLS) | 19 | 8 | MATCH — 다수 사용 |
| avatars | O (public read + 본인 폴더 write/update) | 0 | 0 | Baseline-only |
| project-files | O (private, auth.uid() 폴더 기반) | 0 | 0 | Baseline-only |

**evidence storage.from('evidence') 사용처 상세:**

| # | File | Lines | Operations |
|---|------|-------|------------|
| 1 | projects/[id]/evidence-package/page.tsx | 119-120, 166-167, 198-199, 212-213, 249-250 | upload, remove, download, getPublicUrl × 2 |
| 2 | profile/page.tsx | 149, 151, 167, 169 | upload × 2, getPublicUrl × 2 |
| 3 | projects/[id]/gallery/page.tsx | 55, 135, 157 | getPublicUrl, upload, getPublicUrl |
| 4 | projects/[id]/defects/page.tsx | 78, 80 | upload, getPublicUrl |
| 5 | projects/[id]/precheck/page.tsx | 73, 75 | upload, getPublicUrl |
| 6 | projects/[id]/client-view/page.tsx | 97 | getPublicUrl |
| 7 | client/dashboard/page.tsx | 110 | getPublicUrl |
| 8 | client/project/[id]/photos/page.tsx | 47 | getPublicUrl |

### 3.3 Unique Table Names Referenced in src/

```
activity_logs        agreements           ai_check_results
change_orders        change_requests      clients
comparison_pairs     contractor_badges    cost_analysis
custom_checklist_items  daily_reports     defects
diagnostic_responses dispute_signals      estimate_validations
evidence_files       files                issue_comments
issues               knowledge_chunks     labor_rates
law_checks           laws                 materials
notebooks            notifications        price_benchmarks
proactive_notifications  process_benchmarks  processes
profiles             project_members      projects
quote_analyses       quote_line_items     reports
risk_scores          shares               site_issues
user_settings        verification_certificates  warranties
warranty_tracking    workforce
```

---

## 4. Baseline Table Inventory (45 tables)

```
profiles             projects             project_members
diagnostic_responses mandatory_processes   operational_constraints
change_orders        scope_items          quotes
quote_line_items     payments             compliance_checks
compliance_evidence  defects              defect_updates
files                audit_logs           reports
shares               special_terms        timeline_events
notifications        service_payments     read_receipts
custom_checklist_items  evidence_files    cost_analysis
agreements           clients              processes
workforce            materials            user_settings
comparison_pairs     issues               change_requests
issue_comments       activity_logs        notebooks
knowledge_chunks     ai_check_results     laws
law_checks           risk_scores          warranties
```

---

## 5. Blocking Compatibility Gaps

### B-1: projects.owner_id (baseline) vs projects.user_id (src)

**Severity: CRITICAL — App navigation breaks**

| Side | Column | Definition |
|------|--------|------------|
| Baseline | owner_id | `UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` |
| Src code | user_id | Used in insert, FK join, filter — `owner_id` 참조 0건 |

**Src references (20+ locations):**

| File | Line | Pattern |
|------|------|---------|
| projects/page.tsx | 110 | `.insert([{ ...formData, user_id: user.id, progress: 0 }])` |
| projects/new/page.tsx | 173 | `user_id: user.id` |
| Sidebar.tsx | 117-119 | `projects!inner(user_id)` FK join × 3 queries |
| MobileTabBar.tsx | 44-46 | `projects!inner(user_id)` FK join × 3 queries |
| TodayStatusBar.tsx | 86-97 | `projects!inner(user_id)` FK join × 3 queries |
| proactive-engine.ts | 67,77 | `projects(name, user_id)` select + filter |
| photos/auto-process/route.ts | 25 | `project.user_id !== user.id` ownership check |
| useProjectRole.ts | 47 | `.eq('user_id', user.id)` |

**영향:**
- PostgREST FK join `projects!inner(user_id)`는 projects 테이블에 `user_id` 컬럼이 없으면 즉시 실패
- Sidebar, MobileTabBar, TodayStatusBar 모두 깨짐 → 앱 전체 네비게이션 불능

---

### B-2: projects.title (baseline) vs projects.name (src)

**Severity: CRITICAL — Project display breaks**

| Side | Column |
|------|--------|
| Baseline | `title TEXT NOT NULL` |
| Src code | `name` (10+ locations, `title` 참조 0건 on projects table) |

**Src references:**

| File | Line | Pattern |
|------|------|---------|
| projects/[id]/layout.tsx | 20 | `.select('name')` |
| projects/[id]/certificate/page.tsx | 31 | `.select('name')` |
| projects/[id]/diagnostic/page.tsx | 120 | `.select('name, industry')` |
| projects/[id]/process/page.tsx | 50 | `.select('name')` |
| projects/[id]/report/page.tsx | 61 | `.select('name, risk_score')` |
| projects/[id]/sow/page.tsx | 157 | `.select('name')` |
| ai-chat/page.tsx | 75 | `.select('id, name, client_name, status, risk_score, progress')` |
| reports/page.tsx | 42 | `.select('*, projects(name)')` |
| tools-extended.ts | 1059 | `.select('name, progress')` |
| proactive-engine.ts | 67 | `projects(name, user_id)` |

---

### B-3: projects.progress 컬럼 누락

**Severity: CRITICAL — Project creation & display breaks**

Baseline projects 테이블에 `progress` 컬럼이 없다.

**Src references (30+ locations):**

| File | Line | Pattern |
|------|------|---------|
| projects/page.tsx | 110 | `.insert([{ ...formData, user_id: user.id, progress: 0 }])` |
| projects/new/page.tsx | 178,206 | `progress: 0` insert |
| projects/[id]/diagnostic/page.tsx | 220 | `.update({ progress })` |
| ai-chat/page.tsx | 75 | `.select('..., progress')` |
| tools-extended.ts | 406 | `.select('progress')` |
| tools-extended.ts | 454,480 | `progress: 0` insert |
| tools-extended.ts | 552 | `.select('start_date, end_date, progress')` |
| tools-extended.ts | 1059 | `.select('name, progress')` |
| tools-auto.ts | 682 | `progress: 0` insert |
| process/page.tsx | 38,69,84,98,124,132,162,177,185,239 | 다수 progress 참조 |

---

### B-4: projects.status CHECK 제약 불일치

**Severity: HIGH — 'review' status insert fails**

| Side | Allowed Values |
|------|---------------|
| Baseline | `planning`, `diagnosis`, `in_progress`, `completed`, `disputed` |
| Src code | `planning`, `in_progress`, `review`, `completed` |

- Src에서 `review` 상태 사용 → baseline CHECK 위반으로 INSERT/UPDATE 실패
- Baseline의 `diagnosis`, `disputed`는 src status map에 없음

**Src reference:**
- projects/page.tsx:180 — `{ planning: '기획', in_progress: '진행중', review: '검토', completed: '완료' }`

---

### B-5: 12 테이블 src 참조 존재, baseline 누락

| # | Table | .from() Count | Key Files |
|---|-------|---------------|-----------|
| 1 | dispute_signals | 7 | Sidebar.tsx, MobileTabBar.tsx, TodayStatusBar.tsx, brain.ts, ContractorBadge.tsx |
| 2 | warranty_tracking | 10 | Sidebar.tsx, MobileTabBar.tsx, TodayStatusBar.tsx, warranty/page.tsx, warranty-tracker.ts, proactive-engine.ts |
| 3 | site_issues | 6 | issues/page.tsx, projects/page.tsx, defects/page.tsx, tools-auto.ts |
| 4 | verification_certificates | 12 | profile/page.tsx, certificate/page.tsx, certificateService.ts, VerificationBadge.tsx, share pages |
| 5 | proactive_notifications | 9 | NotificationCenter.tsx, proactive-engine.ts, tools-auto.ts, prediction-engine.ts |
| 6 | quote_analyses | 4 | quotes/page.tsx, quote-analyzer.ts |
| 7 | daily_reports | 3 | autoWorkflow.ts, tools-extended.ts |
| 8 | process_benchmarks | 2 | benchmarks.ts |
| 9 | contractor_badges | 1 | ContractorBadge.tsx |
| 10 | estimate_validations | 1 | estimate/validate/route.ts |
| 11 | price_benchmarks | 1 | benchmarks.ts |
| 12 | labor_rates | 1 | benchmarks.ts |

**총 영향 파일: 30개**

dispute_signals + warranty_tracking이 Sidebar/MobileTabBar/TodayStatusBar에서 사용되므로, 이 2개가 없으면 네비게이션 컴포넌트 전체에서 에러 발생.

---

### B-6: 13 테이블 baseline 존재, src 미참조

| # | Table | Origin SQL |
|---|-------|-----------|
| 1 | mandatory_processes | all-in-one.sql |
| 2 | operational_constraints | all-in-one.sql |
| 3 | scope_items | all-in-one.sql |
| 4 | quotes | all-in-one.sql |
| 5 | payments | all-in-one.sql |
| 6 | compliance_checks | all-in-one.sql |
| 7 | compliance_evidence | all-in-one.sql |
| 8 | defect_updates | all-in-one.sql |
| 9 | audit_logs | all-in-one.sql |
| 10 | special_terms | all-in-one.sql |
| 11 | timeline_events | all-in-one.sql |
| 12 | service_payments | all-in-one.sql |
| 13 | read_receipts | all-in-one.sql |

Note: `quote_line_items`는 src에서 참조됨. 부모 `quotes`는 미참조.

**판단:** 이 13개 테이블은 all-in-one.sql에 정의되어 있으나 현재 앱에서 사용하지 않는다.
baseline에 포함해도 앱 동작에 해는 없으나, 불필요한 테이블이 DB에 생성된다.

---

### B-7: 스토리지 버킷 불일치

**Baseline buckets (canonical-safe-baseline.sql 기준):** project-files, avatars, evidence
**templates는 canonical-safe-baseline.sql에 없다.**

| Bucket | Baseline | Src | Status |
|--------|----------|-----|--------|
| evidence | O (private, project_members RLS) | O (19 calls, 8 files) | MATCH — 핵심 버킷 |
| avatars | O (public read + 본인 폴더 write) | X (0 calls) | Baseline-only |
| project-files | O (private, auth.uid() 폴더) | X (0 calls) | Baseline-only |

- evidence: src에서 가장 활발히 사용되는 스토리지 버킷. upload, download, remove, getPublicUrl 전부 사용.
- avatars: baseline에 public read + 본인 폴더 write/update 정책 존재. src에서 아직 미사용이나, 프로필 아바타 기능 확장 시 필요.
- project-files: baseline에 auth.uid() 폴더 기반 정책 존재. src에서 미사용.

---

## 6. Cross-Reference: Codex 리뷰 4건 대비

| Codex Issue | 이 분석 결과 |
|-------------|-------------|
| projects.owner_id vs user_id | **B-1 확인.** owner_id는 src 참조 0건. user_id 20+건. |
| projects.progress 누락 | **B-3 확인.** 30+ 참조, insert/select/update 전부. |
| dispute_signals, warranty_tracking 누락 | **B-5 확인.** 추가 10개 더 발견 (총 12개 누락). |
| project-files 정책 설명 불일치 | **B-7 보정 완료.** templates는 baseline에 없음. avatars 누락 반영. evidence 19 calls/8 files로 보정. |

**Codex가 발견하지 못한 추가 Blocking Gap:**
- B-2: projects.title↔name 컬럼명 불일치
- B-4: projects.status CHECK 제약 값 불일치 (review vs diagnosis/disputed)
- B-5: 추가 10개 누락 테이블 (Codex는 2개만 지적)
- B-6: 13개 미사용 테이블 존재

---

## 7. Decision Options

### Option A: Baseline → Code (Baseline을 기준으로 src 수정)

| Pros | Cons |
|------|------|
| Baseline SQL은 보안 검증 완료 (ENABLE RLS, safe policies) | src 코드 변경 규모 큼 (30+ 파일) |
| 깨끗한 스키마 설계 유지 | 12개 누락 테이블의 스키마를 새로 설계해야 함 |
| owner_id가 의미적으로 명확 | PostgREST FK join 패턴 전수 변경 |

**예상 작업량:** L4-L5 (src 30+ 파일 수정, 테스트 전수 업데이트)
**위험:** 코드 변경 중 기능 누락·regression 가능

---

### Option B: Code → Baseline (src 코드를 기준으로 baseline 수정)

| Pros | Cons |
|------|------|
| src 코드 변경 없음 → regression 위험 0 | Baseline SQL 재작성 필요 |
| 현재 동작하는 앱 기준이므로 확실 | 12개 누락 테이블 스키마를 src에서 역추출해야 함 |
| 가장 빠른 경로 | 보안 검증(RLS) 재수행 필요 |

**예상 작업량:** L3 (baseline SQL만 수정, 12개 테이블 추가)
**위험:** 역추출 스키마의 정확성, RLS 정책 재검증

---

### Option C: Compatibility Bridge (양쪽 최소 수정)

| Pros | Cons |
|------|------|
| 양쪽 변경 최소화 | 양쪽 모두 변경 → 디버깅 복잡 |
| 타협점 찾기 가능 | bridge 로직 자체가 기술부채 |
| - | 양쪽 다 중도반단 상태 |

**예상 작업량:** L4 (baseline 일부 + src 일부 수정)
**위험:** 부분 수정 시 일관성 훼손

---

## 8. Recommended Fix Plan

**권장: Option B (Code → Baseline) — src 코드 기준으로 canonical baseline SQL을 보정한다.**

이 문서에서 말하는 권장 방향은 src 코드 기준으로 canonical baseline SQL을 보정한다는 뜻이다.
현재 DB 미적용 상태이므로, 동작 중인 src Supabase 호출을 truth source로 삼는다.

근거:
1. src 코드가 현재 **동작하는 앱**이며, 이것이 truth source
2. Baseline SQL은 아직 **어디에도 적용되지 않은** 문서일 뿐
3. src 코드 30+ 파일을 일괄 수정하는 것보다 SQL 1개 파일을 수정하는 것이 안전
4. 12개 누락 테이블도 src 코드에서 스키마를 역추출하면 됨
5. RLS 정책은 수정된 baseline에 대해 재검증 수행

**Option B 실행 시 필요한 작업:**

| # | Task | Description |
|---|------|-------------|
| 1 | projects 컬럼 보정 | owner_id→user_id, title→name, progress 추가, status CHECK 보정 |
| 2 | 12개 누락 테이블 추가 | src .from() 호출에서 스키마 역추출 + ENABLE RLS + safe policies |
| 3 | 13개 미사용 테이블 판단 | 유지 or 제거 → 익현 결정 필요 |
| 4 | 스토리지 버킷 판단 | avatars(baseline-only, 향후 확장 가능), project-files(baseline-only, src 미사용) 유지 or 제거 → 익현 결정 필요 |
| 5 | RLS 정책 재검증 | 수정된 baseline 전체에 대해 safe policy 재확인 |
| 6 | auto_add_project_owner 트리거 보정 | owner_id→user_id로 변경 시 트리거 로직 업데이트 |
| 7 | Codex 재리뷰 | 수정된 baseline을 Codex에 재제출 |

---

## 9. Forbidden Actions Confirmation

이 문서 작성 과정에서 다음 행위는 **일절 수행하지 않았다:**

- [x] src 코드 수정: 없음
- [x] SQL 파일 수정: 없음
- [x] DB 접속/실행: 없음
- [x] .env.local 읽기/수정: 없음
- [x] git add / commit / push: 없음
- [x] npm run build / test / lint: 없음
- [x] Supabase REST/Auth/Storage API 호출: 없음
- [x] 새 마이그레이션 파일 생성: 없음

이 문서는 순수 정적 분석(grep, sed, read) 결과물이다.

---

## Appendix A: Missing Table Reference Map

### dispute_signals (7 refs)

```
src/components/layout/Sidebar.tsx:117
src/components/MobileTabBar.tsx:45
src/components/dashboard/TodayStatusBar.tsx:86
src/components/ContractorBadge.tsx:49-73
src/lib/ai/brain.ts:110
src/lib/ai/proactive-engine.ts:166
src/lib/events/handlers.ts
```

### warranty_tracking (10 refs)

```
src/components/layout/Sidebar.tsx:119
src/components/MobileTabBar.tsx:46
src/components/dashboard/TodayStatusBar.tsx:96
src/app/(dashboard)/warranty/page.tsx:85-137
src/lib/ai/proactive-engine.ts:66
src/lib/ai/warranty-tracker.ts:115-171
src/components/project/ProjectTimeline.tsx
src/app/api/agent/tools-extended.ts
src/app/share/[shareId]/page.tsx
src/app/share/[shareId]/layout.tsx
```

### site_issues (6 refs)

```
src/app/(dashboard)/issues/page.tsx:29,66
src/app/(dashboard)/projects/page.tsx:78
src/app/(dashboard)/projects/[id]/defects/page.tsx
src/app/api/agent/tools-auto.ts
src/app/api/ai/classify-issue/route.ts
```

### verification_certificates (12 refs)

```
src/app/(dashboard)/profile/page.tsx:55
src/app/(dashboard)/projects/[id]/certificate/page.tsx
src/components/verification/VerificationBadge.tsx
src/lib/verification/certificateService.ts:37-195
src/app/share/[shareId]/page.tsx
src/app/share/[shareId]/layout.tsx
(+ 6 more in related files)
```

### proactive_notifications (9 refs)

```
src/components/notification/NotificationCenter.tsx:87-198
src/lib/ai/proactive-engine.ts
src/lib/ai/prediction-engine.ts
src/app/api/agent/tools-auto.ts
(+ 5 more)
```

### quote_analyses (4 refs)

```
src/app/(dashboard)/quotes/page.tsx
src/lib/ai/quote-analyzer.ts:222-245
src/app/api/ai/budget-guide/route.ts
(+ 1 more)
```

### daily_reports (3 refs)

```
src/lib/automation/autoWorkflow.ts:131-143
src/app/api/agent/tools-extended.ts
(+ 1 more)
```

### process_benchmarks (2 refs)

```
src/lib/estimate/benchmarks.ts:70-154
(+ 1 more)
```

### contractor_badges (1 ref)

```
src/components/ContractorBadge.tsx:49-73
```

### estimate_validations (1 ref)

```
src/app/api/estimate/validate/route.ts:61
```

### price_benchmarks (1 ref)

```
src/lib/estimate/benchmarks.ts
```

### labor_rates (1 ref)

```
src/lib/estimate/benchmarks.ts
```

---

## Appendix B: Unreferenced Baseline Tables

| Table | Origin | Note |
|-------|--------|------|
| mandatory_processes | all-in-one.sql | 진단 필수공정 |
| operational_constraints | all-in-one.sql | 운영 제약 |
| scope_items | all-in-one.sql | 공사 범위 항목 |
| quotes | all-in-one.sql | 견적서 (quote_line_items만 참조됨) |
| payments | all-in-one.sql | 결제 |
| compliance_checks | all-in-one.sql | 준수 검사 |
| compliance_evidence | all-in-one.sql | 준수 증거 |
| defect_updates | all-in-one.sql | 하자 업데이트 |
| audit_logs | all-in-one.sql | 감사 로그 (activity_logs와 별도) |
| special_terms | all-in-one.sql | 특약 사항 |
| timeline_events | all-in-one.sql | 타임라인 이벤트 |
| service_payments | all-in-one.sql | 서비스 결제 |
| read_receipts | all-in-one.sql | 읽음 확인 |

---

*End of Step 8R Schema-Code Compatibility Map*
