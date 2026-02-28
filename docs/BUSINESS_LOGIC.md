# BUSINESS_LOGIC.md — 체크인 비즈니스 로직

> 최종 업데이트: 2026-02-27
> 상태: 코드 대조 완료
> 범례: ✅ 구현됨 | 📋 미구현 | ⚠️ 설계와 다름

---

## 1. 리스크 등급 판정 알고리즘

> [변경] GO/NO-GO 이진 판정 → **4단계 리스크 등급 시스템**으로 전면 교체
> 체크인은 판정하지 않는다. 데이터를 보여주고 결정은 사용자 몫이다.

### 리스크 등급 기반 판정 ✅ (구현 완료)

```
IF 17개 법령 중 하나라도 "violated" 상태:
  → 위험 등급 + 권장 조치: 법령 미충족 항목 해소

IF 리스크 점수 >= 76:
  → 위험 등급 + 권장 조치: 리스크 요인 점검

IF 리스크 점수 >= 51:
  → 경고 등급 + 권장 조치: 체크리스트 완료 및 증빙 보강

IF 리스크 점수 >= 26:
  → 주의 등급 + 권장 조치: 주요 항목 점검

ELSE:
  → 안전 등급
```

> ✅ `src/lib/engines/lawEngine.ts` — checkAllLaws(), checkSingleLaw() (17개 법령)
> ✅ `src/lib/engines/riskEngine.ts` — calculateAndSaveRiskScore()
> ✅ API: POST /api/projects/:id/law-check, GET /api/projects/:id/risk
> ✅ 법령 현황 탭: /projects/:id/law-check (UI 구현 완료)

### 소방 법령 판정 특수 규칙 ✅

```
소방 카테고리 (FIRE_FACILITY, FIRE_PREVENTION, BUILDING_FIRE):
  → 체크리스트 미존재 → violated (다른 법령은 not_applicable)
  → fire_checklist_check 타입으로 판정

중대재해처벌법 (SERIOUS_ACCIDENT):
  → compound_check: fire_facility + fire_prevention + 안전 모두 80% 이상 필요
  → 하나라도 미달 → violated

다중이용업소법 (MULTI_USE):
  → multi_use_check: 카페/식당/bar/bakery/beauty/fitness/retail만 적용
  → fire_certificate 체크리스트 90% 이상 필요
```

> ✅ 소방 법령 risk_weight: 1.3~1.5 (다른 법령 0.7~1.2 대비 높음)
> ✅ 소방 위반 시 리스크 점수 큰 폭 상승 (가중 평균 계산)
> ✅ /projects/:id/fire-safety 소방 전용 페이지 (UI 구현 완료)

### 실제 구현: AI 리스크 판정 ✅

### 실제 구현: AI 리스크 판정 ✅

**경로:** `/api/ai/check`

```
1. 사용자가 현장 사진 업로드
2. Gemini/Claude Vision API로 사진 전송
3. AI가 판정: GO | NO-GO | CONDITIONAL
4. 판정 근거 텍스트 반환
5. evidence_files.ai_check_result 저장
```

판정 기준 (AI 자율 판단):
- 안전 문제 (보호구 미착용, 위험 요소)
- 시공 품질 (마감 불량, 규격 미달)
- 법규 위반 가능성

---

## 2. 리스크 점수 계산

### 공식 ✅

```
R = Fp × Wf + Oc × Wo + Ch × Wc
```

**파일:** `src/lib/utils/riskCalculator.ts`

### 가중치 비교 ⚠️

| 변수 | 설계 가중치 | 실제 코드 가중치 | 변수명(코드) |
|------|------------|----------------|-------------|
| Fp (재정 위험) | Wf = **0.45** | Wf = **0.40** | financial_risk |
| Oc (운영 복잡도) | Wo = **0.25** | Wo = **0.35** | operational_complexity |
| Ch (변경 리스크) | Wc = **0.30** | Wc = **0.25** | change_risk |

> [GAP] 코드의 가중치 합계는 동일하게 1.00이나, 각 가중치 값이 설계와 다르다.
> 코드 기준이 현재 정본이다.

### 실제 코드의 변수 계산 ✅

**Fp (재정적 위험 점수, 0~100):**
```
견적 항목 존재 여부 + 비용분석 수행 여부 + 예산 초과 비율로 계산
```

**Oc (운영 복잡도 점수, 0~100):**
```
공정 수 + 진행률 대비 일정 지연 + 변경관리 건수로 계산
```

**Ch (변경 리스크 점수, 0~100):**
```
변경 주문 건수 + 미승인 변경 비율 + 변경 금액 비율로 계산
```

### 등급 분류 ✅

| 점수 범위 | 등급 | 라벨 | 색상 |
|-----------|------|------|------|
| 0 ~ 25 | safe | 안전 | #22c55e |
| 26 ~ 50 | caution | 주의 | #eab308 |
| 51 ~ 75 | warning | 경고 | #f97316 |
| 76 ~ 100 | danger | 위험 | #ef4444 |

### 업종별 가중치 ✅

코드에 13개 업종별 맞춤 가중치 정의됨:
`interior, construction, renovation, electrical, plumbing, painting, flooring, kitchen, bathroom, window, roofing, landscaping, commercial`

### 계산 시점 ✅
- 체크리스트 항목 변경 시 (실시간)
- 페이지 로드 시
- 수동 재계산 요청 시

### 저장 ✅
- `projects.risk_score`, `projects.risk_grade` — 최신값 빠른 조회용
- `risk_scores` 테이블 — 매 계산마다 새 row INSERT (이력 저장, 30일 추이 그래프 지원)

---

## 3. 비용 계산 공식 ✅ ⚠️ 설계에 없던 로직

**파일:** `src/lib/utils/costCalculator.ts`

```
ΔC = Cb × (1 + Σ(Wi × Fi))
```

| 변수 | 설명 | 기본 가중치 |
|------|------|------------|
| Cb | 기본 비용 | - |
| Wi | 요인별 가중치 | 아래 참고 |
| Fi | 요인별 영향도 (-1 ~ +1) | 사용자 입력 |

**요인별 가중치 (7개):**
| 요인 | 변수명 | 가중치 |
|------|--------|--------|
| 공사 복잡도 | complexity_weight | 0.15 |
| 공기 압박 | timeline_weight | 0.10 |
| 자재 변동 | material_weight | 0.12 |
| 인건비 변동 | labor_weight | 0.08 |
| 리스크 프리미엄 | risk_weight | 0.10 |
| 현장 여건 | location_weight | 0.08 |
| 계절 요인 | season_weight | 0.07 |

**시나리오 분석:**
- 낙관 시나리오: Fi를 0.5배 적용
- 현실 시나리오: Fi 그대로 적용
- 비관 시나리오: Fi를 1.5배 적용

---

## 4. AI 검증 점수 (4×25=100점) ✅ ⚠️ 설계에 없던 로직

**파일:** `src/lib/verification/scoreEngine.ts`

```
총점 = 비용 점수(0~25) + 공정 점수(0~25) + 계약 점수(0~25) + 일정 점수(0~25)
```

### 비용 점수 (0~25)

| 항목 | 점수 | 조건 |
|------|------|------|
| 견적 항목 존재 | 8점 | quote_line_items 1개 이상 |
| 비용분석 수행 | 7점 | cost_analysis 레코드 존재 |
| 카테고리 다양성 | 5점 | 3개 이상 카테고리 |
| 비용 차이율 | 5점 | 원가 대비 20% 이하 초과 |

### 공정 점수 (0~25)

| 항목 | 점수 | 조건 |
|------|------|------|
| 공정 등록 | 6점 | processes 3개 이상 |
| 완료율 | 10점 | 완료율 비례 |
| 일정 설정 | 5점 | start/end_date 모두 설정 |
| 지연 없음 보너스 | 4점 | delayed 상태 공정 없음 |

### 계약 점수 (0~25)

| 항목 | 점수 | 조건 |
|------|------|------|
| 합의서 존재 | 8점 | agreements 레코드 존재 |
| 증빙 파일 | 8점 | evidence_files 5개 이상 |
| 변경관리 | 9점 | change_orders 존재 |

### 일정 점수 (0~25)

| 항목 | 점수 | 조건 |
|------|------|------|
| 기한 내 진행 | 8점 | 오늘이 end_date 이전 |
| 지연 공정 없음 | 8점 | delayed 공정 0개 |
| 공정 일정 설정 | 5점 | 공정에 날짜 설정됨 |
| 총 공기 적절성 | 4점 | 30일 이상 공기 |

### 등급 기준

| 등급 | 점수 | 라벨 |
|------|------|------|
| A | 90~100 | 최우수 |
| B | 75~89 | 우수 |
| C | 60~74 | 양호 |
| D | 40~59 | 보통 |
| F | 0~39 | 미흡 |

- 배지 자격: **70점 이상**
- 인증서 코드: `CHK-YYYY-XXXXX` (혼동 문자 제외)
- 유효기간: **365일**

---

## 5. 하자담보 기간 계산

### 건산법 시행령 별표4 기준 ✅ (warranty 페이지에서 UI 표시)

| 공종 | 담보기간(년) |
|------|-------------|
| 대지조성공사 | 2 |
| 옥외급배수/위생 | 2 |
| 수장공사 (도배, 타일 등) | 1 |
| 도장공사 | 1 |
| 방수공사 | 3 |
| 석공사 | 1 |
| 창호공사 | 1 |
| 전기/통신공사 | 2 |
| 설비공사 | 2 |
| 철근콘크리트공사 | 5 |
| 철골공사 | 5 |
| 조경공사 | 2 |

### 자동 등록/알림 📋

> [GAP] 설계에서는 프로젝트 status "completed" 변경 시 자동 등록 + 30/7일 만료 알림이지만,
> 현재 코드에서 이 자동화 로직은 **미구현**이다.
> warranty 페이지 UI는 있으나 DB 자동화 트리거가 없다.

---

## 6. 체크리스트 AI 자동 판정 로직 ✅

**경로:** `/api/ai/check`

```
1. 사용자가 현장 사진 업로드
2. Gemini Vision / Claude Vision API로 사진 전송
3. AI가 사진에서 감지:
   - 시공 공종 (방수, 타일, 전기 등)
   - 시공 상태 (양호/불량/미완료)
   - 안전 요소 (보호구, 안전 표지판 등)
4. 분석 결과:
   - PASS: 정상 시공 확인
   - FAIL: 문제 발견
   - UNCERTAIN: 판단 불가
5. evidence_files.ai_check_result에 저장
6. diagnostic 페이지의 해당 항목에 자동 반영 (autoDiagnosing)
```

> [GAP] 설계의 신뢰도 기반 분류(80%↑ ai_auto, 50~79% ai_assisted)와 달리
> 실제 구현은 AI의 PASS/FAIL/UNCERTAIN 판정을 사용한다.

---

## 7. 요금제별 기능 분기

### 현재 구현된 요금제 ✅ (landing + payment 페이지)

| 플랜 | 가격 | 기능 |
|------|------|------|
| Free | ₩0 | 기본 체크리스트, 프로젝트 1개 |
| Pro | ₩79,000/월 | 전체 기능, AI 무제한, 인증서 |
| Enterprise | 문의 | 팀 계정, 커스텀, 전담 매니저 |

> [GAP] 설계에는 Starter(₩29,000) 플랜이 있었으나, 실제 payment 페이지는
> Free/Pro/Enterprise 3단계로 단순화됨.

### 기능 분기 코드 📋

> 요금제별 기능 제한 로직(`canAccessFeature()`)은 코드에서 확인 안 됨.
> 현재 모든 기능이 인증 없이 접근 가능한 개발 모드로 동작 중.

---

## 관련 문서
- [SCHEMA.md](./SCHEMA.md) — 각 로직의 데이터 저장 구조
- [API_SPEC.md](./API_SPEC.md) — 각 로직을 호출하는 API
- [BUILDER_SPEC.md](./BUILDER_SPEC.md) — 기능 구현 상태

---

## 8. SHA-256 증거 무결성 시스템 ✅ (Prompt 4 구현 완료)

### 핵심 엔진

**파일:** `src/lib/engines/evidenceEngine.ts`

| 함수 | 설명 |
|------|------|
| `generateSHA256(buffer)` | Node.js crypto, 동기, 64자 hex 반환 |
| `buildMerkleRoot(hashes[])` | 재귀 Merkle Tree, 홀수 시 마지막 복제 |
| `generateAndSaveMerkleRoot(projectId)` | is_evidence=true 파일 전체 루트 계산 + DB 저장 |
| `verifyFileIntegrity(fileId)` | Storage 다운로드 → 재해시 → 비교 |
| `verifyMerkleTree(projectId)` | sha256_hash로 루트 재계산 → 저장값 비교 |
| `uploadEvidenceFile(projectId, file)` | 업로드 + SHA-256 자동 생성 |

### API 엔드포인트

| 엔드포인트 | 역할 |
|---|---|
| `POST /api/projects/:id/photos` | 파일 업로드 + SHA-256 해시 자동 생성 |
| `POST /api/projects/:id/evidence/merkle` | Merkle Root 생성/갱신 |
| `GET /api/photos/:id/verify` | 개별 파일 SHA-256 무결성 검증 |
| `GET /api/projects/:id/evidence/verify` | 전체 Merkle Tree 검증 |

### 테스트 결과 (7/7 PASS)

- SHA-256: 64자 hex ✅
- 동일 파일 → 동일 해시 ✅
- 다른 파일 → 다른 해시 ✅
- Merkle Root 결정론적 ✅
- 변조 감지 ✅
- 파일 1개 엣지케이스 ✅
- 빈 배열 엣지케이스 ✅

> 기존 `src/lib/utils/merkleTree.ts`는 브라우저용(Web Crypto API).
> evidenceEngine.ts는 서버 API용(Node.js crypto).
