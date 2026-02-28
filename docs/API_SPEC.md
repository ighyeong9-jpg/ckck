# Check-In API 및 데이터 명세서

> **프로젝트**: Check-In (기록의 편)  
> **백엔드**: Supabase (PostgreSQL + Auth)  
> **문서 기준**: 코드 분석 기반 (애플리케이션 코드 수정 없음)

---

## 1. 개요

- Check-In은 **별도 REST API 서버 없이** Supabase를 직접 사용합니다.
- 클라이언트는 **Next.js 서버 컴포넌트**에서 `@/lib/supabase/server`로 생성한 Supabase 클라이언트로 DB를 조회·갱신합니다.
- 인증은 **Supabase Auth** (이메일/비밀번호 등)를 사용하며, `getUser()`로 로그인 여부를 확인한 뒤 테이블 접근을 수행합니다.

---

## 2. Supabase 테이블 구조

### 2.1 `projects`

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | UUID | PK |
| `owner_id` | UUID | 소유자(사용자) ID, auth.users 참조 |
| `title` | string | 프로젝트명 (코드에서 `name`으로도 참조) |
| `name` | string | 프로젝트명 (title과 동일 용도) |
| `industry` | string | 업종 |
| `address` | string? | 현장 주소 |
| `client_name` | string? | 발주처명 |
| `client_phone` | string? | 발주처 연락처 |
| `start_date` | string? | 시작일 (ISO 날짜) |
| `end_date` | string? | 종료 예정일 |
| `budget` | number? | 공사 금액(원) |
| `risk_score` | number? | 리스크 점수 |
| `risk_grade` | string? | 리스크 등급 |
| `status` | enum | `planning` \| `diagnosis` \| `in_progress` \| `completed` \| `disputed` |
| `progress` | number? | 진행률(0~100) |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

**애플리케이션 사용**: 프로젝트 목록, 상세, 대시보드 통계(전체/진행중/완료 건수).

---

### 2.2 `diagnostic_responses`

사전점검(진단) 항목별 응답.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → projects.id |
| `category` | string | 카테고리 (예: 구조, 설비, 안전) |
| `item_code` | string | 항목 코드 (예: ST001, EQ001, SF001) |
| `status` | enum | `need_check` \| `recommend_fix` \| `confirmed` |
| `note` | string? | 메모 |
| `evidence_urls` | string[]? | 증빙 사진 URL 목록 |
| `recorded_by` | string? | 기록자 |
| `recorded_at` | timestamptz | 기록 시각 |

**item_code 참고**: ST001(현장 청소), ST002(기존 설비), ST003(벽면 균열), EQ001(전기/수도), SF001(안전장비).

**애플리케이션 사용**: 프로젝트별 사전점검 목록, 완료율·탭 카운트.

---

### 2.3 `change_orders`

변경 요청/승인.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → projects.id |
| `change_number` | string | 변경 번호 |
| `title` | string | 제목 |
| `description` | string? | 설명 |
| `reason` | string | 사유 |
| `notes` | string? | 비고 (코드에서 reason 대체 참조) |
| `cost_impact` | number? | 비용 증감 (원) |
| `cost_change` | number? | 비용 증감 (cost_impact 대체) |
| `original_amount` | number? | 변경 전 금액 |
| `changed_amount` | number? | 변경 후 금액 |
| `schedule_impact_days` | number? | 일정 영향(일) |
| `status` | enum | `pending` \| `approved` \| `rejected` |
| `requested_by` | string? | 요청자 |
| `approved_by` | string? | 승인자 |
| `requested_at` | timestamptz | 요청 시각 |
| `approved_at` | timestamptz? | 승인 시각 |

**애플리케이션 사용**: 프로젝트별 변경사항 목록, 금액 증가 합계, 탭 카운트.

---

### 2.4 `defects`

하자 등록/처리.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → projects.id |
| `title` | string | 제목 |
| `description` | string? | 설명 |
| `severity` | enum | `low` \| `medium` \| `high` \| `critical` |
| `status` | enum | `reported` \| `in_progress` \| `resolved` \| `closed` |
| `location` | string? | 위치(현장) |
| `reported_by` | string? | 보고자 |
| `assigned_to` | string? | 담당자 |
| `reported_at` | timestamptz | 보고 시각 |
| `resolved_at` | timestamptz? | 해결 시각 |
| `photos` | array? | 사진 URL 또는 메타 목록 |

**애플리케이션 사용**: 프로젝트별 하자 목록, 미해결 건수·처리율, 탭 카운트.

---

### 2.5 `timeline_events`

프로젝트 타임라인(활동) 이벤트.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → projects.id |
| `event_type` | string | 예: milestone, inspection, change, defect |
| `event_title` | string | 제목 |
| `event_description` | string? | 설명 |
| `event_date` | timestamptz | 이벤트 일시 |
| `created_by` | string? | 생성자 |
| `created_at` | timestamptz | 생성 시각 |

**애플리케이션 사용**: 프로젝트 상세의 "최근 활동" 목록.

---

### 2.6 `payments` (타입 정의 기준)

타입(`src/types/index.ts`)에만 정의되어 있으며, 실제 `from('payments')` 호출은 코드에서 확인되지 않음. 향후 결제 연동 시 사용 가능.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → projects.id |
| `payment_stage` | enum | contract \| mid1 \| mid2 \| final |
| `percentage` | number | 단계별 비율 |
| `amount` | number | 금액(원) |
| `due_date` | string? | 납부 기한 |
| `paid_at` | string? | 납부 일시 |
| `payment_method` | string? | 결제 수단 |
| `transaction_id` | string? | 결제 거래 ID |
| `status` | enum | pending \| paid \| overdue |
| `created_at` | timestamptz | 생성 시각 |

---

### 2.7 `profiles` (타입 정의 기준)

타입에만 정의. Supabase Auth와 연동된 사용자 프로필로 가정.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | UUID | PK, auth.users.id와 동일 |
| `email` | string | 이메일 |
| `full_name` | string? | 이름 |
| `phone` | string? | 연락처 |
| `avatar_url` | string? | 프로필 이미지 URL |
| `role` | enum | admin \| contractor \| client |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

---

## 3. 데이터 접근 패턴 (애플리케이션 기준)

- 모든 데이터 접근은 **서버 측**에서 수행됩니다.
- 인증: `createClient()` 후 `supabase.auth.getUser()`로 사용자 확인. 미로그인 시 fallback 데이터 또는 빈 목록 반환.

### 3.1 프로젝트

- **목록**: `projects` 테이블 `select('*').order('created_at')`
- **상세**: `projects` 테이블 `select('*').eq('id', projectUuid).single()`
- **대시보드 통계**: `projects` 테이블 `select('status')` 후 status별 집계

### 3.2 사전점검

- **목록**: `diagnostic_responses` 테이블 `select('*').eq('project_id', projectUuid).order('recorded_at')`
- **탭 카운트**: `diagnostic_responses` 테이블 `select('id', { count: 'exact', head: true }).eq('project_id', projectUuid)`

### 3.3 변경사항

- **목록**: `change_orders` 테이블 `select('*').eq('project_id', projectUuid).order('requested_at', { ascending: false })`
- **탭 카운트**: `change_orders` 테이블 `select('id', { count: 'exact', head: true }).eq('project_id', projectUuid)`

### 3.4 하자

- **목록**: `defects` 테이블 `select('*').eq('project_id', projectUuid).order('reported_at', { ascending: false })`
- **미해결 건수(탭용)**: `defects` 테이블 `select('id', { count: 'exact', head: true }).eq('project_id', projectUuid).neq('status', 'resolved')`

### 3.5 타임라인

- **최근 활동**: `timeline_events` 테이블 `select('*').eq('project_id', projectUuid).order('event_date', { ascending: false }).limit(limit)`

---

## 4. 프로젝트 ID 라우팅

- URL에는 **짧은 ID**(예: `1`, `2`, `3`)를 사용할 수 있으며, `src/lib/data/project-routing.ts`에서 UUID로 변환합니다.
- 매핑 예: `1` ↔ `aaaa0001-0001-0001-0001-000000000001` (E2E/테스트용). 매핑에 없으면 전달된 값이 UUID로 그대로 사용됩니다.

---

## 5. 환경 변수 (Supabase)

| 변수명 | 용도 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명(클라이언트) 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 서비스 롤 키 (선택) |

---

## 6. 상태·코드 매핑 (참고)

- **프로젝트 status**: planning(계획), diagnosis(진단), in_progress(진행중), completed(완료), disputed(기록 관리).
- **진단 status**: need_check, recommend_fix, confirmed → UI에서 confirmed면 "완료"로 표시.
- **변경 status**: pending(승인대기), approved(승인), rejected(거부).
- **하자 severity**: critical(긴급), high(높음), medium(보통), low(낮음).
- **하자 status**: reported(미해결), in_progress(처리중), resolved/closed(완료).

이 명세는 **현재 코드 기준**이며, 실제 Supabase 대시보드의 테이블 스키마와 차이가 있을 수 있습니다. RLS 정책 및 인덱스는 Supabase 프로젝트에서 별도 확인이 필요합니다.
