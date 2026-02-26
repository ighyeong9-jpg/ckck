# API_SPEC.md — 체크인 API 명세

> 최종 업데이트: 2026-02-27
> 상태: 코드 대조 완료
> 범례: ✅ 구현됨 | 📋 미구현 | ⚠️ 설계와 다름

---

## 중요 GAP 요약

> [GAP] 설계에서 예상했던 REST API 패턴(`/api/auth/*`, `/api/projects/*` 등)은
> **존재하지 않는다**. 모든 CRUD는 프론트엔드에서 Supabase 클라이언트로 직접 처리한다.
> Next.js API Routes는 **AI 기능 및 특수 로직**에만 사용된다.

---

## 공통 규칙

### Base URL
- 개발: `http://localhost:3000/api`
- 프로덕션: 미설정 (예정: Vercel 배포 URL)

### 인증 ⚠️
- 설계: Bearer Token (JWT)
- 실제: Supabase Auth 쿠키/세션 자동 처리
  - API Routes에서는 `createClient()` 서버 클라이언트로 사용자 검증
  - 현재 개발 모드: 인증 가드 비활성화

### AI 서비스 ⚠️
- Primary: Google Gemini API
- Fallback: Anthropic Claude API (Gemini 429 응답 시 자동 전환)

---

## 실제 구현된 API Routes

---

## 1. 인증서 API

### POST /api/certificate ✅

AI 검증 인증서 발급

**요청:**
```json
{
  "projectId": "uuid"
}
```

**서버 처리:**
1. Supabase Auth로 사용자 확인
2. 프로젝트 소유권 확인
3. scoreEngine으로 4개 영역 점수 계산 (비용/공정/계약/일정)
4. 기존 active 인증서 expired 처리
5. verification_certificates 테이블에 저장

**응답 (200):**
```json
{
  "certificate": {
    "id": "uuid",
    "code": "CHK-2026-ABCDE",
    "status": "active",
    "total_score": 85,
    "grade": "B",
    "cost_score": 22,
    "process_score": 20,
    "contract_score": 21,
    "schedule_score": 22,
    "score_details": { ... },
    "issued_at": "2026-02-26T10:00:00Z",
    "expires_at": "2027-02-26T10:00:00Z"
  }
}
```

---

### GET /api/verify/[code] ✅

인증서 공개 검증 (비인증 — 누구나 접근 가능)

**URL 파라미터:** `code` (예: CHK-2026-ABCDE)

**응답 (200):**
```json
{
  "valid": true,
  "certificate": {
    "code": "CHK-2026-ABCDE",
    "status": "active",
    "total_score": 85,
    "grade": "B",
    "project_name": "강남 카페 인테리어",
    "issued_at": "2026-02-26T10:00:00Z",
    "expires_at": "2027-02-26T10:00:00Z"
  }
}
```

**응답 (404):** 인증서 없음
**응답 (410):** 인증서 만료

---

## 2. AI API

### POST /api/ai/chat ✅

역할별 AI 채팅

**요청:**
```json
{
  "message": "이 현장의 방수 공사 기준이 어떻게 되나요?",
  "persona": "foreman",
  "projectId": "uuid",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**페르소나 종류:**
- `customer` — 고객 관점 (보증, 권리, 분쟁)
- `foreman` — 현장소장 관점 (시공, 품질, 안전)
- `administrator` — 계약담당 관점 (비용, 계약, 변경)
- `vendor` — 협력사 관점 (자재, 납기, 하자)

**응답 (200):**
```json
{
  "message": "방수 공사의 하자담보 기간은 건산법 시행령 별표4에 따라 3년입니다...",
  "persona": "foreman"
}
```

---

### POST /api/ai/check ✅

현장 사진 AI 자동체크 (GO/NO-GO)

**요청:** `multipart/form-data`
- `image`: 현장 사진 파일
- `projectId`: 프로젝트 ID
- `checkType`: 체크 유형 (optional)

**서버 처리:**
1. Gemini Vision API에 사진 전송 (실패 시 Claude Vision 폴백)
2. 시공 상태, 안전 요소, 법규 준수 분석
3. GO/NO-GO/CONDITIONAL 판정
4. evidence_files.ai_check_result 저장 (선택)

**응답 (200):**
```json
{
  "result": "GO",
  "confidence": 0.87,
  "analysis": "방수 시트 도포 상태 양호. 이음새 처리 정상. 안전 표지판 확인됨.",
  "issues": [],
  "recommendations": ["다음 공정 진행 가능"]
}
```

---

### GET /api/ai/proactive ✅

프로액티브 브리핑 (5가지 트리거)

**Query params:** `projectId=uuid`

**트리거 종류:**
1. 리스크 점수 급등 감지
2. 공정 지연 예측
3. 하자담보 만료 임박
4. 체크리스트 완료율 저하
5. 비용 초과 위험

**응답 (200):**
```json
{
  "briefings": [
    {
      "type": "risk_surge",
      "severity": "high",
      "message": "3공구 방수 공정에서 리스크 점수가 30% 상승했습니다.",
      "action": "즉시 현장 점검 권고"
    }
  ]
}
```

---

### POST /api/ai/proactive ✅

프로액티브 브리핑 생성 (트리거 이벤트 발생 시)

---

### POST /api/ai/alerts ✅

AI 리스크 알림 감지

**요청:**
```json
{
  "projectId": "uuid",
  "currentScore": 73,
  "previousScore": 45
}
```

**응답:** 알림 트리거 여부 및 알림 내용

---

### POST /api/ai/predict ✅

리스크 예측 (향후 7일/30일)

**요청:**
```json
{
  "projectId": "uuid",
  "horizon": 7
}
```

**응답:**
```json
{
  "predictions": [
    { "date": "2026-03-01", "predicted_score": 68, "confidence": 0.75 },
    { "date": "2026-03-04", "predicted_score": 72, "confidence": 0.65 }
  ],
  "trend": "increasing",
  "key_factors": ["공정 지연", "자재 미납"]
}
```

---

### POST /api/ai/report ✅

AI 일보 생성

**요청:**
```json
{
  "projectId": "uuid",
  "date": "2026-02-26",
  "summary": "오늘 방수 공사 1공구 완료..."
}
```

**서버 처리:**
1. 프로젝트 데이터 종합 (체크리스트, 공정, 증빙 등)
2. AI로 일보 작성
3. reports 테이블 저장

**응답:** 생성된 일보 content + report ID

---

### POST /api/ai/quote-analyze ✅

견적 AI 분석

**요청:**
```json
{
  "projectId": "uuid",
  "items": [ ... ],
  "totalAmount": 50000000
}
```

**응답:** 견적 적정성 분석, 위험 항목, 절감 포인트

---

### POST /api/ai/classify-issue ✅

현장 이슈 자동 분류

**요청:**
```json
{
  "description": "3층 화장실 방수 시트 들뜸 발견",
  "projectId": "uuid"
}
```

**응답:**
```json
{
  "type": "defect",
  "severity": "medium",
  "category": "waterproof",
  "recommended_action": "즉시 보수 필요. 하자담보 청구 가능.",
  "related_laws": ["건설산업기본법 제28조"]
}
```

---

### POST /api/ai/notebook ✅

문서(계약서/도면/사진) AI 분석

**요청:** `multipart/form-data`
- `file`: 분석할 문서 (PDF/이미지)
- `documentType`: contract/blueprint/photo/report
- `question`: 분석 질문 (optional)

**응답:** 문서 분석 결과, 핵심 내용 추출, 위험 요소

---

### GET /api/ai/budget-guide ✅

예산 가이드 생성

**Query params:** `projectType=cafe&area=100&budget=50000000`

**응답:** 업종별 예산 분배 가이드, 평균 단가 정보

---

## 3. 에이전트 API

### POST /api/agent/route ✅

자율 실행 에이전트 (자연어 명령 처리)

**요청:**
```json
{
  "command": "방수 체크리스트 확인하고 리스크 점수 계산해줘",
  "projectId": "uuid",
  "context": { ... }
}
```

**서버 처리:**
1. AI가 명령 파싱 → 실행할 액션 결정
2. Supabase 데이터 조회
3. 결과 종합 후 응답

**응답:** 에이전트 실행 결과 및 요약

---

## 4. 공유 API

### POST /api/share ✅

프로젝트 공유 링크 생성

**요청:**
```json
{
  "projectId": "uuid",
  "expiresIn": 7
}
```

**응답:**
```json
{
  "shareId": "abc123",
  "url": "/share/abc123",
  "expiresAt": "2026-03-05T10:00:00Z"
}
```

---

## 5. 이벤트 API

### POST /api/events/emit ✅

이벤트 발행 (프로액티브 트리거용)

**요청:**
```json
{
  "event": "checklist_updated",
  "projectId": "uuid",
  "data": { ... }
}
```

---

## 미구현 API (설계에만 존재) 📋

> [GAP] 아래 모든 API는 설계 문서에 있었으나 실제 구현 없음.
> CRUD 작업은 모두 Supabase 클라이언트가 직접 처리.

| 설계 API | 실제 처리 방식 |
|---------|--------------|
| POST /api/auth/register | Supabase Auth signUp() |
| POST /api/auth/login | Supabase Auth signInWithPassword() |
| POST /api/auth/logout | Supabase Auth signOut() |
| GET /api/projects | supabase.from('projects').select() |
| POST /api/projects | supabase.from('projects').insert() |
| PATCH /api/projects/:id | supabase.from('projects').update() |
| DELETE /api/projects/:id | 미구현 |
| POST /api/projects/:id/checklists/generate | 클라이언트에서 JSON 파일 로드 |
| PATCH /api/checklist-items/:id | supabase.from('diagnostic_responses').upsert() |
| POST /api/projects/:id/photos | supabase.storage.upload() |
| POST /api/projects/:id/risk/calculate | 클라이언트에서 riskCalculator.ts 직접 호출 |
| GET /api/laws | 미구현 (law 테이블 없음) |
| POST /api/projects/:id/law-check | 미구현 |
| GET /api/projects/:id/go-nogo | 미구현 |
| POST /api/projects/:id/warranties | 미구현 |
| POST /api/projects/:id/reports/* | /api/ai/report으로 대체 |
| GET /api/notifications | 미구현 |
| GET /api/dashboard/summary | 클라이언트에서 직접 계산 |
| POST /api/subscriptions | 미구현 (결제 미연동) |

---

## 관련 문서
- [SCHEMA.md](./SCHEMA.md) — 각 API의 DB 테이블
- [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — API 내부 로직
- [ARCHITECTURE.md](./ARCHITECTURE.md) — API 레이어 위치
- [BUILDER_SPEC.md](./BUILDER_SPEC.md) — 기능별 API 매핑
