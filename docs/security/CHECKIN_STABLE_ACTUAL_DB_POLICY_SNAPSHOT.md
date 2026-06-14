# Check-In Stable Actual DB Policy Snapshot

> Date: 2026-06-14
> Method: REST API + DNS diagnostic (DB connection unavailable)
> DB execution: 0

---

## DB Connection Status

**DB_CONNECTION_NOT_AVAILABLE**

- Supabase REST API: fetch failed
- Supabase Auth API: fetch failed
- Supabase Storage API: fetch failed
- DNS (system): ECONNREFUSED
- DNS (Google 8.8.8.8): ENOTFOUND
- supabase.co: OK (76.76.21.21)
- google.com: OK

**원인**: Supabase 프로젝트 paused 상태 (DNS 레코드 미등록).

---

## RLS Table State

**수행 불가** — pg_tables 조회 불가.

Phase 1S-B/1S-C 정적 분석 결과 참조:
- `docs/audit/CHECKIN_STABLE_PHASE1S_C_DB_STATE_VERIFICATION.md` Section 3
- `docs/audit/CHECKIN_STABLE_PHASE1S_B_RLS_STORAGE_PRECHECK.md` Section 3

---

## Policies

**수행 불가** — pg_policies 조회 불가.

Phase 1S-B/1S-C 정적 분석 결과 참조:
- `docs/audit/CHECKIN_STABLE_PHASE1S_C_DB_STATE_VERIFICATION.md` Section 4
- `docs/security/CHECKIN_STABLE_RLS_STORAGE_PATCH_PLAN.md`

---

## Schema Columns

**수행 불가** — information_schema / REST API 조회 불가.

Phase 1S-C 정적 분석 결과 참조:
- `docs/security/CHECKIN_STABLE_SCHEMA_VERIFICATION_RESULTS.md`

---

## Foreign Keys

**수행 불가** — constraint 조회 불가.

Phase 1S-C 정적 분석 결과 참조:
- `docs/security/CHECKIN_STABLE_SCHEMA_VERIFICATION_RESULTS.md` Section "Verified Foreign Keys"

---

## Storage Buckets

**수행 불가** — Storage API 접근 불가.

Phase 1S-C 정적 분석 결과 참조:
- `docs/audit/CHECKIN_STABLE_PHASE1S_C_DB_STATE_VERIFICATION.md` Section 7

---

## Storage Object Path Samples

**수행 불가** — Storage API 접근 불가.

---

## Confirmed Risks

없음 — 실제 DB 확인 수행 불가.

---

## Unconfirmed Risks (정적 분석 기준)

| # | 항목 | 심각도 | 정적 분석 결과 | 실제 DB 확인 |
|---|------|--------|---------------|-------------|
| 1 | custom_checklist_items USING(true) 4건 | CRITICAL | 코드에서 확인 | **미확인** |
| 2 | shares USING(true) + shares_public_read 충돌 | HIGH | 코드에서 확인 | **미확인** |
| 3 | 13개 테이블 RLS ENABLE + 정책 0개 | HIGH | 코드에서 확인 | **미확인** |
| 4 | storage project-files authenticated-only | HIGH | 코드에서 확인 | **미확인** |
| 5 | project_members role CHECK 값 충돌 | MEDIUM | 코드에서 확인 | **미확인** |
| 6 | evidence bucket 미정의 | MEDIUM | 코드에서 확인 | **미확인** |
| 7 | DISABLE RLS migration 반영 여부 | MEDIUM | 코드에서 확인 | **미확인** |
| 8 | admin.ts ANON_KEY fallback | MEDIUM | 코드에서 확인 | N/A (코드 이슈) |

---

## Phase 2S Inputs

### DB resume 후 확인 필요 (전량)

1. pg_tables rowsecurity 상태
2. pg_policies 전체 목록 (qual, with_check 포함)
3. custom_checklist_items 실제 컬럼/FK/정책
4. shares 실제 컬럼/정책 (is_active, expires_at)
5. project_members 실제 role CHECK 값
6. profiles 실제 role CHECK 값
7. storage buckets 목록 + policy
8. storage objects path 구조
9. 13개 정책 미정의 테이블 실제 RLS 상태

### DB resume 불요

10. admin.ts ANON_KEY fallback 제거 — 코드 수정만

---

> 실제 DB 확인 수행 불가. Supabase 프로젝트 paused.
> 모든 위험 항목은 정적 분석 기준이며 실제 DB 상태 미확인.
> resume 후 이 문서를 실제 데이터로 업데이트 필요.
