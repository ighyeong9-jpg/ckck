# Check-In (체크인) — API 명세

---

## 인증

모든 인증 필요 API는 Supabase 세션 쿠키를 사용한다.
`createClient()` → `supabase.auth.getUser()` 로 인증 확인.

---

## API 라우트 목록

### POST /api/ai/quote-analyze
견적 과다청구 AI 분석

**Request:**
```json
{ "projectId": "uuid" }
```
**Response:**
```json
{
  "overcharge_items": [{"item": "도배공사", "excess_rate": 23, "market_range": "15~18만원/평"}],
  "undercharge_items": [],
  "overall_risk": "medium",
  "ai_comment": "전체적으로 적정하나 도배공사 항목이 시세보다 높습니다."
}
```

---

### POST /api/ai/predict
다음 공종 리스크 예측

**Request:**
```json
{ "projectId": "uuid", "completedProcessId": "uuid" }
```
**Response:**
```json
{
  "nextPhase": "도배공사",
  "riskLevel": "LOW",
  "warnings": [],
  "recommendations": ["방수 상태 확인 후 진행 권장"]
}
```

---

### POST /api/ai/report
일일 현장 보고서 자동 생성

**Request:**
```json
{ "projectId": "uuid", "date": "2025-03-15" }
```
**Response:**
```json
{
  "title": "2025-03-15 일일 현장 보고서",
  "summary": "목공사 80% 완료. 전기 배선 시작.",
  "details": "...",
  "nextActions": ["목공사 마감 확인", "타일 발주 필요"]
}
```

---

### POST /api/ai/chat
AI 채팅 (RAG + 분쟁 감지 포함)

**Request:**
```json
{
  "message": "구두로 합의한 추가 공사비를 업체가 모른다고 합니다",
  "projectId": "uuid",
  "persona": "customer",
  "conversationHistory": []
}
```

---

### GET /api/ai/alerts?projectId=uuid
프로젝트 AI 알림 목록

**Response:**
```json
{
  "alerts": [
    {
      "severity": "WARNING",
      "category": "DEADLINE",
      "title": "하자담보 만료 임박",
      "message": "방수공사 담보기간이 30일 후 만료됩니다.",
      "actionUrl": "/warranty"
    }
  ]
}
```

---

### POST /api/share
공유 링크 생성

**Request:**
```json
{ "project_id": "uuid", "expires_days": 7 }
```
**Response:**
```json
{
  "share_token": "abc123...",
  "share_url": "/share/abc123...",
  "expires_at": "2025-03-22T..."
}
```

---

### POST /api/certificate
AI 인증서 발급

**Request:**
```json
{ "projectId": "uuid" }
```
**Response:**
```json
{
  "success": true,
  "certificate": {
    "code": "CHK-2025-12345",
    "grade": "B",
    "overall_score": 78,
    "expires_at": "2026-03-15T..."
  }
}
```

---

### GET /api/verify/[code]
인증서 공개 검증 (로그인 불필요)

**Response:**
```json
{
  "valid": true,
  "certificate": { "code": "CHK-2025-12345", "grade": "B", "project_name": "강남 오피스텔" }
}
```

---

## Supabase Realtime (추후 구현)

고객 포털 실시간 업데이트용:
```javascript
supabase
  .channel('project-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'processes',
    filter: `project_id=eq.${projectId}`
  }, payload => {
    // 공정 업데이트 실시간 반영
  })
  .subscribe()
```
