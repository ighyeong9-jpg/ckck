# 체크인 (Check-In)

> 대한민국 인테리어·건설 현장 전담 AI 법률·시공 비서

## 📋 개요

체크인은 인테리어 및 건설 프로젝트 관리를 위한 종합 SaaS 플랫폼입니다.
AI 기반 견적, 리스크 분석, 법규 검토, 현장 관리를 통합 제공합니다.

## ✨ 주요 기능

### 🤖 AI 기능
- **자동 견적 생성** - 업종별 표준 견적 자동 작성
- **법규 자동 검토** - 건축법, 소방법 등 자동 체크
- **리스크 분석** - 재정/운영/변경 리스크 실시간 계산
- **AI 챗봇** - 160개 지식베이스 기반 질의응답

### 📊 프로젝트 관리
- **대시보드** - 전체 프로젝트 현황 한눈에
- **진단 체크리스트** - 업종별 사전 점검
- **공정 관리** - 간트차트 일정 추적
- **변경 관리** - Change Order 기록 및 승인

### 📷 현장 관리
- **사진 갤러리** - EXIF 자동 추출
- **일일 보고** - 현장 일지 작성
- **이슈 추적** - 문제점 기록 및 관리
- **하자 관리** - 하자담보 기간 추적

### 📄 문서 관리
- **견적서** - 자동 생성 및 분석
- **계약서** - 표준 계약서 생성
- **준공 증명서** - 준공 증빙 발급
- **증거 패키지** - 블록체인급 검증

## 🚀 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. 데이터베이스 초기화

```bash
# Supabase SQL Editor에서 실행
# supabase/all-in-one.sql

# 지식베이스 시딩
node scripts/seed-knowledge.js
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속

## 📁 프로젝트 구조

```
check-in-stable/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (dashboard)/  # 대시보드 페이지
│   │   └── api/          # API 라우트
│   ├── components/       # React 컴포넌트
│   ├── lib/              # 유틸리티 및 헬퍼
│   │   ├── ai/           # AI 엔진 (19개 모듈)
│   │   ├── knowledge/    # 지식베이스 (21개 JSON)
│   │   └── supabase/     # DB 클라이언트
│   └── styles/           # SCSS 스타일
├── supabase/             # DB 스키마 및 마이그레이션
├── scripts/              # 유틸리티 스크립트
└── docs/                 # 문서
```

## 🗄️ 데이터베이스

### 테이블 (24개)

- **프로젝트**: projects, project_members
- **진단**: diagnostic_responses, mandatory_processes
- **견적**: quotes, quote_line_items, scope_items
- **변경**: change_orders, operational_constraints
- **이슈**: issues, daily_reports, warranties
- **문서**: certificates, evidence_packages, shares
- **사진**: photos
- **활동**: activities, notifications
- **리스크**: risk_history
- **초대**: project_invites
- **결제**: payments, service_payments
- **AI**: knowledge_chunks (160개), law_checks

### 지식베이스

```
총 160개 청크
├── material (77개) - 자재 단가, 브랜드
├── law (47개) - 법규, 기준
├── contract (19개) - 계약, 분쟁
├── process (11개) - 공정 관리
└── defect (6개) - 하자 관리
```

## 🤖 AI 시스템

### 모델
- **텍스트**: Gemini 2.5 Flash
- **임베딩**: Gemini Embedding 001 (768-dim)
- **폴백**: Claude Opus 4.6

### AI 도구 (100+개)

- **프로젝트**: project_setup, project_list, project_detail
- **견적**: quote_generate, quote_analyze, cost_analyze
- **리스크**: risk_calculate, risk_full_diagnosis
- **법규**: law_check, auto_law_check
- **공정**: schedule_check, schedule_gantt
- **보고**: report_generate, report_daily

## 🎨 기술 스택

### 프론트엔드
- **프레임워크**: Next.js 13.5.6 (App Router)
- **언어**: TypeScript 5.3.3
- **스타일**: SCSS Modules + Tailwind CSS
- **UI**: React 18.2.0, Recharts

### 백엔드
- **데이터베이스**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini, Anthropic Claude
- **인증**: Supabase Auth

### 인프라
- **호스팅**: Vercel
- **DB**: Supabase Cloud
- **스토리지**: Supabase Storage

## 📜 스크립트

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 타입 체크 + 린트
npm run check

# DB 상태 확인
node scripts/check-all-tables.js

# 지식베이스 시딩
node scripts/seed-knowledge.js

# 종합 점검
node scripts/final-health-check.js
```

## 🔧 설정

### 포트 변경

`.env.local`에 추가:

```env
PORT=3000
```

### 캐시 정리

```bash
rm -rf .next
npm run dev
```

## 📚 문서

- [설정 가이드](./SETUP-GUIDE.md)
- [DB 수정 요약](./DB-FIX-SUMMARY.md)
- [API 스펙](./docs/API_SPEC.md)
- [아키텍처](./docs/ARCHITECTURE.md)

## 🐛 문제 해결

### 포트 충돌

```bash
# 사용 중인 프로세스 확인
netstat -ano | findstr :3000

# 프로세스 종료
taskkill /F /PID [프로세스ID]
```

### DB 에러

```bash
# DB 상태 확인
node scripts/check-all-tables.js

# FK 무결성 검증
node scripts/check-fk-integrity.js
```

## 📞 지원

- **GitHub**: Issues 생성
- **이메일**: support@checkin.com

## 📄 라이선스

MIT License

---

**Made with ❤️ by Check-In Team**
