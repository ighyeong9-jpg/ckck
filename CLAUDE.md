# Check-In Stable (기록의 편)

인테리어/건설 프로젝트 관리 SaaS. 현장 소장이 진단부터 리포트까지 전 과정을 디지털로 기록하고 관리하는 플랫폼.

## Tech Stack

- **Framework:** Next.js 13.5.6 (App Router)
- **Language:** TypeScript 5.3.3
- **Styling:** SASS/SCSS CSS Modules (`.module.scss`)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **PDF Export:** html2canvas + jsPDF
- **Risk Scoring:** 특허 공식 R = Fp x Wf + Oc x Wo + Ch x Wc
- **AI Verification:** 4항목 × 25점 = 100점 (비용/공정/계약/일정)

## Commands

```bash
npm run dev    # 개발 서버 (localhost:3000)
npm run build  # 프로덕션 빌드
npm run start  # 프로덕션 서버
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing (redirects to /projects)
│   ├── globals.css             # Global styles
│   ├── login/page.tsx          # 로그인/회원가입
│   ├── auth/callback/route.ts  # Supabase auth callback
│   ├── api/certificate/route.ts # POST: AI 인증서 발급
│   ├── api/verify/[code]/route.ts # GET: 인증서 공개 검증
│   ├── verify/[code]/          # 공개 검증 페이지 (비인증)
│   ├── share/[shareId]/        # 공유 링크 (비인증)
│   └── (dashboard)/            # 인증 필요 영역
│       ├── layout.tsx          # Sidebar + auth guard
│       ├── dashboard/          # 대시보드
│       ├── projects/           # 프로젝트 목록
│       │   └── [id]/           # 프로젝트 상세
│       │       ├── layout.tsx       # 탭 네비게이션 layout
│       │       ├── page.tsx         # → diagnostic으로 redirect
│       │       ├── ProjectDetailHeader.tsx
│       │       ├── diagnostic/      # 진단 체크리스트
│       │       ├── sow/            # 견적서 (Statement of Work)
│       │       ├── cost-analysis/  # 비용분석
│       │       ├── changes/        # 변경관리
│       │       ├── evidence-package/ # 증빙패키지
│       │       ├── agreement/      # 3자 합의
│       │       ├── report/         # 리포트
│       │       ├── process/        # 공정관리
│       │       ├── workforce/      # 인력관리
│       │       ├── materials/      # 자재관리
│       │       └── certificate/    # AI 검증 인증서
│       ├── reports/            # 전체 리포트 목록
│       ├── clients/            # 고객/업체 관리
│       ├── payment/            # 결제/구독
│       └── settings/           # 설정
├── components/
│   ├── layout/Sidebar.tsx      # 사이드바 네비게이션
│   ├── project/ProjectTabs.tsx # 프로젝트 탭 바
│   ├── risk/RiskGauge.tsx      # 리스크 게이지 SVG
│   └── verification/VerificationBadge.tsx # AI 인증 배지
├── data/
│   ├── checklists/             # 13개 업종별 체크리스트 JSON
│   │   ├── index.ts
│   │   ├── cafe.json, restaurant.json, bar.json, bakery.json
│   │   ├── beauty.json, clinic.json, fitness.json
│   │   ├── retail.json, office.json, academy.json
│   │   └── apartment.json, villa.json, house.json
│   └── industries/index.ts    # 업종 설정 (리스크 가중치 등)
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts           # 서버용 Supabase 클라이언트
│   │   └── middleware.ts       # Auth 미들웨어
│   ├── utils/
│   │   ├── riskCalculator.ts   # 리스크 점수 계산 (특허 공식)
│   │   ├── costCalculator.ts   # 비용 조정 계산 (ΔC = Cb × (1 + Σ(Wi × Fi)))
│   │   └── merkleTree.ts       # SHA-256 Merkle Tree (증빙 무결성)
│   └── verification/
│       ├── scoreEngine.ts      # AI 점수 엔진 (4×25=100점)
│       └── certificateService.ts # 인증서 발급/검증 서비스
├── types/                      # TypeScript 타입 정의
│   ├── project.ts, diagnostic.ts, quote.ts, costAnalysis.ts
│   ├── changeOrder.ts, evidenceFile.ts, agreement.ts, report.ts
│   ├── process.ts, workforce.ts, material.ts
│   ├── client.ts, settings.ts
│   └── (각 타입 파일에 상수 배열도 포함)
└── middleware.ts               # Next.js 미들웨어 (auth session refresh)
```

## Supabase Tables

| Table | Used By | Description |
|-------|---------|-------------|
| `projects` | 거의 모든 페이지 | 프로젝트 메인 테이블 |
| `diagnostic_responses` | diagnostic | 진단 체크리스트 응답 |
| `custom_checklist_items` | diagnostic | 사용자 추가 체크항목 |
| `quote_line_items` | sow, cost-analysis, agreement, report, dashboard | 견적 항목 |
| `cost_analysis` | cost-analysis, report | 비용분석 결과 |
| `change_orders` | changes | 변경 주문 |
| `evidence_files` | evidence-package | 증빙 파일 메타데이터 |
| `agreements` | agreement | 3자 합의 |
| `reports` | report, reports | 생성된 리포트 |
| `processes` | process | 공정 관리 |
| `workforce` | workforce | 인력/출근 기록 |
| `materials` | materials | 자재 관리 |
| `clients` | clients | 고객/업체/공급사 |
| `user_settings` | settings, payment | 사용자 설정 |
| `verification_certificates` | certificate, verify | AI 검증 인증서 |

Storage Bucket: `evidence` (증빙 파일 업로드)

## Sidebar Navigation (17 menus)

**Main (4):** 대시보드, 프로젝트, 리포트, 고객관리
**Project Sub (11):** 진단, 견적서, 비용분석, 변경관리, 증빙, 합의, 리포트, 공정관리, 인력관리, 자재관리, 인증서
**Bottom (2):** 결제, 설정

## 13 Industry Checklists

카페, 음식점, 술집/바, 베이커리, 미용실, 병원, 헬스장, 소매점, 사무실, 학원, 아파트, 빌라, 단독주택

각 업종별 39~45개 체크항목 (총 526개), 카테고리: 안전, 법규, 품질, 설비, 마감

## Key Conventions

- **Client components:** `'use client'` 상단 선언
- **Server components:** layout.tsx 등 (Supabase server client 사용)
- **Styling:** 모든 페이지/컴포넌트에 `.module.scss` 사용, 공통 색상:
  - Primary: `#4f46e5` ~ `#7c3aed` (indigo-purple gradient)
  - Success: `#10b981`, Warning: `#f59e0b`, Danger: `#ef4444`
  - Background: `#f8f9fa`, Text: `#1f2937`
- **Page pattern:** useParams로 projectId 추출, useEffect로 Supabase fetch
- **Project detail header/tabs:** `projects/[id]/layout.tsx`에서 처리 (각 서브페이지에 중복 헤더 없음)
- **프로젝트 생성:** `/projects` 페이지의 모달 (별도 라우트 없음)
- **인증:** Supabase Auth + middleware.ts + dashboard layout guard
