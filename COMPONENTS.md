# Check-In — 컴포넌트 연결 맵

실제 소스코드 분석 기반. Claude Code가 파일 간 연결 관계를 파악하기 위한 지도.

---

## AI 엔진 연결도

```
사용자 액션
    │
    ▼
각 페이지 / API route
    │
    ├── src/app/api/ai/chat/route.ts ──────────────────┐
    ├── src/app/api/ai/quote-analyze/route.ts ─────────┤
    ├── src/app/api/ai/predict/route.ts ───────────────┤
    ├── src/app/api/ai/alerts/route.ts ───────────────┤
    ├── src/app/api/ai/report/route.ts ──────────────┤
    └── src/app/api/ai/proactive/route.ts ───────────┤
                                                       │
                                                       ▼
                                          src/lib/ai/brain.ts  ← 모든 AI 호출의 중심
                                                       │
                    ┌──────────────────────────────────┼─────────────────────┐
                    ▼                                  ▼                     ▼
            Gemini Provider                    Claude Provider          각 엔진
            (기본)                             (폴백)                    │
                                                                         ├── auto-checker.ts     ← brain L332 미연결
                                                                         ├── report-writer.ts    ← brain L348 미연결
                                                                         ├── prediction-engine.ts ← brain L360 미연결
                                                                         ├── alert-engine.ts     ← brain L372 미연결
                                                                         ├── quote-analyzer.ts   ✅ 연결됨
                                                                         ├── dispute-preventer.ts
                                                                         ├── warranty-tracker.ts
                                                                         └── proactive-engine.ts
```

---

## 기능별 파일 연결도

### 기능 1 — 사전진단

```
diagnostic/page.tsx (1000줄)
    │
    ├── import ← src/lib/utils/riskCalculator.ts (138줄)
    │              getRiskGradeAndLevel()
    │
    ├── import ← src/data/industries (industryRiskWeights)
    │
    ├── import ← src/components/risk/RiskGauge.tsx
    │
    ├── supabase.from('diagnostic_responses').upsert()
    │              ↑ unique(project_id, question_id) 필요
    │
    ├── supabase.from('projects').update({ risk_score })
    │              ↑ risk_scores 테이블 저장 누락 — 버그 2
    │
    └── /api/share 자동 호출 없음 — 버그 3
```

### 기능 2 — 분쟁 예방

```
changes/page.tsx
    └── supabase.from('change_orders').insert()
              → 고객 알림 발송 연결 확인 필요

agreement/page.tsx (357줄)
    ├── import ← src/components/signature/SignaturePad.tsx (178줄)
    │              canvas 기반 전자서명
    ├── SHA-256 해시 생성 → agreements 테이블 저장 ✅
    └── 3자 서명 (발주자/시공사/관리자) 지원

evidence-package/page.tsx (687줄)
    ├── fetch('/api/ai/check') — 라우트 없음 버그 5
    └── Merkle Tree 해시 생성 → PDF 패키지

src/lib/ai/dispute-preventer.ts (190줄)
    └── 분쟁 징후 키워드 감지 → dispute_signals 저장
```

### 기능 3 — 비용 절감

```
sow/page.tsx (견적서)
    ├── supabase.from('quote_line_items')
    └── import ← src/components/pdf/PdfDownloadButton.tsx

/api/ai/quote-analyze/route.ts (62줄)
    └── import ← src/lib/ai/quote-analyzer.ts (255줄)
                    │
                    ├── loadChunksByCategory('material') ✅ 연결됨
                    │   ← src/lib/knowledge/loader.ts
                    │   ← src/lib/knowledge/sources/trades-pricing*.json
                    │
                    ├── callGemini() → 시세 분석
                    ├── callClaudeForQuoteAnalysis() ← 폴백
                    └── supabase.from('quote_analyses').upsert() — 테이블 없을 수 있음 버그 8
```

### 기능 4 — 공정 투명화

```
process/page.tsx
    ├── supabase.from('processes').update()
    └── import ← src/lib/export/pdfExporter.ts

/api/share/route.ts (57줄)
    └── supabase.from('shares').insert({ share_token, expires_at })

share/[shareId]/page.tsx (374줄)  ← 고객용, 로그인 불필요
    ├── supabase.from('shares').select() — 만료 확인
    ├── supabase.from('processes').select()
    ├── supabase.from('quote_line_items').select()
    ├── supabase.from('change_orders').select()
    ├── supabase.from('diagnostic_responses').select()
    └── supabase.from('verification_certificates').select()

src/components/ui/KakaoShare.tsx
    └── NEXT_PUBLIC_KAKAO_APP_KEY 필요
```

### 기능 5 — 하자보수

```
defects/page.tsx (435줄)
    ├── supabase.from('defects').insert/update()
    ├── Supabase Storage 'evidence' 버킷 사진 업로드
    └── warranty-tracker 연결 없음 — 버그 6

warranty/page.tsx
    └── supabase.from('warranty_tracking').select()

src/lib/ai/warranty-tracker.ts (209줄)
    ├── 공종별 담보기간 계산
    │   구조체 120개월 / 방수 36개월 / 단열 24개월 / 마감 12개월
    └── supabase.from('warranty_tracking').insert()

src/lib/pdf/warranty-pdf.ts
    └── 담보기간 PDF 생성
```

### 기능 6 — 서류 자동화

```
src/lib/export/pdfExporter.ts (346줄)
    ├── 견적서 PDF
    ├── 계약서 PDF
    └── 일일 보고서 PDF

src/components/pdf/PdfDownloadButton.tsx
    └── 다운로드 트리거

/api/ai/report/route.ts
    └── src/lib/ai/report-writer.ts → brain.ts L348 미연결 버그 1
```

### 기능 8 — 리스크 사전차단

```
src/lib/ai/prediction-engine.ts (272줄)
    ├── 다음 공종 리스크 예측
    └── brain.ts L360 미연결 — 버그 1

src/lib/ai/alert-engine.ts (378줄)
    ├── 알림 생성/분류
    └── brain.ts L372에서 호출됨 ✅

src/components/risk/RiskGauge.tsx
    └── diagnostic/page.tsx에서 사용 ✅

src/components/notifications/NotificationCenter.tsx
    └── /api/ai/alerts 호출 → 알림 목록 표시
```

---

## 현재 기능 상태표

| 기능 | 화면 | API | DB 저장 | AI 연결 | 상태 |
|---|---|---|---|---|---|
| 사전진단 | ✅ | ✅ | ⚠️ 부분 | ✅ | 70% |
| 분쟁예방 | ✅ | ⚠️ check없음 | ✅ | ⚠️ | 60% |
| 비용절감 | ✅ | ✅ | ⚠️ 테이블확인 | ✅ | 80% |
| 공정투명 | ✅ | ✅ | ✅ | - | 85% |
| 하자보수 | ✅ | - | ⚠️ warranty미연결 | ⚠️ | 60% |
| 서류자동화 | ✅ | ✅ | ✅ | ⚠️ brain미연결 | 65% |
| 견적적정성 | ✅ | ✅ | ⚠️ 테이블확인 | ✅ | 80% |
| 리스크차단 | ✅ | ✅ | - | ⚠️ brain미연결 | 55% |
| 고객포털 | ❌ | - | - | - | 0% |
| AI인증서 | ✅ | ✅ | ✅ | ✅ | 90% |

**전체 완성도: 약 65%**

---

## 공통 컴포넌트

```
src/components/
    ├── layout/
    │   ├── Sidebar.tsx         ← 업체용 사이드바
    │   └── Header.tsx
    ├── ui/
    │   ├── MobileTabBar.tsx    ← 모바일 하단 탭바 (실제 동작 확인 필요)
    │   ├── KakaoShare.tsx      ← 카카오 공유
    │   └── DarkModeToggle.tsx  ← 다크모드 (실제 동작 확인 필요)
    ├── signature/
    │   └── SignaturePad.tsx    ← agreement/page.tsx에서만 사용
    ├── risk/
    │   └── RiskGauge.tsx       ← diagnostic/page.tsx에서 사용
    ├── pdf/
    │   └── PdfDownloadButton.tsx
    ├── notifications/
    │   └── NotificationCenter.tsx
    └── dashboard/
        ├── AIBriefing.tsx
        └── TodayStatusBar.tsx
```

---

## 데이터 흐름 — 공유 링크

```
업체 액션 → 공유 버튼 클릭
    │
    ▼
POST /api/share { project_id, expires_days: 7 }
    │
    ▼
shares 테이블 insert
{ share_token: uuid, expires_at: now+7일 }
    │
    ▼
/share/[share_token] URL 생성
    │
    ▼ 카카오톡 전송
    │
    ▼ 고객이 링크 클릭
    │
    ▼
share/[shareId]/page.tsx 렌더링
    ├── shares 테이블 만료 확인
    ├── projects 조회 → 현장명, 진행률
    ├── processes 조회 → 공정 현황
    ├── quote_line_items 조회 → 견적 합계
    ├── change_orders 조회 → 변경사항
    └── verification_certificates 조회 → AI 인증서 등급
```
