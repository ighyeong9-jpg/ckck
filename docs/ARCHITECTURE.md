# ARCHITECTURE.md — 체크인 시스템 아키텍처

> 최종 업데이트: 2026-02-27
> 상태: 코드 대조 완료
> 범례: ✅ 구현됨 | 📋 미구현 | ⚠️ 설계와 다름

---

## 1. 시스템 개요

체크인(Check-In)은 인테리어/건설 프로젝트 관리 SaaS다.
현장 소장이 진단부터 리포트까지 전 과정을 디지털로 기록하고 관리하는 플랫폼.

---

## 2. 전체 아키텍처

```mermaid
graph TB
    subgraph Client["클라이언트"]
        WEB[웹 브라우저]
        MOBILE[모바일 브라우저/PWA]
    end

    subgraph Frontend["프론트엔드 (Next.js 13.5.6 App Router)"]
        LANDING[랜딩페이지]
        AUTH[로그인/회원가입]
        DASHBOARD[대시보드]
        PROJECT[프로젝트 관리]
        CHECKLIST[진단/체크리스트]
        EVIDENCE[증빙패키지]
        REPORT[리포트 생성]
        CERT[AI 인증서]
        AI_CHAT[AI 채팅]
        NOTEBOOK[노트북]
    end

    subgraph Backend["백엔드 (Next.js API Routes)"]
        API_CERT[/api/certificate]
        API_VERIFY[/api/verify/:code]
        API_AI[/api/ai/*]
        API_AGENT[/api/agent/route]
        API_SHARE[/api/share]
    end

    subgraph Supabase["Supabase (BaaS)"]
        SUPA_AUTH[Supabase Auth]
        SUPA_DB[(PostgreSQL)]
        SUPA_STORAGE[Supabase Storage]
    end

    subgraph ExternalAI["AI 서비스"]
        GEMINI[Google Gemini API]
        CLAUDE_AI[Anthropic Claude API]
    end

    WEB --> Frontend
    MOBILE --> Frontend
    Frontend --> Backend
    Frontend --> Supabase
    Backend --> Supabase
    Backend --> ExternalAI
    AUTH --> SUPA_AUTH
    EVIDENCE --> SUPA_STORAGE
```

> [GAP] 설계 정본(ARCHITECTURE.md 구버전)에는 PostgreSQL+Prisma ORM 조합을 예상했으나,
> 실제 구현은 **Supabase** (PostgreSQL + Auth + Storage 통합 BaaS)를 사용한다.
> Prisma는 코드에 없고, 모든 DB 접근은 `@supabase/supabase-js` 클라이언트로 처리한다.

---

## 3. 프론트엔드 구조

### 기술 스택 ✅

| 항목 | 설계 예상 | 실제 구현 |
|------|----------|----------|
| 프레임워크 | Next.js (App or Pages Router) | ✅ **Next.js 13.5.6 App Router** |
| 언어 | TypeScript | ✅ TypeScript 5.3.3 |
| 스타일링 | Tailwind CSS | ⚠️ **SASS/SCSS CSS Modules** (Tailwind 아님) |
| 상태관리 | React Context 또는 Zustand | ⚠️ **useState/useEffect만 사용** (전역 상태 라이브러리 없음) |
| 데이터 fetch | SWR 또는 React Query | ⚠️ **Supabase 클라이언트 직접 호출** (SWR/React Query 없음) |

> [GAP] 스타일링: Tailwind CSS 대신 `.module.scss` CSS 모듈 사용.
> 랜딩페이지(`LandingPage.tsx`)는 Tailwind 클래스도 병용하나, 대시보드 전체는 SCSS 모듈.

### 렌더링 전략 ✅

| 페이지 | 설계 | 실제 |
|--------|------|------|
| 랜딩페이지 | SSG | ✅ SSG (정적 랜딩) |
| 로그인 | CSR | ✅ CSR (`'use client'`) |
| 대시보드/프로젝트 | SSR 또는 CSR | ✅ CSR (Supabase 클라이언트 fetch) |
| 리포트 PDF | 서버사이드 | ⚠️ 클라이언트사이드 (html2canvas + jsPDF) |

### 페이지 구조

```
/ → 랜딩페이지 (LandingPage.tsx) ✅
/login → 로그인/회원가입 ✅
/auth/callback → Supabase auth callback ✅
/verify/[code] → 공개 인증서 검증 (비인증) ✅
/share/[shareId] → 공유 링크 (비인증) ✅
/(dashboard)/dashboard → 메인 대시보드 ✅
/(dashboard)/projects → 프로젝트 목록 ✅
/(dashboard)/projects/[id]/diagnostic → 진단 체크리스트 ✅
/(dashboard)/projects/[id]/sow → 견적서 ✅
/(dashboard)/projects/[id]/cost-analysis → 비용분석 ✅
/(dashboard)/projects/[id]/changes → 변경관리 ✅
/(dashboard)/projects/[id]/evidence-package → 증빙패키지 ✅
/(dashboard)/projects/[id]/agreement → 3자 합의 ✅
/(dashboard)/projects/[id]/report → 리포트 ✅
/(dashboard)/projects/[id]/process → 공정관리 ✅
/(dashboard)/projects/[id]/workforce → 인력관리 ✅
/(dashboard)/projects/[id]/materials → 자재관리 ✅
/(dashboard)/projects/[id]/certificate → AI 인증서 ✅
/(dashboard)/projects/[id]/defects → 하자관리 ✅  ⚠️ 설계에 없던 페이지
/(dashboard)/projects/[id]/gallery → 사진갤러리 ✅  ⚠️ 설계에 없던 페이지
/(dashboard)/reports → 전체 리포트 목록 ✅
/(dashboard)/clients → 고객/업체 관리 ✅
/(dashboard)/ai-chat → AI 채팅 ✅  ⚠️ 설계에 없던 페이지
/(dashboard)/notebook → AI 문서 분석 ✅  ⚠️ 설계에 없던 페이지
/(dashboard)/issues → 현장 이슈 ✅  ⚠️ 설계에 없던 페이지
/(dashboard)/warranty → 하자담보 추적 ✅  ⚠️ 설계에 없던 페이지
/(dashboard)/payment → 결제/구독 ✅
/(dashboard)/settings → 설정 ✅
/(dashboard)/profile → 회사 프로필 ✅  ⚠️ 설계에 없던 페이지
```

---

## 4. 백엔드 구조

### API 레이어 구조 ✅

```
요청 → Next.js API Route → (AI 서비스 호출 또는 Supabase 직접 조작) → 응답
```

> [GAP] 설계에서 예상한 `인증 미들웨어 → 권한 체크 → 입력 검증 → 서비스 로직` 패턴은
> 현재 미들웨어(`middleware.ts`)에서 Supabase 세션 갱신만 처리하고,
> 각 API Route에서 직접 Supabase 서버 클라이언트로 사용자 확인한다.

### 실제 구현된 API Routes

| 경로 | 메서드 | 기능 | 상태 |
|------|--------|------|------|
| `/api/certificate` | POST | AI 검증 인증서 발급 | ✅ |
| `/api/verify/[code]` | GET | 인증서 공개 검증 | ✅ |
| `/api/ai/chat` | POST | 역할별 AI 채팅 | ✅ |
| `/api/ai/check` | POST | 현장 사진 AI 자동체크 | ✅ |
| `/api/ai/proactive` | GET/POST | 프로액티브 브리핑 | ✅ |
| `/api/ai/alerts` | POST | AI 리스크 알림 감지 | ✅ |
| `/api/ai/predict` | POST | 리스크 예측 | ✅ |
| `/api/ai/report` | POST | AI 일보 생성 | ✅ |
| `/api/ai/quote-analyze` | POST | 견적 분석 | ✅ |
| `/api/ai/classify-issue` | POST | 현장 이슈 분류 | ✅ |
| `/api/ai/notebook` | POST | 문서 분석 | ✅ |
| `/api/ai/budget-guide` | GET | 예산 가이드 | ✅ |
| `/api/agent/route` | POST | 자율 실행 에이전트 | ✅ |
| `/api/share` | POST | 공유 링크 생성 | ✅ |
| `/api/events/emit` | POST | 이벤트 발행 | ✅ |

> [GAP] 설계에서 예상했던 `/api/auth/*`, `/api/projects/*`, `/api/checklists/*` 등의
> REST API는 **존재하지 않는다**. 이 모든 CRUD는 프론트엔드에서 Supabase 클라이언트로
> 직접 처리한다. Next.js API Routes는 AI 기능 및 특수 로직에만 사용된다.

### 핵심 엔진 구현 상태

| 엔진 | 설계 예상 | 실제 구현 | 상태 |
|------|----------|----------|------|
| 법령 룰 엔진 (LAW_ENGINE) | DB 기반 12개 법령 체크 | 설계 개념만 존재, DB 테이블 없음 | 📋 |
| 리스크 점수 엔진 (RISK_ENGINE) | R=Fp×Wf+Oc×Wo+Ch×Wc | `riskCalculator.ts` 완전 구현 | ✅ |
| 체크리스트 엔진 (CHECKLIST_ENGINE) | 526개 항목 필터링 | 43개 업종 JSON (약 1800+ 항목) | ✅ |
| SHA-256 해시 엔진 (HASH_ENGINE) | 사진 업로드 시 해시 | `merkleTree.ts` 완전 구현 | ✅ |
| PDF 생성 엔진 (PDF_ENGINE) | 서버사이드 PDF | html2canvas + jsPDF (클라이언트사이드) | ⚠️ |
| AI 점수 엔진 (추가) | 설계에 없음 | `scoreEngine.ts` 4×25=100점 완전 구현 | ⚠️ |
| 비용 계산 엔진 (추가) | 설계에 없음 | `costCalculator.ts` ΔC=Cb×(1+Σ(Wi×Fi)) 완전 구현 | ⚠️ |

---

## 5. 데이터베이스

### DB ⚠️

| 항목 | 설계 예상 | 실제 구현 |
|------|----------|----------|
| DBMS | PostgreSQL (추천) 또는 MySQL | ⚠️ **Supabase PostgreSQL** (직접 관리 아님) |
| ORM | Prisma | ⚠️ **없음** (Supabase JS 클라이언트 사용) |
| 마이그레이션 | Prisma Migrate | ⚠️ **Supabase Dashboard/SQL 에디터** |

> [GAP] Prisma가 없으므로 타입 안전한 DB 접근은 Supabase의 자동 생성 타입과
> `src/types/*.ts` 수동 정의 타입으로 처리한다.

### 실제 사용 중인 Supabase 테이블 (상세는 SCHEMA.md)

`projects`, `diagnostic_responses`, `custom_checklist_items`, `quote_line_items`,
`cost_analysis`, `change_orders`, `evidence_files`, `agreements`, `reports`,
`processes`, `workforce`, `materials`, `clients`, `user_settings`,
`verification_certificates`, `defects`, `files`, `site_issues`

---

## 6. 파일 스토리지 ⚠️

| 항목 | 설계 예상 | 실제 구현 |
|------|----------|----------|
| 스토리지 | S3 호환 (AWS S3, MinIO, Cloudflare R2) | ⚠️ **Supabase Storage** |
| 버킷명 | - | `evidence` |
| 경로 체계 | `/{project_id}/{date}/{file_hash}.{ext}` | Supabase 자동 경로 |
| 썸네일 | 업로드 시 300px 자동 생성 | 📋 확인 안 됨 |
| 접근 | Pre-signed URL | Supabase publicUrl 또는 signedUrl |

---

## 7. 인증/보안

| 항목 | 설계 예상 | 실제 구현 | 상태 |
|------|----------|----------|------|
| 이메일 로그인 | 이메일+비밀번호 JWT | Supabase Auth (email+password) | ✅ |
| 소셜 로그인 | 카카오/네이버/구글 OAuth | 카카오 버튼 UI만 존재 (OAuth 미연결) | ⚠️ |
| 세션 | JWT (Access 30분, Refresh 7일) | Supabase Auth 세션 (자동 관리) | ⚠️ |
| 비밀번호 | bcrypt 해싱 | Supabase Auth 내부 처리 | ✅ |
| 증거 무결성 | SHA-256 + Merkle Tree | `merkleTree.ts` 완전 구현 | ✅ |
| API Rate Limiting | 설계에 있음 | 📋 미구현 | 📋 |
| CORS | 설계에 있음 | Next.js 기본값 | ⚠️ |
| 미들웨어 인증 가드 | middleware.ts | 구현됨 (현재 개발용 비활성화) | 🔧 |

---

## 8. 배포

| 항목 | 설계 예상 | 실제 상태 |
|------|----------|----------|
| 개발 | localhost | ✅ localhost:3000 |
| 스테이징 | Vercel Preview | 📋 미설정 |
| 프로덕션 | Vercel (프론트) + AWS/GCP (백엔드) | 📋 미배포 |
| 도메인 | check-in.kr (예정) | 📋 미설정 |

---

## 관련 문서
- [SCHEMA.md](./SCHEMA.md) — DB 스키마 상세
- [API_SPEC.md](./API_SPEC.md) — API 엔드포인트 상세
- [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — 비즈니스 로직 상세
- [BUILDER_SPEC.md](./BUILDER_SPEC.md) — 기능 명세
