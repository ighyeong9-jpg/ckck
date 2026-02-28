# CHECK-IN 체키

> 인테리어 공사 전·중·후 분쟁을 예방하고 해결하는 대한민국 최초 AI 건설 관리 플랫폼

---

## 프로젝트 경로

```
E:\check-in-stable   (메인 작업)
D:\check-in-backup-20260226  (T7 백업)
```

## 빠른 시작

```bash
cd E:\check-in-stable
npm run dev          # 개발 서버 (localhost:3000)
npm run check        # ESLint 검증
npm run build        # 프로덕션 빌드
```

## 테스트 방법

```
로그인 상태 테스트    → localhost:3000 직접 접속
랜딩페이지 테스트     → Ctrl+Shift+N (시크릿 창) → localhost:3000
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL + pgvector) |
| AI 메인 | Gemini 2.0 Flash |
| AI 백업 | Claude Sonnet (자동 fallback) |
| 배포 | Vercel (main 브랜치 자동 배포) |
| Cron | Vercel Cron (매일 08:00 KST) |

---

## 브랜치 전략

```
main     → Vercel 자동 배포
develop  → 작업 브랜치 (여기서 개발)
```

```bash
# 작업 완료 후 배포
git add .
git commit -m "feat: 기능명"
git checkout main
git merge develop
git push origin main
git checkout develop
```

---

## 현재 구현 상태

### ✅ 완성 (92%)

- 대시보드 (리스크 알림, AI 브리핑, KPI)
- 프로젝트 CRUD + 진행률
- 진단 체크리스트 (13업종 526항목)
- 견적서(SOW) + VAT + PDF
- 비용분석 (ΔC 공식)
- 공정/인력/자재 관리
- 변경관리
- 증빙패키지 (Merkle Tree)
- AI 인증서 (4×25=100점)
- 3자 합의 + 전자서명
- AI 채팅 (6페르소나)
- Notebook (AI 문서 분석)
- 현장 이슈 (AI 분류 + 타임라인)
- 갤러리 + Before/After 슬라이더
- 공개 인증서 검증 + 공유링크
- AI API 14개 라우트
- 랜딩페이지
- 공포→안심→결제 플로우
- 분쟁비용 700만원 프레이밍

### ⏳ 구현 예정

| 순위 | 기능 | 파일 |
|------|------|------|
| 1 | AI 예산 가이드 | components/quotes/ |
| 2 | 현장 이슈 소통 완성 | components/issues/ |
| 3 | 법규 지식베이스 | lib/knowledge/ |
| 4 | 사진→자동 체크 | lib/ai/auto-checker.ts |
| 5 | 하자담보 추적 | warranty_tracking 테이블 |
| 6 | event-bus 연동 | lib/events/event-bus.ts |
| 7 | B2C 결제 | Toss Payments |
| 8 | 오프라인 PWA | Service Worker |

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
```

---

## AI 호출 규칙

```
모든 AI 호출은 반드시 lib/ai/brain.ts 통해서만.
직접 import 금지.
Gemini 실패 시 Claude 자동 전환.
```

---

## DB 마이그레이션

```bash
# 신규 기능 추가 시
# scripts/migration.sql 에 추가 후
# Supabase SQL Editor에서 실행
```

---

## 가격 정책 (현재)

| 플랜 | 금액 | 대상 |
|------|------|------|
| B2C 건당 기본 | 99,000원 | 일반 소비자 |
| B2C 건당 프리미엄 | 199,000원 | 일반 소비자 |
| B2B 스타터 | 39,000원/월 | 소규모 업체 |
| B2B 프로 | 129,000원/월 | 전문 업체 |

---

## 특허 현황

- 3건 핵심 특허 심사 통과 (등록 확정)
- 건설 법령 기반 GO/NO-GO 자동 판정
- 분쟁 징후 자동 감지 알고리즘
- 다단계 하도급 분쟁 추적 구조

---

## 밸류에이션 (현재 기준)

```
기술 가치:    3억~8억
특허 가치:    2억~5억
지식재산권:   1억~3억
선점 프리미엄: 2억~5억
────────────────────
현재 총계:    8억~21억
```

---

## 투자 진행 상황

- 투자 협상 진행 중: 2억 3천만원
- 정부 딥테크 특화 패키지 신청 준비 중

---

## 연락처

CEO · 김익현  
15년 건설 현장 경험 + 10년 인테리어 사업  
CHECK-IN © 2026
