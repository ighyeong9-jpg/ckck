# Check-In — 지속적 업데이트 가이드

시스템 완성 후 법령, 단가, 기능을 추가·수정하는 방법이다.
코딩 몰라도 된다. 파일 위치와 형식만 알면 된다.

---

## 1. 법령 추가·수정

**파일 위치:** `src/lib/knowledge/sources/laws.json`
**데이터 위치:** `src/data/laws/`

### 법령 JSON 형식
```json
{
  "id": "serious-accident-2021",
  "name": "중대재해처벌법",
  "category": "safety",
  "effective_date": "2022-01-27",
  "risk_weight": 3.0,
  "articles": [
    {
      "article": "제4조",
      "title": "사업주와 경영책임자등의 안전보건 확보의무",
      "content": "사업주 또는 경영책임자등은...",
      "penalty": "1년 이상 징역 또는 10억원 이하 벌금",
      "checklist_items": [
        "안전보건관리체계 구축",
        "안전보건 전담 인력 배치",
        "안전보건 예산 편성"
      ]
    }
  ]
}
```

### 추가 절차
1. 위 형식으로 JSON 작성
2. `src/data/laws/` 폴더에 파일 추가
3. `src/lib/knowledge/sources/laws.json` 에 항목 추가
4. `src/lib/go-no-go/checker.ts` 에 해당 법 체크 로직 추가
5. CLAUDE.md 하단 "법령 업데이트 이력" 섹션에 기록

### 현재 적용된 12개 법규
1. 중대재해처벌법
2. 건설산업기본법
3. 산업안전보건법
4. 건축법
5. 소방시설 설치·유지 및 안전관리에 관한 법률
6. 전기공사업법
7. 정보통신공사업법
8. 하도급거래 공정화에 관한 법률
9. 집합건물의 소유 및 관리에 관한 법률
10. 주택법
11. 민법 (하자담보책임)
12. 건설기계관리법

---

## 2. 단가 추가·수정

**파일 위치:**
- `src/lib/knowledge/sources/trades-pricing.json` — 공종별 단가
- `src/lib/knowledge/sources/trades-pricing-2.json` — 추가 공종
- `src/lib/knowledge/sources/trades-pricing-3.json` — 추가 공종
- `src/lib/knowledge/sources/labor-cost.json` — 인건비
- `src/lib/knowledge/sources/construction-materials.json` — 자재

### 단가 JSON 형식
```json
{
  "id": "trade-tile-01",
  "source": "자재 단가 — 타일 시공 (2025 기준)",
  "category": "material",
  "keywords": ["타일", "시공", "단가", "평당"],
  "content": "타일 시공 단가(2025 기준): ① 일반 도기질 타일(300×300): 시공 포함 12만~18만원/㎡. ② 포세린 타일(600×600): 18만~28만원/㎡. ③ 대형 슬라브(1200×600): 30만~45만원/㎡. 브랜드: 동양파이텍, LX하우시스, 대림바스, KCC"
}
```

### 단가 업데이트 절차
1. 실제 시장 조사 또는 공식 단가 자료 확인
2. 위 형식으로 JSON 항목 추가 또는 수정
3. `content` 필드에 범위값으로 입력 (최소~최대)
4. `source` 필드에 기준 연도 명시
5. 업데이트 날짜 기록

### 단가 업데이트 주기 권장
- 분기 1회 (1월, 4월, 7월, 10월)
- 자재 가격 급등 시 즉시

---

## 3. 체크리스트 항목 추가

**파일 위치:** `src/data/checklists/`

### 체크리스트 JSON 형식
```json
{
  "id": "chk-fire-003",
  "category": "safety",
  "law": "소방시설법",
  "article": "제9조",
  "title": "소방용 호스 비치",
  "description": "바닥면적 200㎡ 이상 시 소방용 호스 의무 비치",
  "risk_weight": 2.5,
  "required_for": ["commercial", "apartment"],
  "evidence_required": true
}
```

---

## 4. 고객·업체 수정요청 반영

### 수정요청이 들어왔을 때 처리 절차

**UI/UX 수정 (버튼 위치, 텍스트 등):**
1. 해당 `page.tsx` 또는 `component.tsx` 파일 수정
2. `SCREENS.md` 해당 화면 목업 업데이트

**기능 추가:**
1. CLAUDE.md "기능 업데이트 이력" 섹션에 요청 내용 기록
2. 해당 API route 또는 페이지 파일 수정
3. DATABASE.md 테이블 변경 있으면 업데이트
4. TESTING.md에 테스트 항목 추가

**DB 테이블 컬럼 추가:**
1. DATABASE.md 해당 테이블 스키마 업데이트
2. Supabase SQL Editor에서 ALTER TABLE 실행
3. 관련 TypeScript 타입 파일 (`src/types/`) 업데이트

---

## 5. CLAUDE.md 유지 관리 규칙

**반드시 지켜야 할 규칙:**
코드를 수정하면 CLAUDE.md도 같이 수정한다.
이 규칙 안 지키면 나중에 Claude Code가 잘못된 정보로 작업한다.

**CLAUDE.md 업데이트가 필요한 경우:**
- 새 API 라우트 추가 → API.md 업데이트
- 새 DB 테이블 추가 → DATABASE.md 업데이트
- 새 화면 추가 → USERFLOW.md + SCREENS.md 업데이트
- 법령 추가 → CLAUDE.md "법령 목록" 업데이트
- 기능 완성 → CLAUDE.md 해당 기능 상태 "완성" 으로 변경
- 버그 발견 → ERRORS.md 추가
- 버그 수정 → ERRORS.md 해당 항목 제거

---

## 6. 버전 관리 권장

```bash
# 기능 완성마다 커밋
git add .
git commit -m "feat: 사전진단 흐름 완성 - 리스크 점수 저장 + 공유 링크 연결"

# 단가 업데이트
git commit -m "data: 2025 Q2 단가 업데이트 - 타일/도장/목공"

# 법령 추가
git commit -m "law: 전기안전관리법 체크리스트 항목 추가"
```

---

## 7. 업데이트 이력 기록 양식

CLAUDE.md 맨 하단에 아래 형식으로 기록한다.

```
## 업데이트 이력

| 날짜 | 구분 | 내용 | 담당 |
|---|---|---|---|
| 2025-03-15 | 법령 | 전기안전관리법 추가 | - |
| 2025-04-01 | 단가 | 2025 Q2 전체 단가 업데이트 | - |
| 2025-04-10 | 기능 | 고객 포털 /client 신규 구현 | - |
| 2025-05-01 | 버그 | 서명 저장 오류 수정 | - |
```
