# BUILDER_SPEC.md — 체크인 기능 명세

> 최종 업데이트: 2026-02-27
> 상태: 코드 대조 완료

---

## 상태 범례
- ✅ 구현 완료
- 🔧 진행중 (구조는 있으나 일부 미완성)
- 📋 미구현 (설계 완료)
- ⚠️ 설계와 다르게 구현됨

---

## 모듈 1: 인증

| 기능 | 설명 | 페이지 | 실제 구현 | 상태 |
|------|------|--------|-----------|------|
| 이메일 로그인 | 이메일+비밀번호 로그인 | /login | Supabase Auth signInWithPassword | ✅ |
| 회원가입 | 이메일+비밀번호 | /login (회원가입 탭) | Supabase Auth signUp | ✅ |
| 카카오 로그인 | OAuth 2.0 | /login | UI 버튼만 있음, OAuth 미연결 | ⚠️ |
| 네이버 로그인 | OAuth 2.0 | /login | 미구현 | 📋 |
| 구글 로그인 | OAuth 2.0 | /login | 미구현 | 📋 |
| 비밀번호 재설정 | 이메일로 재설정 링크 | /reset-password | 미구현 | 📋 |
| 로그아웃 | 세션 종료 | - | Supabase Auth signOut | ✅ |
| 토큰 갱신 | 세션 자동 갱신 | - | Supabase 자동 처리 (middleware.ts) | ✅ |
| 인증 가드 | 비인증 접근 차단 | dashboard layout | 구현됨, 개발용 비활성화 중 | 🔧 |

> [GAP] 설계에서 예상한 JWT 직접 관리 대신 Supabase Auth 위임.
> Access/Refresh Token 관리는 Supabase가 자동 처리.

---

## 모듈 2: 프로젝트(현장) 관리

| 기능 | 설명 | 페이지 | 실제 구현 | 상태 |
|------|------|--------|-----------|------|
| 현장 등록 | 현장명, 유형, 주소, 예산, 기간 | /projects 모달 | Supabase insert | ✅ |
| 현장 목록 | 내 현장 전체 + 검색/필터 | /projects | Supabase select + 상태 필터 | ✅ |
| 현장 상세 | 현장 정보 + 리스크 요약 | /projects/[id] | 탭 네비게이션 레이아웃 | ✅ |
| 현장 수정 | 현장 정보 편집 | 프로젝트 헤더 | Supabase update | ✅ |
| 현장 삭제 | 소프트 딜리트 | - | 미구현 | 📋 |
| 멤버 초대 | 시공사/감리원 초대 | - | 미구현 | 📋 |
| 멤버 관리 | 역할 변경, 제거 | - | 미구현 | 📋 |
| 현장 공유 | 공유 링크 생성 | - | /api/share + /share/[shareId] | ✅ |

---

## 모듈 3: 진단/체크리스트

| 기능 | 설명 | 페이지 | 실제 구현 | 상태 |
|------|------|--------|-----------|------|
| 업종별 체크리스트 | 43개 업종 체크리스트 자동 로드 | /diagnostic | data/checklists/*.json | ✅ |
| 항목 체크 | 개별 항목 수동 체크/해제 | /diagnostic | diagnostic_responses 테이블 저장 | ✅ |
| AI 자동 체크 | 사진으로 관련 항목 자동 판정 | /diagnostic | /api/ai/check (autoDiagnosing) | ✅ |
| 진행률 표시 | 완료율 표시 | /diagnostic | 클라이언트 계산 | ✅ |
| 커스텀 항목 | 직접 항목 추가 | /diagnostic | custom_checklist_items 테이블 | ✅ |
| 핵심 항목 모드 | 필수 항목만 필터링 | /diagnostic | 클라이언트 필터 | ✅ |
| 카테고리 필터 | 카테고리별 필터링 | /diagnostic | 클라이언트 필터 | ✅ |
| 리스크 실시간 계산 | 체크 시 즉시 점수 계산 | /diagnostic | riskCalculator.ts | ✅ |

> [GAP] 설계의 `checklists`/`checklist_items` DB 테이블 대신
> JSON 파일(43개 업종) + `diagnostic_responses` 테이블 패턴으로 구현됨.

---

## 모듈 4: 증빙패키지 (사진/증거 관리)

| 기능 | 설명 | 페이지 | 실제 구현 | 상태 |
|------|------|--------|-----------|------|
| 파일 업로드 | 사진/PDF 다중 업로드 | /evidence-package | Supabase Storage + evidence_files | ✅ |
| SHA-256 해시 | 업로드 즉시 해시 생성 | /evidence-package | merkleTree.ts hashFile() | ✅ |
| Merkle Tree | 전체 증거 무결성 트리 | /evidence-package | merkleTree.ts buildMerkleTree() | ✅ |
| AI 자동 체크 | 사진 자동 판정 (GO/NO-GO) | /evidence-package | /api/ai/check | ✅ |
| 파일 목록 | 프로젝트별 증빙 목록 | /evidence-package | evidence_files select | ✅ |
| 카테고리 분류 | 공종별 분류 | /evidence-package | category 필드 | ✅ |
| 메타데이터 추출 | EXIF GPS/시간 추출 | - | 📋 미확인 | 📋 |
| 썸네일 생성 | 300px 자동 생성 | - | 📋 미확인 | 📋 |
| 사진 갤러리 | Before/After 비교 | /gallery | BeforeAfterSlider 컴포넌트 | ✅ |

> [GAP] 설계의 `photos` 테이블 대신 `evidence_files` + `files` 두 테이블로 분리됨.
> files 테이블은 갤러리 전용, evidence_files는 증빙 전용.

---

## 모듈 5: 리스크 점수

| 기능 | 설명 | 페이지 | 실제 구현 | 상태 |
|------|------|--------|-----------|------|
| 점수 계산 | R = Fp×Wf + Oc×Wo + Ch×Wc | /diagnostic | riskCalculator.ts (프론트) | ✅ |
| 서버사이드 계산 | calculateAndSaveRiskScore() | API 자동 트리거 | riskEngine.ts (Prompt 2) | ✅ |
| 대시보드 표시 | 현재 점수 + 등급 + 추이 | /dashboard | summary API + recharts | ✅ |
| 리스크 게이지 | SVG 게이지 차트 | 여러 페이지 | RiskGauge.tsx 컴포넌트 | ✅ |
| 점수 이력 저장 | risk_scores 테이블 이력 | 자동 | riskEngine.ts INSERT | ✅ |
| 점수 추이 차트 | 최근 30일 Area Chart | /dashboard | recharts AreaChart | ✅ |
| 등급 알림 | 위험 등급 시 알림 | - | 📋 알림 시스템 미구현 | 📋 |

> ✅ Prompt 2: risk_scores 테이블 이력 저장 구현 완료 (Wf=0.45, Wo=0.25, Wc=0.30)
> ✅ Prompt 5: 대시보드에 recharts 추이 차트 연결 완료

---

## 모듈 6: 법령 룰 엔진

| 기능 | 설명 | 상태 |
|------|------|------|
| **17개** 법령 체크 | 건설 12 + 소방 5개 법령 자동 적용 | ✅ |
| 리스크 등급 판정 | 법령 기반 safe/caution/warning/danger | ✅ |
| 법령 상세 | 각 법령 조문 + 판정 근거 | ✅ |
| 위반 배지 | 대시보드 프로젝트 카드 "법령 미충족 N건" 배지 | ✅ |
| 법령 현황 탭 | /projects/:id/law-check 전용 탭 페이지 | ✅ |
| 소방 안전 탭 | /projects/:id/fire-safety 전용 탭 페이지 | ✅ |
| 법령 DB | laws (17개) / law_checks 테이블 | ✅ |
| 소방 완비증명 가이드 | 5단계 소방완비증명서 발급 가이드 | ✅ |

> ✅ lawEngine.ts 완전 구현: 건설 12개 + 소방 5개 체크 로직
> ✅ fire_checklist_check / compound_check / multi_use_check 소방 전용 판정 로직
> ✅ 소방 카테고리는 체크리스트 미존재 시 `violated` (다른 법령은 `not_applicable`)
> ✅ 프로젝트 탭에 "⚖️ 법령" + "🔥 소방안전" 탭 추가, violated 건수 빨간 배지 표시
> ✅ 대시보드 프로젝트 카드에 "법령 미충족 N건" 빨간 배지

---

## 모듈 7: 하자담보 관리

| 기능 | 설명 | 페이지 | 실제 구현 | 상태 |
|------|------|--------|-----------|------|
| 하자담보 목록 | 공종별 담보기간 표시 | /warranty | 건산법 별표4 기반 표시 | ✅ |
| 기간 계산 | 법령별 담보기간 계산 | /warranty | 클라이언트 계산 | ✅ |
| 하자관리 | 하자 보고 및 추적 | /defects | defects 테이블 | ✅ |
| 자동 등록 | 준공 시 자동 생성 | - | 📋 미구현 | 📋 |
| 만료 알림 대시보드 | 90일 내 만료 예정 표시 | /dashboard | summary API 연동 | ✅ |
| 만료 푸시 알림 | 30일전/7일전 알림 | - | 📋 알림 시스템 미구현 | 📋 |

> ✅ warranties 테이블 Prompt 1에서 생성 완료 (20260226 마이그레이션)
> ✅ Prompt 5: 대시보드에 90일 내 만료 예정 하자담보 실시간 표시

---

## 모듈 8: 리포트/PDF

| 기능 | 설명 | 페이지 | 실제 구현 | 상태 |
|------|------|--------|-----------|------|
| AI 일보 생성 | AI가 일일 리포트 작성 | /report, /reports | /api/ai/report + reports 테이블 | ✅ |
| 리포트 목록 | 생성된 리포트 조회 | /reports | reports 테이블 select | ✅ |
| PDF 내보내기 | 프로젝트 종합 PDF | /report | html2canvas + jsPDF | ✅ |
| 공유 기능 | 리포트 공유 링크 | - | /api/share + /share/[shareId] | ✅ |
| 증거 패키지 PDF | 법정 제출용 PDF | /report | 구현됨 | ✅ |
| 주간/월간 리포트 | 기간별 요약 | - | 📋 미구현 | 📋 |

---

## 모듈 9: AI 기능 ⚠️ 설계에 없던 모듈

> [GAP] 설계에 없던 AI 기능이 대규모로 구현됨.

| 기능 | API 경로 | 상태 |
|------|---------|------|
| 역할별 AI 채팅 (고객/소장/계약/협력사) | /api/ai/chat | ✅ |
| 현장 사진 자동체크 (GO/NO-GO) | /api/ai/check | ✅ |
| 프로액티브 브리핑 (5가지 트리거) | /api/ai/proactive | ✅ |
| 리스크 예측 | /api/ai/predict | ✅ |
| AI 일보 생성 | /api/ai/report | ✅ |
| 견적 분석 | /api/ai/quote-analyze | ✅ |
| 현장 이슈 분류 | /api/ai/classify-issue | ✅ |
| 문서(노트북) 분석 | /api/ai/notebook | ✅ |
| 예산 가이드 | /api/ai/budget-guide | ✅ |
| 자율 에이전트 실행 | /api/agent/route | ✅ |

---

## 모듈 10: AI 검증 인증서 ⚠️ 설계에 없던 모듈

| 기능 | 설명 | 상태 |
|------|------|------|
| 인증서 발급 | 4×25=100점 점수 계산 후 CHK-코드 발급 | ✅ |
| 등급 판정 | A(90↑)/B(75↑)/C(60↑)/D(40↑)/F | ✅ |
| 공개 검증 | /verify/[code] 비인증 페이지 | ✅ |
| 유효기간 | 365일 자동 만료 | ✅ |
| 배지 자격 | 70점 이상 시 배지 부여 | ✅ |

---

## 모듈 11: 알림

| 기능 | 설명 | 상태 |
|------|------|------|
| 앱 내 알림 | 알림 목록 + 읽음 처리 | 📋 |
| 카카오 알림톡 | 중요 알림 카카오톡 | 📋 |
| 이메일 알림 | 리포트/중요 알림 이메일 | 📋 |
| 알림 설정 | 알림 종류별 on/off | 📋 |

---

## 모듈 12: 요금제/결제

| 기능 | 설명 | 상태 |
|------|------|------|
| 요금제 표시 | Free/Pro/Enterprise 비교 | ✅ |
| 구독 시작 | 요금제 선택 + 결제 연동 | 📋 |
| 14일 무료체험 | 체험 시작 | 📋 |
| 결제 연동 | 토스페이먼츠/아임포트 | 📋 |

---

## 모듈 13: 대시보드

| 기능 | 설명 | 상태 |
|------|------|------|
| KPI 요약 | 프로젝트 수, NO-GO 건수, 진행률 | ✅ |
| 등급별 현황 | safe/caution/warning/danger 카운트 | ✅ |
| 프로젝트 카드 | 현장별 리스크 + GO/NO-GO 배지 | ✅ |
| AI 브리핑 | 법령 위반/리스크 기반 AI 브리핑 | ✅ |
| 긴급 이슈 카드 | 법령 위반 이슈 목록 (실시간) | ✅ |
| 하자담보 만료 | 90일 내 만료 예정 (실데이터) | ✅ |
| 리스크 추이 차트 | 최근 30일 recharts Area Chart | ✅ |
| 알림 배지 | 미읽은 알림 수 | 📋 |
| 최근 활동 타임라인 | 최근 체크/사진/판정 | 📋 |

> ✅ Prompt 5: GET /api/dashboard/summary API 구현 + 대시보드 완전 연결

---

## 모듈 14: 랜딩페이지

| 기능 | 상태 |
|------|------|
| 상단 네비게이션 바 (고정, 스크롤 blur) | ✅ |
| 히어로 섹션 (메인 카피 + 대시보드 미리보기) | ✅ |
| 통계 배너 (12/526/3/700만 카운트업) | ✅ |
| 3가지 실수 (분쟁 원인 카드) | ✅ |
| 4가지 기능 (핵심 기능 소개) | ✅ |
| 12개 법령 (법령 카드 그리드) | ✅ |
| 요금제 (4단계 요금 비교, 다크 테마) | ✅ |
| FAQ | ✅ |
| CTA (무료 시작 유도) | ✅ |
| 3컬럼 푸터 | ✅ |
| 모바일 반응형 (햄버거 메뉴) | ✅ |

---

## 랜딩페이지 홍보 vs 실제 구현 대조

| 홍보 기능 | 실제 구현 | GAP |
|-----------|----------|-----|
| "사진 한 장으로 GO/NO-GO" | /api/ai/check 구현됨 | ✅ 구현됨 |
| "리스크 점수 실시간 계산" | riskCalculator.ts 구현됨 | ✅ 구현됨 |
| "하자담보 자동 등록" | warranty 페이지만 있음 | ⚠️ 자동 등록 미구현 |
| "법정용 증거 패키지" | PDF 생성 구현됨 | ✅ 구현됨 |
| "12개 법령 자동 적용" | lawEngine.ts + law_checks DB 완전 구현 | ✅ 구현됨 |
| "SHA-256 Merkle Tree" | merkleTree.ts 완전 구현 | ✅ 구현됨 |
| "AI 체크" | /api/ai/check 구현됨 | ✅ 구현됨 |
| "오프라인 모드" | 미구현 | 📋 미구현 |

---

## 관련 문서
- [ARCHITECTURE.md](./ARCHITECTURE.md) — 각 모듈이 어디에 위치하는지
- [SCHEMA.md](./SCHEMA.md) — 각 모듈의 DB 테이블
- [API_SPEC.md](./API_SPEC.md) — 각 모듈의 API 상세
- [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — 핵심 로직 상세
