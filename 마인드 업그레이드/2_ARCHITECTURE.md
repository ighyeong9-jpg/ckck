# CHECK-IN 체키 — ARCHITECTURE v2.0

> Claude Code가 이 파일을 먼저 읽고 구현에 착수한다.
> 모든 코드 결정은 이 파일의 원칙을 따른다.

---

## 1. 시스템 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                   사용자 (3가지만 한다)                    │
│         말하거나 → 사진 찍거나 → [확인] 누르거나           │
└───────────────────────┬─────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  NEXT.JS 14 APP                          │
│  app/(dashboard)/*  ←→  app/(marketing)/  (랜딩)        │
│  app/api/ai/*       ←→  app/api/issues/*                │
└───────────────────────┬─────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│              AI ORCHESTRATION LAYER                      │
│                                                          │
│   brain.ts (단일 진입점 — 모든 AI 호출 여기만)            │
│       ↓                                                  │
│   Gemini 2.0 Flash (메인) → 실패 시 Claude 자동 전환      │
│                                                          │
│   auto-checker.ts   사진→GO/NO-GO                        │
│   retriever.ts      법규/판례 RAG 검색                    │
│   alert-engine.ts   분쟁 징후 감지                        │
│   report-writer.ts  일보 자동 생성                        │
│   prediction-engine.ts  다음 공종 리스크 예측             │
│   event-bus.ts      기능 간 연동 허브                     │
└───────────────────────┬─────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL + pgvector)            │
│                                                          │
│  기존: projects, processes, checklists, site_issues      │
│        quote_analyses, chat_messages, gallery            │
│                                                          │
│  신규: ai_check_results    GO/NO-GO 판정 기록             │
│        warranty_tracking   하자담보 자동 추적              │
│        dispute_signals     분쟁 징후                      │
│        proactive_notifications  자동 알림                 │
│        case_law            판례 20개+                     │
│        knowledge_chunks    법규 RAG (pgvector)            │
│        daily_reports       현장 일보                      │
│        contractor_badges   업체 신뢰 배지                 │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 파일 구조 전체

```
src/
├── lib/
│   ├── ai/
│   │   ├── brain.ts              ← ★ 모든 AI 호출의 단일 진입점
│   │   ├── auto-checker.ts       ← 사진→체크리스트 자동완성
│   │   ├── alert-engine.ts       ← 분쟁 징후 감지
│   │   ├── report-writer.ts      ← 일보 자동 생성
│   │   ├── prediction-engine.ts  ← 다음 공종 리스크 예측
│   │   ├── quote-generator.ts    ← AI 예산 가이드
│   │   ├── issue-classifier.ts   ← 현장 이슈 분류
│   │   └── personas.ts           ← 7개 역할별 시스템 프롬프트
│   ├── knowledge/
│   │   ├── retriever.ts          ← pgvector RAG 검색
│   │   ├── embedder.ts           ← 텍스트 임베딩
│   │   ├── case-search.ts        ← 판례 검색
│   │   └── sources/
│   │       ├── laws.json         ← 건설 법령 12개
│   │       ├── cases.json        ← 판례 20개+
│   │       └── processes.json    ← 공종별 체크포인트
│   └── events/
│       └── event-bus.ts          ← 기능 간 연동 허브
│
├── components/
│   ├── quotes/
│   │   ├── QuoteSpaceSelector.tsx
│   │   ├── QuoteBudgetResult.tsx
│   │   ├── QuoteEducation.tsx
│   │   ├── QuoteDisclaimer.tsx   ← 삭제/숨김 절대 불가
│   │   └── QuotePaymentTerms.tsx
│   └── issues/
│       ├── IssueReporter.tsx
│       ├── IssueCard.tsx
│       ├── IssueApproval.tsx
│       └── IssueTimeline.tsx
│
└── app/
    ├── (marketing)/
    │   └── page.tsx              ← 랜딩페이지 (비로그인)
    ├── (dashboard)/
    │   ├── quotes/
    │   │   ├── page.tsx
    │   │   └── new/page.tsx
    │   ├── issues/
    │   │   └── page.tsx
    │   └── warranty/
    │       └── page.tsx          ← 하자담보 추적
    └── api/
        └── ai/
            ├── chat/route.ts
            ├── check/route.ts    ← 사진 자동 체크
            ├── predict/route.ts
            ├── report/route.ts
            └── knowledge/
                └── search/route.ts
```

---

## 3. brain.ts — 핵심 규칙

```typescript
// ★★★ 이 파일을 통하지 않는 Gemini/Claude 호출은 전부 금지 ★★★

type AITask =
  | 'photo_check'      // 사진 → GO/NO-GO
  | 'budget_guide'     // AI 예산 가이드
  | 'issue_classify'   // 현장 이슈 분류
  | 'risk_predict'     // 다음 공종 리스크
  | 'chat'             // 역할별 AI 채팅
  | 'report_draft'     // 일보 초안
  | 'dispute_detect'   // 분쟁 징후 감지
  | 'legal_answer'     // 법규/판례 답변 (RAG)

// Gemini 실패 → Claude 자동 전환
// 모든 응답에 model_used 필드 포함
// 법규 답변은 반드시 source 포함 (hallucination 방지)
```

---

## 4. event-bus.ts — 연동 흐름

```
PHOTO_UPLOADED
  → auto-checker.ts 실행
  → CHECKLIST_AUTO_FILLED

CHECKLIST_COMPLETED
  → prediction-engine.ts 실행
  → NEXT_RISK_PREDICTED

RISK_HIGH_DETECTED (리스크 61점+)
  → alert-engine.ts 실행
  → proactive_notifications 생성
  → 결제 유도 CTA 표시

DAILY_END (매일 18:00)
  → report-writer.ts 실행
  → daily_reports에 초안 저장
  → 담당자 알림

DISPUTE_SIGNAL_DETECTED
  → 관련 판례 자동 검색
  → proactive_notifications 생성 (urgent)
```

---

## 5. 7개 AI 페르소나

| 역할 | 핵심 관심사 |
|------|------------|
| 👤 고객 | 비용·일정·하자·환불 |
| 🎨 디자이너 | 법규·공종 조율·계약 관리 |
| 🔨 시공사 | 공법 기준·자재 스펙·안전 의무 |
| 📋 감리 | GO/NO-GO 판정·법규 위반 감지 |
| 🏗 하도급 | 하도급법 보호·기성 지급·안전 의무 |
| 🏠 셀프인테리어 | DIY 가이드·자재 구입·주의사항 |
| 🏢 건물주 | 임차인 공사 허가·원상복구·세금 처리 |

---

## 6. 법규 12개 (지식베이스 필수 커버)

1. 중대재해처벌법
2. 산업안전보건법
3. 건축법 / 건축물관리법
4. 주택법 / 공동주택관리법
5. 하도급거래 공정화법
6. 소방시설법
7. 전기안전관리법
8. 실내공기질관리법
9. 건설산업기본법 (하자담보기간 핵심)
10. 근로기준법 (건설 현장)
11. 소비자기본법 (인테리어 계약 분쟁)
12. 집합건물법

---

## 7. API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/ai/chat | 역할별 AI 채팅 |
| POST | /api/ai/check | 사진 자동 체크 |
| POST | /api/ai/predict | 다음 공종 리스크 예측 |
| POST | /api/ai/report | 일보 자동 생성 |
| GET  | /api/knowledge/search?q= | 법규/판례 RAG 검색 |

---

## 8. 구현 순서 (Claude Code 실행 순서)

```
STEP 1: DB 마이그레이션
  □ 1_SCHEMA_MASTER.sql 실행
  □ pgvector 확장 확인

STEP 2: AI 예산 가이드 (1순위)
  □ components/quotes/ 5개 컴포넌트
  □ lib/ai/quote-generator.ts
  □ app/(dashboard)/quotes/

STEP 3: 현장 이슈 소통 (2순위)
  □ components/issues/ 4개 컴포넌트
  □ lib/ai/issue-classifier.ts
  □ app/(dashboard)/issues/

STEP 4: 법규 지식베이스 (3순위)
  □ lib/knowledge/sources/laws.json (12개)
  □ lib/knowledge/sources/cases.json (20개+)
  □ lib/knowledge/embedder.ts
  □ lib/knowledge/retriever.ts

STEP 5: 자동 체크 (4순위)
  □ lib/ai/auto-checker.ts
  □ /api/ai/check 엔드포인트
  □ 갤러리에 자동체크 버튼 연동

STEP 6: 하자담보 추적 (5순위)
  □ app/(dashboard)/warranty/page.tsx
  □ Vercel Cron 만료 알림

STEP 7: 유기적 연동 (6순위)
  □ lib/events/event-bus.ts
  □ lib/ai/alert-engine.ts
  □ lib/ai/report-writer.ts
  □ 전체 통합 테스트
```

---

## 9. 절대 금지 사항

```
❌ brain.ts 우회해서 직접 Gemini/Claude import
❌ 기존 DB 테이블 컬럼 삭제 또는 타입 변경
❌ 기존 라우트 구조 변경
❌ 출처 없는 법규 답변 생성 (hallucination)
❌ 자동 체크 결과를 인간 확인 없이 DB 확정 저장
❌ API 키 하드코딩 (반드시 .env 참조)
❌ QuoteDisclaimer.tsx 삭제 또는 숨김
❌ npm 패키지 설치 전 확인 없이 진행
```

---

## 10. 성공 기준

```
□ 사진 1장 업로드 → 체크리스트 80% 이상 자동 완성
□ "타일 몇 일 후 하중?" → 출처 있는 법규 답변
□ 리스크 61점+ → 분쟁 징후 감지 → 자동 알림
□ 일과 종료 → 일보 초안 자동 생성 → [확인]만 클릭
□ 하자담보 만료 D-30 → 자동 알림 발송
□ 분쟁 발생 → 관련 판례 자동 제시
```
