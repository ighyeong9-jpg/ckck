# Check-In — 알려진 문제 및 해결법

실제 소스코드 분석으로 발견한 문제들이다. 작업 전 반드시 읽어라.
번호 순서대로 수정해라.

---

## 버그 1 — brain.ts 미연결 4개 케이스 (최우선)

**파일:** `src/lib/ai/brain.ts`

현재 4개 케이스가 문자열 응답만 반환하고 실제 엔진을 호출하지 않는다.

```typescript
// L332 — vision-check: auto-checker 미연결
case 'vision-check': {
  // STEP 3에서 lib/ai/auto-checker.ts 구현 후 연결
  // auto-checker.ts 파일 존재함 → import 후 연결
}

// L348 — report-write: report-writer 미연결
case 'report-write': {
  // STEP 5에서 lib/ai/report-writer.ts 구현 후 연결
  // report-writer.ts 파일 존재함 → import 후 연결
}

// L360 — risk-predict: prediction-engine 미연결
case 'risk-predict': {
  // STEP 5에서 lib/ai/prediction-engine.ts 구현 후 연결
  // prediction-engine.ts 존재함 (272줄) → import 후 연결
}

// L372 — alert-analyze: alert-engine 미연결
case 'alert-analyze': {
  // STEP 5에서 lib/ai/alert-engine.ts 구현 후 연결
  // alert-engine.ts 존재함 (378줄) → import 후 연결
}
```

**수정 방법:**
```typescript
import { runAutoCheck } from '@/lib/ai/auto-checker'
import { writeReport } from '@/lib/ai/report-writer'
import { predictRisk } from '@/lib/ai/prediction-engine'
import { analyzeAlert } from '@/lib/ai/alert-engine'

// 각 case에서 실제 함수 호출로 교체
```

---

## 버그 2 — diagnostic/page.tsx: risk_scores 테이블 저장 누락

**파일:** `src/app/(dashboard)/projects/[id]/diagnostic/page.tsx`

`saveRiskScore` 함수(L256~L289)가 `projects` 테이블 `risk_score` 컬럼만 업데이트한다.
`risk_scores` 테이블에는 저장하지 않는다. 이력 추적 불가.

**현재 코드 (L259~L265):**
```typescript
const { error } = await supabase
  .from('projects')
  .update({
    risk_score: riskScores.total,
    industry: selectedIndustry
  })
  .eq('id', projectId)
```

**수정 — risk_scores 이력 저장 추가:**
```typescript
// projects 업데이트 후 추가
await supabase.from('risk_scores').insert({
  project_id: projectId,
  score: riskScores.total,
  grade: riskGrade.grade,
  level: riskGrade.level,
  fp: riskScores.Fp,
  oc: riskScores.Oc,
  ch: riskScores.Ch,
})
```

---

## 버그 3 — diagnostic/page.tsx: 진단 완료 후 공유 링크 자동 생성 없음

**파일:** `src/app/(dashboard)/projects/[id]/diagnostic/page.tsx`

사전진단 저장 완료 후 `/api/share` 자동 호출이 없다.
현재는 수동으로 공유 버튼을 눌러야 한다.

**수정 — saveRiskScore 완료 후 추가:**
```typescript
// 공유 링크 자동 생성
const shareRes = await fetch('/api/share', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project_id: projectId, expires_days: 7 })
})
const shareData = await shareRes.json()
// shareData.share_url을 toast나 클립보드에 표시
```

---

## 버그 4 — diagnostic_responses unique constraint 누락 가능성

**파일:** `src/app/(dashboard)/projects/[id]/diagnostic/page.tsx:L463`

```typescript
await supabase.from('diagnostic_responses').upsert(batch, {
  onConflict: 'project_id,question_id'
})
```

Supabase DB에 `UNIQUE(project_id, question_id)` constraint가 없으면 upsert가 insert로 동작해서 중복 데이터가 쌓인다.

**수정 — Supabase SQL Editor에서 실행:**
```sql
ALTER TABLE diagnostic_responses
ADD CONSTRAINT IF NOT EXISTS diagnostic_responses_project_question_unique
UNIQUE (project_id, question_id);
```

---

## 버그 5 — /api/ai/check 라우트 존재 확인 필요

**사용 위치:** `src/app/(dashboard)/projects/[id]/evidence-package/page.tsx:L218`

```typescript
const res = await fetch('/api/ai/check', { ... })
```

`src/app/api/ai/check/route.ts` 파일이 없으면 evidence-package 페이지 전체가 동작하지 않는다.

**수정 — 파일 존재 확인 후 없으면 생성:**
```typescript
// src/app/api/ai/check/route.ts
import { brain } from '@/lib/ai/brain'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { projectId, files } = await req.json()
  const result = await brain({ action: 'vision-check', projectId, files })
  return NextResponse.json(result)
}
```

---

## 버그 6 — defects/page.tsx: 하자 완료 시 warranty_tracking 연결 없음

**파일:** `src/app/(dashboard)/projects/[id]/defects/page.tsx`

하자 처리 완료(`status: 'resolved'`) 시 `warranty_tracking` 테이블에 기록이 없다.
`warranty-tracker.ts`(209줄)가 존재하지만 defects 페이지와 연결되지 않았다.

**수정 — 하자 상태 resolved 변경 시 추가:**
```typescript
import { trackWarranty } from '@/lib/ai/warranty-tracker'

// defect status를 resolved로 변경할 때
if (newStatus === 'resolved') {
  await trackWarranty({
    project_id: projectId,
    trade_name: defect.title,
    trade_category: defect.category || 'finish',
    completed_date: new Date().toISOString().split('T')[0]
  })
}
```

---

## 버그 7 — Toss 결제키 placeholder

**파일:** `src/app/pricing/page.tsx:L88`

```typescript
const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_placeholder'
```

결제 기능이 동작하지 않는다.

**수정 — `.env.local`에 추가:**
```
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_실제테스트키
```

Toss 개발자 콘솔(https://developers.tosspayments.com)에서 테스트 키 발급.

---

## 버그 8 — quote_analyses 테이블 존재 여부 확인

**파일:** `src/lib/ai/quote-analyzer.ts:L92~`

`analyzeQuote()` 함수가 `quote_analyses` 테이블에 저장하려 한다.
이 테이블이 Supabase에 없으면 분석 결과가 저장되지 않는다.

**수정 — Supabase SQL Editor에서 확인 후 없으면 실행:**
```sql
CREATE TABLE IF NOT EXISTS quote_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  overall_risk      TEXT,
  overcharge_items  JSONB,
  undercharge_items JSONB,
  ai_comment        TEXT,
  analyzed_at       TIMESTAMPTZ DEFAULT now()
);
```

---

## 추가 확인 필요 사항

```
□ shares 테이블 실제 Supabase에 존재하는가
□ warranty_tracking 테이블 실제 존재하는가
□ dispute_signals 테이블 실제 존재하는가
□ NEXT_PUBLIC_KAKAO_APP_KEY .env.local에 있는가
□ DarkModeToggle.tsx 실제 동작하는가
□ MobileTabBar.tsx 하단 탭바로 실제 표시되는가
□ public/sw.js Service Worker 오프라인 동기화 동작하는가
```

---

## 오류 대응표

| 오류 메시지 | 원인 | 해결 |
|---|---|---|
| `relation "테이블명" does not exist` | Supabase 테이블 미생성 | 001_initial_schema.sql 실행 |
| `new row violates row-level security` | RLS 정책 없음 | Supabase RLS 정책 추가 |
| `ANTHROPIC_API_KEY가 설정되지 않았습니다` | 환경변수 누락 | .env.local 확인 |
| `unique constraint violation` | 중복 데이터 upsert | onConflict 설정 + DB constraint 확인 |
| `Cannot read properties of null` | 데이터 로딩 전 렌더링 | 로딩 상태 처리 |
| `Gemini API 오류` | 할당량 초과 | brain.ts Claude 폴백 자동 실행됨 |
| `test_ck_placeholder` 결제 실패 | Toss 키 미설정 | .env.local TOSS 키 추가 |
