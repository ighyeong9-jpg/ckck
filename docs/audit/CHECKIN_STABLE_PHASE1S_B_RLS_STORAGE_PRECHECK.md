# Check-In Stable Phase 1S-B RLS/Storage Security Precheck

> Date: 2026-06-14
> Auditor: Claude Code (Read-Only Precheck)
> Target: E:/dev/check-in-stable (branch: develop)
> Prerequisite: Phase 1S-A commit b1eaeb0

---

## 1. Executive Summary

### Verdict: **HOLD**

기능 개발 가능 여부: **NO** — RLS 정책 수정이 완료되기 전까지 사용자별 데이터 격리가 보장되지 않음.

### TOP 5 위험 항목

| # | 항목 | 심각도 | 이유 |
|---|------|--------|------|
| 1 | `custom_checklist_items` RLS `USING(true)` 4건 | **CRITICAL** | 인증 사용자면 누구나 모든 프로젝트의 체크리스트 CRUD 가능 |
| 2 | `shares` RLS `USING(true)` + `shares_public_read` 충돌 | **HIGH** | 두 정책 동시 존재 시 USING(true)가 우선 → 비활성/만료 shares도 노출 |
| 3 | `storage.objects` project-files 인증만 체크 | **HIGH** | 프로젝트 멤버 아닌 사용자도 모든 project-files 업로드/조회 가능 |
| 4 | 17개 테이블 `DISABLE RLS` migration 존재 | **HIGH** | migration 실행 순서에 따라 실제 DB에서 RLS 비활성 가능 |
| 5 | `admin.ts` ANON_KEY fallback | **MEDIUM** | SERVICE_ROLE_KEY 없으면 ANON_KEY로 admin 클라이언트 생성 → RLS 우회 의도 무효화 |

---

## 2. Repository State

| 항목 | 값 |
|------|-----|
| Branch | `develop` |
| Latest commit | `b1eaeb0` fix: restore dashboard auth guard and block DB mutation script |
| git status | `M CLAUDE.md` (non-scope, Phase 1S-A에서 제외) |
| CLAUDE.md | unrelated modified — 이번 작업에서 수정하지 않음 |

---

## 3. RLS Findings

### 3.1 custom_checklist_items (CRITICAL)

| 파일 | 라인 | 테이블 | 현재 정책 | 위험 | 심각도 |
|------|------|--------|-----------|------|--------|
| `migrations/20240220_add_custom_checklist_items.sql` | 51 | custom_checklist_items | `SELECT USING (true)` | 비인증 포함 전체 공개 | **CRITICAL** |
| 위 | 55 | 위 | `INSERT WITH CHECK (true)` | 누구나 생성 가능 | **CRITICAL** |
| 위 | 59 | 위 | `UPDATE USING (true)` | 누구나 수정 가능 | **CRITICAL** |
| 위 | 63 | 위 | `DELETE USING (true)` | 누구나 삭제 가능 | **CRITICAL** |

**해결 방향**: project_members 기반 접근 제한. 패치 후보는 `docs/security/CHECKIN_STABLE_RLS_STORAGE_PATCH_PLAN.md` 섹션 1 참조.

### 3.2 shares (HIGH)

| 파일 | 라인 | 테이블 | 현재 정책 | 위험 | 심각도 |
|------|------|--------|-----------|------|--------|
| `rls.sql` | 93 | shares | `SELECT USING (true)` | 비활성/만료 shares 포함 전체 노출 | **HIGH** |
| `all-in-one.sql` | 499 | shares | `SELECT USING (true)` | rls.sql과 동일 (중복) | **HIGH** |
| `migrations/20260219_v2_schema_update.sql` | 71 | shares | `SELECT USING (is_active AND expires_at > now())` | 올바른 정책이지만 USING(true)와 공존 시 무효 | **MEDIUM** |

**해결 방향**: `USING(true)` 정책 DROP → `shares_public_read` 조건부 정책만 유지. 패치 후보는 섹션 2 참조.

### 3.3 RLS ENABLE vs DISABLE 충돌

| 상태 | 파일 수 | 테이블 수 |
|------|---------|-----------|
| ENABLE RLS | `all-in-one.sql`, `rls.sql` | 24개 |
| DISABLE RLS | 개별 migration 파일들 | 17개 |

**충돌 목록**: diagnostic_responses, quote_line_items, cost_analysis, change_orders, evidence_files, agreements, reports, clients, processes, workforce, materials, user_settings, activity_logs, laws, law_checks, risk_scores, warranties

**위험**: migration 실행 순서에 따라 최종 RLS 상태가 다름. 실제 DB 상태는 확인 불가 (DB 실행 금지).

### 3.4 정책이 없는 테이블

rls.sql에서 ENABLE RLS 설정되었으나 SELECT/INSERT/UPDATE/DELETE 정책이 정의되지 않은 테이블:

| 테이블 | ENABLE 위치 | 정책 수 | 위험 |
|--------|-------------|---------|------|
| mandatory_processes | rls.sql:11 | 0 | **HIGH** — RLS ON + 정책 0 = 접근 불가 또는 service_role만 접근 |
| operational_constraints | rls.sql:12 | 0 | **HIGH** |
| scope_items | rls.sql:14 | 0 | **HIGH** |
| quotes | rls.sql:15 | 0 | **HIGH** |
| quote_line_items | rls.sql:16 | 0 | **HIGH** |
| payments | rls.sql:17 | 0 | **HIGH** |
| compliance_checks | rls.sql:18 | 0 | **HIGH** |
| compliance_evidence | rls.sql:19 | 0 | **HIGH** |
| defect_updates | rls.sql:21 | 0 | **HIGH** |
| audit_logs | rls.sql:23 | 0 | **HIGH** |
| reports | rls.sql:24 | 0 | **HIGH** |
| special_terms | rls.sql:26 | 0 | **HIGH** |
| timeline_events | rls.sql:27 | 0 | **HIGH** |

13개 테이블이 RLS ENABLE이지만 정책 미정의 상태. 실제 DB에서 이 상태라면 ANON_KEY 사용자는 접근 불가, SERVICE_ROLE_KEY만 접근 가능.

---

## 4. Storage Findings

| 파일 | 라인 | Bucket/Table | 현재 정책 | 위험 | 심각도 | 해결 방향 |
|------|------|-------------|-----------|------|--------|-----------|
| `storage.sql` | 11-15 | `project-files` INSERT | `auth.role() = 'authenticated'` | 인증 사용자 전체 업로드 가능 | **HIGH** | project_members 기반 제한 |
| `storage.sql` | 17-18 | `project-files` SELECT | `auth.role() = 'authenticated'` | 인증 사용자 전체 조회 가능 | **HIGH** | project_members 기반 제한 |
| `storage.sql` | 20-21 | `project-files` DELETE | `auth.uid()::text = foldername[1]` | 업로더만 삭제 가능 (적정) | LOW | 유지 |
| `storage.sql` | 27-28 | `avatars` SELECT | `bucket_id = 'avatars'` | public bucket, 전체 조회 (의도적) | LOW | 유지 |
| `storage.sql` | 30-34 | `avatars` INSERT | `auth.uid()::text = foldername[1]` | 본인 폴더만 업로드 (적정) | LOW | 유지 |
| `storage.sql` | 36-40 | `avatars` UPDATE | `auth.uid()::text = foldername[1]` | 본인 폴더만 수정 (적정) | LOW | 유지 |

### Storage 확장 필요성 (Customer Capture MVP 대비)

고객 사진/도면/견적서가 들어갈 bucket이 현재 `project-files` 하나. 향후 분리 필요:

| 용도 | 권장 bucket | 접근 정책 |
|------|-------------|-----------|
| 고객 제출 사진/영상 | `customer-uploads` | 고객 + 프로젝트 멤버 |
| 도면/측정 데이터 | `project-documents` | 프로젝트 멤버 + 업체 |
| 견적서/제안서/계약서 | `project-contracts` | 프로젝트 소유자 + 고객 (서명 후) |

---

## 5. SERVICE_ROLE Findings

### 5.1 src/ 내 참조 (11곳)

| 파일 | 라인 | 참조 방식 | client/server | 위험 | 해결 방향 |
|------|------|-----------|---------------|------|-----------|
| `src/app/api/ai/proactive/route.ts` | 144 | `process.env.SUPABASE_SERVICE_ROLE_KEY` | server (API route) | LOW | 적정 위치 |
| `src/lib/ai/brain.ts` | 95 | `process.env.SUPABASE_SERVICE_ROLE_KEY` | server (lib) | LOW | 적정 위치 |
| `src/lib/ai/proactive-engine.ts` | 334 | `process.env.SUPABASE_SERVICE_ROLE_KEY` | server (lib) | LOW | 적정 위치 |
| `src/lib/ai/quote-analyzer.ts` | 94, 240 | `process.env.SUPABASE_SERVICE_ROLE_KEY` | server (lib) | LOW | 적정 위치 |
| `src/lib/ai/warranty-tracker.ts` | 108, 138, 163 | `process.env.SUPABASE_SERVICE_ROLE_KEY` | server (lib) | LOW | 적정 위치 |
| `src/lib/knowledge/embedder.ts` | 34 | `process.env.SUPABASE_SERVICE_ROLE_KEY` | server (lib) | LOW | 적정 위치 |
| `src/lib/knowledge/retriever.ts` | 58 | `process.env.SUPABASE_SERVICE_ROLE_KEY` | server (lib) | LOW | 적정 위치 |
| `src/lib/supabase/admin.ts` | 16 | `process.env.SUPABASE_SERVICE_ROLE_KEY` | server (lib) | **MEDIUM** | ANON_KEY fallback 제거 |
| `src/lib/verification/certificateService.ts` | (via admin.ts) | `createAdminClient()` | server (lib) | LOW | admin.ts 수정 시 자동 해결 |
| `src/lib/verification/scoreEngine.ts` | (via admin.ts) | `createAdminClient()` | server (lib) | LOW | admin.ts 수정 시 자동 해결 |

**클라이언트 노출 여부**: `src/app/` 내 client component (`'use client'`)에서 `SUPABASE_SERVICE_ROLE_KEY` 직접 참조 **없음**. API route 1곳에서만 사용. 위험 LOW.

### 5.2 scripts/ 내 참조 (15+ 파일)

모든 scripts 파일이 `.env.local`에서 `SUPABASE_SERVICE_ROLE_KEY`를 읽음. `check-schema.js`만 kill-switch 적용 완료 (Phase 1S-A). 나머지 scripts도 kill-switch 추가 권장.

### 5.3 admin.ts ANON_KEY Fallback

```typescript
const key = serviceRoleKey || anonKey  // ← 위험
```

SERVICE_ROLE_KEY 없으면 ANON_KEY로 admin client 생성 → RLS 우회 의도가 무효화됨. ANON_KEY fallback 제거 권장.

---

## 6. Permission Model Proposal

### 권한 역할

| Role | 설명 | DB 표현 |
|------|------|---------|
| `customer` | 고객 (사진/견적요청 제출자) | `profiles.role = 'customer'` (requires schema verification) |
| `contractor` | 시공업체 대표 | `profiles.role = 'contractor'` |
| `contractor_staff` | 시공업체 직원 | `profiles.role = 'contractor_staff'` |
| `owner` / `admin` | 프로젝트 소유자 | `projects.owner_id = auth.uid()` |
| `head_office_admin` | 본사 관리자 | `profiles.role = 'head_office_admin'` |
| `service_role` | 서버 전용 | `SUPABASE_SERVICE_ROLE_KEY` (코드에서만) |

### 현재 스키마 분석

- **profiles**: `id`, `role` 컬럼 존재 여부 확인 필요 (requires schema verification)
- **projects**: `owner_id UUID NOT NULL REFERENCES profiles(id)` 존재 확인
- **project_members**: `project_id, user_id, role` 존재. UNIQUE(project_id, user_id) 확인
- **shares**: `project_id, share_token, expires_at, is_active, created_by` 존재

### 필요 확장

| 항목 | 현재 | 필요 |
|------|------|------|
| `profiles.role` | 존재 여부 미확인 | customer/contractor/contractor_staff/head_office_admin |
| `project_members.role` | 존재 여부 미확인 | owner/manager/member/viewer |
| `projects.customer_id` | 없음 | 고객 연결용 FK |
| `projects.contractor_id` | 없음 | 시공업체 연결용 FK |
| `organizations` 또는 `workspaces` 테이블 | 없음 | 업체 소속 관리 (다중 직원) |
| `shares.revoked_at` | 없음 | 공유 취소 이력 |

---

## 7. Patch Plan Summary

상세: `docs/security/CHECKIN_STABLE_RLS_STORAGE_PATCH_PLAN.md`

| # | 대상 | 패치 내용 | 상태 |
|---|------|-----------|------|
| 1 | custom_checklist_items | USING(true) → project_members 기반 | DRAFT |
| 2 | shares | USING(true) DROP → is_active + expires_at 조건부 | DRAFT |
| 3 | storage project-files | authenticated → project_members 기반 | DRAFT |
| 4 | admin.ts | ANON_KEY fallback 제거 | DRAFT |
| 5 | 13개 정책 미정의 테이블 | project_members 기반 정책 추가 | 미작성 (schema verification 필요) |
| 6 | 17개 DISABLE RLS migration | 실제 DB 상태 확인 후 판단 | 미작성 |

### 적용 전 필수 사항

1. 실제 DB에서 `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'` 실행
2. 실제 DB에서 `SELECT * FROM pg_policies WHERE schemaname = 'public'` 실행
3. custom_checklist_items, shares 테이블 데이터 존재 확인
4. Rollback SQL 준비
5. Staging/Local Supabase에서 먼저 검증

---

## 8. Remaining HOLD Issues

| 이슈 | 심각도 | 단계 |
|------|--------|------|
| custom_checklist_items RLS USING(true) 4건 | CRITICAL | Phase 2S |
| shares USING(true) + shares_public_read 충돌 | HIGH | Phase 2S |
| storage project-files 인증만 체크 | HIGH | Phase 2S |
| 13개 테이블 정책 미정의 | HIGH | Phase 2S |
| 17개 테이블 DISABLE RLS migration | HIGH | Phase 2S (DB 상태 확인 후) |
| admin.ts ANON_KEY fallback | MEDIUM | Phase 2S |
| 테스트 베이스라인 부재 (0건) | HIGH | Phase 4S |
| Toss Payments 서버 confirm 없음 | MEDIUM | Phase 5S |
| scripts kill-switch 미적용 (check-schema.js 외) | MEDIUM | Phase 2S |

---

## 9. Forbidden Actions Confirmation

| 항목 | 횟수 |
|------|------|
| DB/Supabase 실행 | 0회 |
| migration 실행 | 0회 |
| SQL 적용 | 0회 |
| Supabase CLI 실행 | 0회 |
| scripts/check-schema.js 실행 | 0회 |
| npm install | 0회 |
| npm run dev/build/test | 0회 |
| 배포 | 0회 |
| .env.local 열람 | 0회 |
| 시크릿 출력 | 0회 |
| git add/commit/push | 0회 |
| CLAUDE.md 수정 | 0회 |
| 코드 수정 | 0회 |
| supabase SQL 파일 수정 | 0회 |

---

## 10. Final Recommendation

### 판정: **HOLD**

RLS 정책에 CRITICAL 1건 + HIGH 4건이 있으므로 기능 개발 전 보안 패치가 필요.

### 다음 단계

1. **Codex read-only review** — 이 Precheck 문서 + Patch Plan 문서 검토
2. **DB 상태 확인** — 실제 DB에서 RLS 활성/비활성 상태 + 현재 정책 목록 조회 (익현 승인 하에)
3. **Phase 2S 실행** — Patch Plan의 DRAFT SQL을 schema verification 후 적용
4. **Phase 2S 적용 순서**: custom_checklist_items → shares → storage → admin.ts → 나머지 테이블

### Codex Review 필요 여부

**필수.** Patch Plan SQL이 DRAFT이므로 Codex가 스키마 대조 후 승인해야 함.

---

> Phase 1S-B 완료. 판정: **HOLD**.
> 코드 수정 0회. SQL 파일 수정 0회. DB 실행 0회.
> 문서 2개 생성. 위험 항목 전수조사 완료.
