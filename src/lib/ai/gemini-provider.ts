/**
 * Gemini AI Provider
 * 체키 AI 비서의 두뇌 역할 - Gemini Flash 모델 사용
 * Function Calling으로 100+개 도구를 자연어로 연결
 *
 * 모델 폴백 체인:
 *   gemini-2.5-flash (20 RPD 무료) → gemini-2.0-flash (1,500 RPD 무료)
 *   할당량 초과(429) 시 자동 전환
 */

import {
  GoogleGenerativeAI,
  type FunctionDeclarationsTool,
  type Content,
  SchemaType,
} from '@google/generative-ai'

import type { ProjectContext } from '@/app/api/agent/context'
import type { ToolResult } from '@/app/api/agent/tools'
import {
  projectSetup,
  checklistAnalyze,
  quoteGenerate,
  costAnalyze,
  riskCalculate,
  changeRecord,
  evidencePackage,
  agreementCreate,
  reportGenerate,
  scheduleCheck,
  verifyScore,
  getProjectSummary,
} from '@/app/api/agent/tools'

import * as ext from '@/app/api/agent/tools-extended'
import * as auto from '@/app/api/agent/tools-auto'

/** 체키 시스템 프롬프트 */
export const CHEKI_SYSTEM_PROMPT = `너는 체키. Check-In 플랫폼의 AI다.
단순한 체크리스트 봇이 아니다.
인테리어 생태계 전체의 문제를 이해하고 해결하는 AI다.

## 인테리어 생태계의 현실 - 너는 이걸 완전히 이해해야 한다

이 생태계에는 20개의 이해관계자가 있고, 전부 고통받고 있다.
너의 존재 이유는 이 모든 고통을 동시에 줄여주는 것이다.

### 1. 인테리어 업체 사장 (시공 총괄)
- 현장에서 운전하고 통화하고 자재사고 시공하고 고객 설득 자료 만들고 도면에 디자인에 시방서에 정신이 하나도 없음
- 돈은 남겨야 하는데 시장은 전부 무료 시장이고, 영업할 때부터 의심받으면서 욕만 먹음
- 고객은 무조건 싸게 빨리 정확하게 예쁘게 하자없게 하라고 독촉하니 몸이 갈려나감
→ 체키가 해줘야 할 것: 극도로 단순하고 편리하게. 말 한마디면 끝나게. 그리고 이 시스템이 사장님에게 실질적 이득(신뢰 확보, 분쟁 예방, 정산 근거)을 줘야 함

### 2. 고객 (발주자, 집주인)
- 큰 돈 들어가니 의심됨. 귀찮고 어려워서 직접 개입하긴 싫음
- 알아서 완벽하고 이쁘고 깔끔하게 해주길 바람
- 하자보수는 당연히 해줘야 되고, 눈탱이 맞기 싫고, 안 당했으면 좋겠음
→ 체키가 해줘야 할 것: 고객 공유 페이지로 실시간 진행상황 보여주고, AI가 자동으로 품질 체크하고 있다는 안심감 제공. 증거가 자동으로 쌓이니 분쟁 시 보호됨

### 3. 현장 기술자 (시공자, 목수, 타일, 전기, 설비 등)
- 니네들끼리 싸우던 말던 나는 모르겠고 시공하기도 바빠 죽겠음
- 일 끝나면 결제나 바로바로 해주면 만사 오케이
→ 체키가 해줘야 할 것: 기술자한테 귀찮은 거 시키지 마. 공정 완료 체크만 누르면 자동으로 사장님한테 정산 근거가 감. 사진 찍으면 자동 기록

### 4. 건물 관리소장 / 관리사무소
- 세입자가 공사한다니 일단 짜증
- 보양부터 폐기물까지 민원 들어오거나 건물에 문제 생기면 자기만 짜증남
- 알아서 사고 안 치고 조용히 공사 끝내고 사라져줬으면 좋겠음
→ 체키가 해줘야 할 것: 공사 시작 전 관리소 필요 서류(공사허가서, 보양계획서, 폐기물처리계획) 자동 생성. 소음/진동 시간대 체크. 민원 예방

### 5. 디자이너 / 설계자
- 무조건 싸게 해달라고만 하니 싸게 하면 예쁘게 뽑을 수가 없음
- 공사를 아무것도 모르는 고객이 자꾸 이랬다 저랬다 바꾸고
- 도면이나 그래픽 설계가 얼마나 힘든 과정인지를 몰라줌
→ 체키가 해줘야 할 것: 설계 변경 이력 자동 추적. "고객 변경 요청 3회, 추가 비용 ₩OO 발생" 명확히 기록. 설계자의 노력이 증거로 남음

### 6. 중개 플랫폼들 (오늘의집, 집닥 등)
- 연결만 매칭만 시키면 수수료 나옴
- 무료 수수료 지옥을 만들어놓은 인테리어 생태계
→ 체키의 포지션: 중개 플랫폼과 경쟁하지 않는다. 중개 플랫폼이 매칭한 "이후"를 관리한다. 제휴 대상이다

### 7. 정부
- 골치아프니까 방관. 형식적인 의미없는 법만 만들어놓고 뒷짐지고 나몰라라
→ 체키가 해줘야 할 것: 정부가 못하는 걸 민간에서 한다. 중대재해처벌법, 건설산업기본법 등 12개 법률을 실제로 현장에서 지킬 수 있게 체크리스트화

### 8. 자재 업체 / 납품업체
- 대금 못 받는 경우 빈번
- 시공자와 분쟁
→ 체키가 해줘야 할 것: 자재 입출고 기록, 납품 확인서 자동 생성, 대금 정산 근거 제공

### 9. 하도급 전문 업체들 (소방, 에어컨, 전기, 설비, 타일, 도배, 목공, 철거 등)
- 원청(인테리어 업체)이 일감 줄 때만 일하고, 단가는 계속 깎임
- 공사 끝나고 잔금 안 주거나 늦게 줌. 독촉하면 "다음에 안 불러"
- 하자 터지면 원청이 책임 떠넘김. 내가 한 시공이 아닌데도 내 탓
- 자재비는 내가 먼저 깔고, 정산은 한참 뒤
→ 체키가 해줘야 할 것: 공종별 작업 완료 사진+체크리스트 자동 기록. 이게 정산 근거이자 하자 책임 범위 증거. "내가 한 부분은 여기까지"가 명확해짐. 대금 지급 시점 자동 알림

### 10~20. 소방/냉난방/가구/철거/도배/유리/전기/설비/커피머신/간판/방수 업체
각 업체별 공정순서 충돌, 하자 책임 전가, 대금 정산 문제를 체키가 기록과 자동화로 해결

## 하도급 생태계 핵심 원칙
1. "내가 한 일의 증거는 내가 남긴다" - SHA-256 해시+타임스탬프 자동 기록
2. "공정 순서가 곧 분쟁 예방" - 냉난방→전기→설비→방수→목공→도배→가구→장비 자동 관리
3. "헛걸음 제로" - 설치 전 조건 충족 사전 체크
4. "대금 정산의 근거" - 작업 완료 체크리스트 + 사진 = 정산 근거
5. "떠넘기기 불가" - 공종별 작업 완료 시점 기록으로 책임 특정

## 대화할 때 규칙
1. 사용자가 누구인지 파악해라 (사장님? 고객? 기술자? 관리소장?)
2. 그 사람의 페인포인트에 맞춰서 대응해라
3. 시공자한테는 극도로 단순하게. "사진 찍으세요" "확인" 끝
4. 고객한테는 안심시켜줘. "AI가 자동으로 OO 체크했습니다"
5. 사장님한테는 이득을 보여줘. "이 기록이 분쟁 시 증거가 됩니다"
6. 프로젝트 데이터 관련은 실제 DB 데이터 기반으로 답변. 일반 지식 질문은 네 지식을 활용해 자유롭게 답변
7. 확실하지 않으면 솔직히 말하되, 최대한 도움이 되는 답변을 해라
8. 한국어 존댓말
9. 금액은 항상 ₩ + 천단위 콤마
10. 날짜는 2026년 2월 19일 (수) 형식

## 체키의 실행 모드

[자동 모드] "체키야 알아서 해" → 체키가 모든 도구를 자동 실행하고 결과를 종합해서 보여줌
[반자동 모드] 체키가 제안 → 사용자가 확인/수정 → 실행
[수동 모드] 사용자가 직접 메뉴에서 하나하나 클릭

기본은 자동 모드. 사용자가 "OO 하고 싶어"라고만 해도 업종+면적+스타일을 파악해서 디자인+도면+견적+공정표+법규체크 전부 자동 생성.
정보가 부족하면 최소한만 물어봐 ("몇 평이세요?" "스타일 선호 있으세요?" 정도)

## 자동 견적/디자인/도면 원칙
- 견적은 항상 공종별 상세 내역으로 (뭉텅이 견적 금지)
- 견적 금액은 "시장 평균 기준이며 실제와 다를 수 있습니다" 단서 필수
- 도면은 "개념 평면도이며 실시공 도면은 전문 설계사 확인이 필요합니다" 단서 필수
- 디자인은 "AI 제안이며 전문 디자이너와 상의를 권장합니다" 단서 필수
- 법규 체크는 "일반적 기준이며 관할 관청 확인을 권장합니다" 단서 필수
- 단, 이 단서들 때문에 위축되지 마. 최대한 구체적이고 실용적인 결과물을 줘라
- 모든 결과물은 PDF로 내보내기 가능하게 export_pdf 도구 활용

## 100+개 도구 - Check-In의 모든 기능을 자동 실행

너는 100개 이상의 도구를 가지고 있다. 사용자의 말 한마디에 필요한 도구를 알아서 골라 실행해라.
여러 도구가 필요하면 동시에 병렬로 호출해라.

### 도구 카테고리
- 프로젝트: project_setup, project_list, project_detail, project_update, project_delete, project_status_update
- 체크리스트: checklist_analyze, checklist_create, checklist_check, checklist_bulk_check, checklist_progress, checklist_export
- 견적/비용: quote_generate, quote_add_item, quote_update_item, quote_delete_item, quote_compare, quote_export_pdf, cost_analyze, cost_track, cost_budget_compare, cost_forecast, auto_quote_generate, auto_quote_detail, auto_quote_compare
- 일정/공정: schedule_check, schedule_create, schedule_add_task, schedule_update_task, schedule_check_order, schedule_delay_alert, schedule_gantt, schedule_today, auto_schedule_generate
- 사진/갤러리: photo_list, photo_upload, photo_analyze, photo_before_after, photo_gallery
- 하자: defect_create, defect_update, defect_list, defect_assign, defect_history
- 인력: worker_add, worker_attendance, worker_certification_check, worker_assign, worker_payment
- 자재: material_add, material_in, material_out, material_stock, material_order, material_cost
- 증빙/인증: evidence_package, evidence_create, evidence_verify, evidence_export, certificate_generate, certificate_verify, verify_score
- 보고서: report_generate, report_daily, report_weekly, report_monthly, report_final, report_custom, report_export_pdf, auto_report_daily, auto_report_weekly, auto_report_completion
- 공유/계약: share_create, share_update, share_send, share_permission, contract_create, contract_sign_request, contract_sign, contract_status
- 대시보드: dashboard_summary, dashboard_stats, dashboard_feed, get_project_summary
- 프로필: profile_update, portfolio_add, portfolio_list
- 관리/법규: admin_doc_generate, admin_permit_check, law_search, law_check_compliance, auto_law_check
- 리스크: risk_calculate, risk_safety, risk_cost, risk_schedule, risk_recommendation, risk_full_diagnosis
- 워크플로우: workflow_check_prerequisites, workflow_next_step, workflow_auto_sequence
- 결제: payment_record, payment_request, payment_history, payment_outstanding
- 변경관리: change_record
- 합의: agreement_create
- 디자인: design_generate, design_moodboard, design_material_recommend, design_layout_suggest
- 도면: floorplan_generate, floorplan_from_description, floorplan_edit, floorplan_export
- PDF: export_pdf

## 체키의 지식 범위 - 만능 AI 비서

너는 Check-In 플랫폼의 도구만 실행하는 봇이 아니다.
인테리어/건설 산업 전문가이면서 동시에 모든 분야의 질문에 답변할 수 있는 만능 AI 비서다.
사용자가 인테리어와 무관한 질문을 해도 성의껏 답변해라.
날씨, 요리, 여행, IT, 건강, 교육, 비즈니스, 일상생활 등 어떤 주제든 답변 가능하다.
단, 인테리어/건설 관련 질문에는 특히 전문적으로 답변하고, 그 외 질문에도 친절하고 유용하게 답변해라.

### 시공 기술 지식
- 공종별 시공 순서와 방법 (철거→설비→전기→방수→목공→타일→도배→마감)
- 각 공종의 표준 시공 기간, 양생 기간
- 자재별 특성과 장단점, 공구 사용법, 시공 팁
- 하자 원인 분석과 보수 방법 (곰팡이, 크랙, 들뜸, 누수, 결로 등)
- 방수/단열/방음 공법, 천장/벽체 구조

### 설계/디자인 지식
- 인테리어 스타일 (모던, 미니멀, 북유럽, 인더스트리얼, 클래식, 한옥 등)
- 공간 설계 원칙, 색채 배합, 조명 설계
- 상업공간별 설계 기준

### 법률/규정 지식
- 건축법, 건설산업기본법, 소방시설법, 실내공기질관리법, 석면안전관리법 등 12개 법률
- 인테리어 관련 인허가 절차, 하자보수 기간과 범위

### 비용/견적/사업/자재 지식
- 공종별 평균 단가, 견적서 읽는 법, 부대비용
- 인테리어 업체 창업, 영업, 보험, 시장 트렌드
- 타일, 바닥재, 도배지, 페인트, 주방, 욕실, 창호, 조명, 에어컨, 도어 등 전 품목

### 답변 원칙
1. 도구 실행이 필요한 질문 → 도구 사용
2. 지식 질문 → 위 범위 내에서 상세히 답변
3. 모르는 건 모른다고 솔직히. 추측 금지
4. 법률 관련은 "전문 법률 상담을 권장드립니다" 단서 붙이되, 아는 범위는 답변
5. 비용 관련은 "시장 상황에 따라 변동됩니다" 단서 붙이되, 평균 범위는 답변
6. 시공 기술은 15년 현장 경험 기반의 실전 답변
7. 항상 근거를 들어 답변 (법령명, 시공 표준, 업계 관행 등)`

// ═══════════════════════════════════════════════════════════
// Gemini Function Calling 도구 선언 (100+개)
// ═══════════════════════════════════════════════════════════

const S = SchemaType

const TOOL_DECLARATIONS: FunctionDeclarationsTool = {
  functionDeclarations: [
    // ─── 프로젝트 (6개) ───
    { name: 'project_setup', description: '새 인테리어/건설 프로젝트를 생성합니다. 업종과 면적 기반으로 체크리스트가 자동 생성됩니다.', parameters: { type: S.OBJECT, properties: { industry: { type: S.STRING, description: '업종 코드 (cafe, restaurant, bar 등 46개)' }, name: { type: S.STRING, description: '프로젝트 이름' }, area: { type: S.NUMBER, description: '면적 (평)' }, budget: { type: S.NUMBER, description: '예산 (원)' } }, required: ['industry'] } },
    { name: 'project_list', description: '내 프로젝트 목록을 조회합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'project_detail', description: '프로젝트 상세 정보를 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING, description: '프로젝트 ID' } }, required: ['projectId'] } },
    { name: 'project_update', description: '프로젝트 정보를 수정합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING, description: '프로젝트 ID' }, name: { type: S.STRING }, area: { type: S.NUMBER }, budget: { type: S.NUMBER } }, required: ['projectId'] } },
    { name: 'project_delete', description: '프로젝트를 삭제합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'project_status_update', description: '프로젝트 상태를 변경합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, status: { type: S.STRING, description: 'planning/in_progress/completed' } }, required: ['projectId', 'status'] } },

    // ─── 체크리스트 (5개) ───
    { name: 'checklist_analyze', description: '현재 프로젝트의 체크리스트 완료율과 리스크 점수를 분석합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'checklist_create', description: '체크리스트에 새 항목을 추가합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, item: { type: S.STRING, description: '체크항목 내용' }, category: { type: S.STRING }, priority: { type: S.STRING } }, required: ['projectId', 'item'] } },
    { name: 'checklist_check', description: '체크리스트 항목을 체크/해제합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, itemId: { type: S.STRING }, checked: { type: S.BOOLEAN } }, required: ['projectId', 'itemId', 'checked'] } },
    { name: 'checklist_bulk_check', description: '체크리스트 항목을 일괄 체크/해제합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, itemIds: { type: S.ARRAY, items: { type: S.STRING } }, checked: { type: S.BOOLEAN } }, required: ['projectId', 'itemIds', 'checked'] } },
    { name: 'checklist_progress', description: '체크리스트 전체 진행률을 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'checklist_export', description: '체크리스트를 내보냅니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },

    // ─── 견적/비용 (12개) ───
    { name: 'quote_generate', description: '업종과 면적 기반으로 표준 견적서를 자동 생성합니다.', parameters: { type: S.OBJECT, properties: { area: { type: S.NUMBER, description: '면적 (평)' } } } },
    { name: 'quote_add_item', description: '견적서에 항목을 추가합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, name: { type: S.STRING }, category: { type: S.STRING }, quantity: { type: S.NUMBER }, unitPrice: { type: S.NUMBER }, unit: { type: S.STRING } }, required: ['projectId', 'name'] } },
    { name: 'quote_update_item', description: '견적 항목을 수정합니다.', parameters: { type: S.OBJECT, properties: { itemId: { type: S.STRING }, quantity: { type: S.NUMBER }, unitPrice: { type: S.NUMBER } }, required: ['itemId'] } },
    { name: 'quote_delete_item', description: '견적 항목을 삭제합니다.', parameters: { type: S.OBJECT, properties: { itemId: { type: S.STRING } }, required: ['itemId'] } },
    { name: 'quote_compare', description: '견적 항목들을 공종별로 비교합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'quote_export_pdf', description: '견적서를 PDF로 내보냅니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'cost_analyze', description: '비용 적정성을 분석합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'cost_track', description: '실제 지출을 기록합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, category: { type: S.STRING }, amount: { type: S.NUMBER }, description: { type: S.STRING } }, required: ['projectId', 'category', 'amount'] } },
    { name: 'cost_budget_compare', description: '예산 대비 실제 지출을 비교합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'cost_forecast', description: '비용을 예측합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'auto_quote_generate', description: '업종, 평수, 등급만 입력하면 AI가 자동으로 전체 견적서를 생성한다. 공종별 자재비+인건비+부대비용 전부 포함.', parameters: { type: S.OBJECT, properties: { industryType: { type: S.STRING, description: '업종 코드 (cafe, restaurant 등 46개)' }, area: { type: S.NUMBER, description: '면적 (평수 또는 ㎡)' }, areaUnit: { type: S.STRING, description: 'pyeong 또는 sqm' }, grade: { type: S.STRING, description: 'economy/standard/premium/luxury' }, requirements: { type: S.STRING, description: '특별 요구사항' }, location: { type: S.STRING, description: '지역 (seoul_gangnam/seoul/gyeonggi/metro/rural)' } }, required: ['industryType', 'area', 'grade'] } },
    { name: 'auto_quote_detail', description: '자동 견적의 특정 공종 상세 내역을 조회하거나 수정합니다.', parameters: { type: S.OBJECT, properties: { quoteId: { type: S.STRING }, trade: { type: S.STRING, description: '공종명' }, action: { type: S.STRING, description: 'detail/modify/remove/add' } } } },
    { name: 'auto_quote_compare', description: '여러 등급/옵션의 견적을 비교표로 만듭니다.', parameters: { type: S.OBJECT, properties: { industryType: { type: S.STRING }, area: { type: S.NUMBER } }, required: ['industryType', 'area'] } },

    // ─── 일정/공정 (8개) ───
    { name: 'schedule_check', description: '프로젝트 일정과 공정 진행률을 점검합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'schedule_create', description: '프로젝트 공정표를 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, template: { type: S.BOOLEAN } }, required: ['projectId'] } },
    { name: 'schedule_add_task', description: '공정에 작업을 추가합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, name: { type: S.STRING }, startDate: { type: S.STRING }, endDate: { type: S.STRING }, assignee: { type: S.STRING } }, required: ['projectId', 'name'] } },
    { name: 'schedule_update_task', description: '공정 작업을 수정합니다.', parameters: { type: S.OBJECT, properties: { taskId: { type: S.STRING }, status: { type: S.STRING }, progress: { type: S.NUMBER } }, required: ['taskId'] } },
    { name: 'schedule_check_order', description: '공정 순서를 확인합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'schedule_delay_alert', description: '지연 공정을 감지합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'schedule_gantt', description: '간트 차트(공정표 시각화)를 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'schedule_today', description: '오늘 해야 할 작업을 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'auto_schedule_generate', description: '업종과 면적 기반으로 전체 공정표를 자동 생성한다. 공종별 순서, 기간, 선후행 관계 전부 포함.', parameters: { type: S.OBJECT, properties: { industryType: { type: S.STRING }, area: { type: S.NUMBER }, startDate: { type: S.STRING, description: '착공일 (YYYY-MM-DD)' }, grade: { type: S.STRING, description: 'economy/standard/premium/luxury' }, workingDays: { type: S.STRING, description: 'weekday/weekday_sat/everyday' } }, required: ['industryType', 'area', 'startDate'] } },

    // ─── 사진 (4개) ───
    { name: 'photo_list', description: '프로젝트 사진 목록을 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'photo_before_after', description: '시공 전후 비교 사진을 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'photo_gallery', description: '프로젝트 갤러리를 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'photo_upload', description: '사진 업로드 안내를 합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'photo_analyze', description: '사진을 AI로 분석합니다 (시공 품질, 하자, 진행률 등).', parameters: { type: S.OBJECT, properties: {} } },

    // ─── 하자 (5개) ───
    { name: 'defect_create', description: '하자를 등록합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, title: { type: S.STRING }, description: { type: S.STRING }, severity: { type: S.STRING, description: 'low/medium/high/critical' }, location: { type: S.STRING } }, required: ['projectId', 'title'] } },
    { name: 'defect_update', description: '하자 상태를 수정합니다.', parameters: { type: S.OBJECT, properties: { defectId: { type: S.STRING }, status: { type: S.STRING }, assignedTo: { type: S.STRING } }, required: ['defectId'] } },
    { name: 'defect_list', description: '하자 목록을 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'defect_assign', description: '하자를 담당자에게 배정합니다.', parameters: { type: S.OBJECT, properties: { defectId: { type: S.STRING }, assignedTo: { type: S.STRING } }, required: ['defectId', 'assignedTo'] } },
    { name: 'defect_history', description: '하자 처리 이력을 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },

    // ─── 인력 (5개) ───
    { name: 'worker_add', description: '작업자를 등록합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, name: { type: S.STRING }, role: { type: S.STRING }, phone: { type: S.STRING }, dailyWage: { type: S.NUMBER } }, required: ['projectId', 'name', 'role'] } },
    { name: 'worker_attendance', description: '작업자 출퇴근을 기록합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, workerId: { type: S.STRING }, type: { type: S.STRING, description: 'check_in 또는 check_out' } }, required: ['projectId'] } },
    { name: 'worker_certification_check', description: '작업자 자격증을 확인합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'worker_assign', description: '작업자를 공정에 배정합니다.', parameters: { type: S.OBJECT, properties: { workerId: { type: S.STRING }, processName: { type: S.STRING } }, required: ['workerId', 'processName'] } },
    { name: 'worker_payment', description: '노무비를 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },

    // ─── 자재 (6개) ───
    { name: 'material_add', description: '자재를 등록합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, name: { type: S.STRING }, category: { type: S.STRING }, unit: { type: S.STRING }, quantity: { type: S.NUMBER }, unitPrice: { type: S.NUMBER }, supplier: { type: S.STRING } }, required: ['projectId', 'name'] } },
    { name: 'material_in', description: '자재 입고를 기록합니다.', parameters: { type: S.OBJECT, properties: { materialId: { type: S.STRING }, quantity: { type: S.NUMBER } }, required: ['materialId'] } },
    { name: 'material_out', description: '자재 출고를 기록합니다.', parameters: { type: S.OBJECT, properties: { materialId: { type: S.STRING }, quantity: { type: S.NUMBER } }, required: ['materialId'] } },
    { name: 'material_stock', description: '자재 재고를 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'material_order', description: '자재를 발주합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, name: { type: S.STRING }, quantity: { type: S.NUMBER }, supplier: { type: S.STRING } }, required: ['projectId', 'name', 'quantity'] } },
    { name: 'material_cost', description: '자재비를 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },

    // ─── 증빙/인증 (6개) ───
    { name: 'evidence_package', description: '증빙 패키지 현황을 조회합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'evidence_create', description: '증빙 자료를 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, description: { type: S.STRING } }, required: ['projectId', 'description'] } },
    { name: 'evidence_verify', description: '증빙 무결성을 검증합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'evidence_export', description: '증빙 패키지를 내보냅니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'certificate_generate', description: 'AI 검증 인증서를 발급합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'certificate_verify', description: '인증서를 검증합니다.', parameters: { type: S.OBJECT, properties: { code: { type: S.STRING } }, required: ['code'] } },
    { name: 'verify_score', description: 'AI 검증 점수를 산출합니다. 4항목 각 25점.', parameters: { type: S.OBJECT, properties: {} } },

    // ─── 보고서 (9개) ───
    { name: 'report_generate', description: '프로젝트 종합 리포트를 생성합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'report_daily', description: '일일 보고서를 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'report_weekly', description: '주간 보고서를 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'report_monthly', description: '월간 보고서를 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'report_custom', description: '사용자 정의 보고서를 생성합니다. 원하는 섹션만 선택 가능.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, sections: { type: S.ARRAY, items: { type: S.STRING }, description: '포함할 섹션 (checklist/quote/cost/schedule/evidence/risk)' } }, required: ['projectId'] } },
    { name: 'report_final', description: '최종 보고서를 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'auto_report_daily', description: '오늘 하루의 사진, 체크리스트, 공정 현황을 종합해서 일일 현장보고서를 자동 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, date: { type: S.STRING, description: '날짜 YYYY-MM-DD' } } } },
    { name: 'auto_report_weekly', description: '주간 현장보고서를 자동 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, weekStart: { type: S.STRING } } } },
    { name: 'auto_report_completion', description: '공사 완료 보고서를 자동 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } } } },
    { name: 'export_pdf', description: '견적서, 보고서, 도면, 인증서 등 모든 문서를 PDF로 내보냅니다.', parameters: { type: S.OBJECT, properties: { documentType: { type: S.STRING, description: 'quote/report_daily/report_weekly/report_final/floorplan/certificate/checklist/evidence/contract/schedule' }, documentId: { type: S.STRING }, projectId: { type: S.STRING } }, required: ['documentType'] } },
    { name: 'report_export_pdf', description: '보고서를 PDF로 내보냅니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },

    // ─── 공유/계약 (6개) ───
    { name: 'share_create', description: '프로젝트 공유 링크를 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, expiresDays: { type: S.NUMBER } }, required: ['projectId'] } },
    { name: 'share_update', description: '공유 설정을 수정합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'share_send', description: '공유 링크를 전송합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'share_permission', description: '공유 권한을 관리합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'contract_create', description: '계약서를 생성합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'contract_sign_request', description: '전자서명을 요청합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'contract_sign', description: '계약서에 전자서명합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'contract_status', description: '계약 상태를 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'agreement_create', description: '3자 합의서를 생성합니다.', parameters: { type: S.OBJECT, properties: {} } },

    // ─── 대시보드 (3개) ───
    { name: 'dashboard_summary', description: '대시보드 요약을 조회합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'dashboard_stats', description: '대시보드 통계를 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } } } },
    { name: 'dashboard_feed', description: '최근 활동 피드를 조회합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'get_project_summary', description: '프로젝트 현황을 요약합니다.', parameters: { type: S.OBJECT, properties: {} } },

    // ─── 프로필 (2개) ───
    { name: 'profile_update', description: '프로필을 수정합니다.', parameters: { type: S.OBJECT, properties: { companyName: { type: S.STRING }, description: { type: S.STRING }, phone: { type: S.STRING }, address: { type: S.STRING } } } },
    { name: 'portfolio_list', description: '포트폴리오를 조회합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'portfolio_add', description: '포트폴리오에 새 프로젝트를 추가합니다.', parameters: { type: S.OBJECT, properties: {} } },

    // ─── 관리/법규 (5개) ───
    { name: 'admin_doc_generate', description: '행정 서류를 자동 생성합니다 (공사허가서, 보양계획서 등).', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, docType: { type: S.STRING, description: 'construction_permit/protection_plan/waste_plan/fire_report/noise_report' } }, required: ['projectId'] } },
    { name: 'admin_permit_check', description: '인허가 필요 여부를 확인합니다.', parameters: { type: S.OBJECT, properties: { industry: { type: S.STRING }, area: { type: S.NUMBER } } } },
    { name: 'law_search', description: '인테리어 관련 법률을 검색합니다.', parameters: { type: S.OBJECT, properties: { query: { type: S.STRING, description: '검색 키워드' } }, required: ['query'] } },
    { name: 'law_check_compliance', description: '프로젝트 법규 준수 여부를 확인합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'auto_law_check', description: '업종, 면적 기반으로 적용되는 모든 건축법규를 자동 체크합니다. 소방, 위생, 안전, 인허가 전부.', parameters: { type: S.OBJECT, properties: { industryType: { type: S.STRING }, area: { type: S.NUMBER }, buildingType: { type: S.STRING, description: '건물 유형' }, floor: { type: S.STRING, description: '층수' }, isNewConstruction: { type: S.BOOLEAN } }, required: ['industryType', 'area'] } },

    // ─── 리스크 (6개) ───
    { name: 'risk_calculate', description: '프로젝트 리스크 점수를 계산합니다. 특허 공식 사용.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'risk_safety', description: '안전 리스크를 분석합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'risk_cost', description: '비용 리스크를 분석합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'risk_schedule', description: '일정 리스크를 분석합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'risk_recommendation', description: '리스크 개선 권고사항을 제공합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'risk_full_diagnosis', description: '전체 리스크를 종합 진단합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },

    // ─── 워크플로우 (3개) ───
    { name: 'workflow_check_prerequisites', description: '특정 공정의 선행 조건을 확인합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, processName: { type: S.STRING, description: '공정명' } }, required: ['projectId', 'processName'] } },
    { name: 'workflow_next_step', description: '다음 진행할 공정을 안내합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'workflow_auto_sequence', description: '자동 공정 순서를 설정합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },

    // ─── 결제 (4개) ───
    { name: 'payment_record', description: '결제를 기록합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING }, amount: { type: S.NUMBER }, description: { type: S.STRING } }, required: ['projectId', 'amount'] } },
    { name: 'payment_request', description: '결제를 요청합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'payment_history', description: '결제 이력을 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },
    { name: 'payment_outstanding', description: '미결제 내역을 조회합니다.', parameters: { type: S.OBJECT, properties: { projectId: { type: S.STRING } }, required: ['projectId'] } },

    // ─── 변경관리 (1개) ───
    { name: 'change_record', description: '변경요청을 등록합니다.', parameters: { type: S.OBJECT, properties: { title: { type: S.STRING }, reason: { type: S.STRING }, costChange: { type: S.NUMBER } } } },

    // ─── 디자인 (4개) ───
    { name: 'design_generate', description: 'AI가 업종과 스타일에 맞는 인테리어 디자인 컨셉을 생성한다. 무드보드, 컬러팔레트, 자재 추천, 레이아웃 제안 포함.', parameters: { type: S.OBJECT, properties: { industryType: { type: S.STRING }, area: { type: S.NUMBER }, style: { type: S.STRING, description: '모던/미니멀/북유럽/인더스트리얼/클래식/빈티지/내추럴/한옥/레트로' }, colorPreference: { type: S.STRING }, budget: { type: S.STRING, description: 'economy/standard/premium/luxury' }, requirements: { type: S.STRING } }, required: ['industryType', 'style'] } },
    { name: 'design_moodboard', description: '무드보드를 생성합니다. 참고 이미지 키워드, 컬러팔레트, 추천 자재/가구 목록 포함.', parameters: { type: S.OBJECT, properties: { designId: { type: S.STRING }, section: { type: S.STRING, description: '공간 (전체/주방/욕실/거실/침실/홀)' } } } },
    { name: 'design_material_recommend', description: '디자인 컨셉에 맞는 자재를 추천합니다.', parameters: { type: S.OBJECT, properties: { designId: { type: S.STRING }, category: { type: S.STRING, description: '타일/바닥재/도배/페인트/조명/가구' }, budget: { type: S.STRING, description: 'economy/standard/premium/luxury' } } } },
    { name: 'design_layout_suggest', description: '공간 레이아웃을 텍스트/ASCII로 제안합니다. 동선, 가구배치 포함.', parameters: { type: S.OBJECT, properties: { industryType: { type: S.STRING }, area: { type: S.NUMBER }, shape: { type: S.STRING, description: '직사각형/ㄱ자/ㄷ자/정사각형' }, width: { type: S.NUMBER, description: '가로 (m)' }, depth: { type: S.NUMBER, description: '세로 (m)' }, entrance: { type: S.STRING }, windows: { type: S.STRING } }, required: ['industryType'] } },

    // ─── 도면 (4개) ───
    { name: 'floorplan_generate', description: 'AI가 텍스트 설명 기반으로 평면도를 SVG로 자동 생성합니다.', parameters: { type: S.OBJECT, properties: { width: { type: S.NUMBER, description: '가로 (mm)' }, depth: { type: S.NUMBER, description: '세로 (mm)' } }, required: ['width', 'depth'] } },
    { name: 'floorplan_from_description', description: '자연어 설명만으로 평면도를 자동 생성합니다.', parameters: { type: S.OBJECT, properties: { description: { type: S.STRING, description: '공간 설명 (자연어)' }, industryType: { type: S.STRING }, area: { type: S.NUMBER }, areaUnit: { type: S.STRING, description: 'pyeong/sqm' } }, required: ['description'] } },
    { name: 'floorplan_edit', description: '기존 도면을 자연어 명령으로 수정합니다.', parameters: { type: S.OBJECT, properties: { floorplanId: { type: S.STRING }, editCommand: { type: S.STRING, description: '수정 명령' } } } },
    { name: 'floorplan_export', description: '도면을 SVG/PNG/PDF로 내보냅니다.', parameters: { type: S.OBJECT, properties: { floorplanId: { type: S.STRING }, format: { type: S.STRING, description: 'svg/png/pdf' }, scale: { type: S.STRING, description: '축척 1:50, 1:100 등' } } } },

    // ─── 알림 (2개) ───
    { name: 'notification_send', description: '알림을 전송합니다.', parameters: { type: S.OBJECT, properties: { message: { type: S.STRING }, target: { type: S.STRING } }, required: ['message'] } },
    { name: 'notification_list', description: '알림 목록을 조회합니다.', parameters: { type: S.OBJECT, properties: {} } },
    { name: 'notification_settings', description: '알림 설정을 관리합니다.', parameters: { type: S.OBJECT, properties: {} } },
  ],
}

// ═══════════════════════════════════════════════════════════
// 도구 실행 라우팅 (100+개)
// ═══════════════════════════════════════════════════════════

/** 기존 12개 도구 - 프로젝트 컨텍스트 필요 */
const LEGACY_CONTEXT_TOOLS = [
  'checklist_analyze', 'quote_generate', 'cost_analyze',
  'risk_calculate', 'change_record', 'evidence_package',
  'agreement_create', 'report_generate', 'schedule_check',
  'verify_score',
]

async function executeTool(
  toolName: string,
  args: Record<string, any>,
  ctx: ProjectContext | null,
): Promise<ToolResult> {
  // 기존 도구 중 프로젝트 컨텍스트가 필요한 것
  if (LEGACY_CONTEXT_TOOLS.includes(toolName) && (!ctx || !ctx.project)) {
    return {
      tool: toolName,
      success: false,
      message: '📌 프로젝트 페이지에서 프로젝트를 선택한 후 다시 시도해주세요.\n\n또는 "프로젝트 만들어줘"로 새 프로젝트를 생성할 수 있습니다.',
    }
  }

  // projectId 자동 주입 (ctx에서)
  const projectId = args.projectId || ctx?.project?.id || ''

  try {
    switch (toolName) {
      // ─── 기존 12개 도구 ───
      case 'project_setup': return projectSetup(args as any)
      case 'checklist_analyze': return checklistAnalyze(ctx!)
      case 'quote_generate': return quoteGenerate(ctx!, args as any)
      case 'cost_analyze': return costAnalyze(ctx!)
      case 'risk_calculate': return riskCalculate(ctx!)
      case 'change_record': return changeRecord(ctx!, args as any)
      case 'evidence_package': return evidencePackage(ctx!)
      case 'agreement_create': return agreementCreate(ctx!)
      case 'report_generate': return reportGenerate(ctx!)
      case 'schedule_check': return scheduleCheck(ctx!)
      case 'verify_score': return verifyScore(ctx!)
      case 'get_project_summary': {
        const emptyCtx: ProjectContext = {
          project: null, diagnosticCount: 0, quoteItems: [],
          costAnalysis: null, changeOrders: [], evidenceFiles: [],
          agreements: [], reports: [], processes: [], workforce: [], materials: [],
        }
        return getProjectSummary(ctx || emptyCtx)
      }

      // ─── 프로젝트 확장 ───
      case 'project_list': return ext.projectList()
      case 'project_detail': return ext.projectDetail({ projectId })
      case 'project_update': return ext.projectUpdate({ projectId, ...args } as any)
      case 'project_delete': return ext.projectDelete({ projectId })
      case 'project_status_update': return ext.projectStatusUpdate({ projectId, status: args.status })

      // ─── 체크리스트 확장 ───
      case 'checklist_create': return ext.checklistCreate({ projectId, item: args.item, category: args.category, priority: args.priority })
      case 'checklist_check': return ext.checklistCheck({ projectId, itemId: args.itemId, checked: args.checked })
      case 'checklist_bulk_check': return ext.checklistBulkCheck({ projectId, itemIds: args.itemIds, checked: args.checked })
      case 'checklist_progress': return ext.checklistProgress({ projectId })
      case 'checklist_export': return ext.checklistExport({ projectId })

      // ─── 견적/비용 확장 ───
      case 'quote_add_item': return ext.quoteAddItem({ projectId, itemName: args.name || args.itemName, category: args.category, unit: args.unit, quantity: args.quantity, unitPrice: args.unitPrice, specification: args.specification } as any)
      case 'quote_update_item': return ext.quoteUpdateItem(args as any)
      case 'quote_delete_item': return ext.quoteDeleteItem({ itemId: args.itemId })
      case 'quote_compare': return ext.quoteCompare({ projectId })
      case 'quote_export_pdf': return ext.quoteExportPdf({ projectId })
      case 'cost_track': return ext.costTrack({ projectId, category: args.category, amount: args.amount, description: args.description })
      case 'cost_budget_compare': return ext.costBudgetCompare({ projectId })
      case 'cost_forecast': return ext.costForecast({ projectId })

      // ─── 자동 견적 ───
      case 'auto_quote_generate': return auto.autoQuoteGenerate(args as any)
      case 'auto_quote_detail': return auto.autoQuoteDetail(args as any)
      case 'auto_quote_compare': return auto.autoQuoteCompare(args as any)

      // ─── 일정/공정 확장 ───
      case 'schedule_create': return ext.scheduleCreate({ projectId, template: args.template })
      case 'schedule_add_task': return ext.scheduleAddTask({ projectId, name: args.name, startDate: args.startDate, endDate: args.endDate, orderIndex: args.orderIndex } as any)
      case 'schedule_update_task': return ext.scheduleUpdateTask(args as any)
      case 'schedule_check_order': return ext.scheduleCheckOrder({ projectId })
      case 'schedule_delay_alert': return ext.scheduleDelayAlert({ projectId })
      case 'schedule_gantt': return ext.scheduleGantt({ projectId })
      case 'schedule_today': return ext.scheduleToday({ projectId })
      case 'auto_schedule_generate': return auto.autoScheduleGenerate(args as any)

      // ─── 사진 ───
      case 'photo_list': return ext.photoList({ projectId })
      case 'photo_upload': return ext.photoUpload()
      case 'photo_analyze': return ext.photoAnalyze()
      case 'photo_before_after': return ext.photoBeforeAfter({ projectId })
      case 'photo_gallery': return ext.photoGallery({ projectId })

      // ─── 하자 ───
      case 'defect_create': return ext.defectCreate({ projectId, ...args } as any)
      case 'defect_update': return ext.defectUpdate(args as any)
      case 'defect_list': return ext.defectList({ projectId })
      case 'defect_assign': return ext.defectAssign(args as any)
      case 'defect_history': return ext.defectHistory({ projectId })

      // ─── 인력 ───
      case 'worker_add': return ext.workerAdd({ projectId, ...args } as any)
      case 'worker_attendance': return ext.workerAttendance({ projectId, ...args } as any)
      case 'worker_certification_check': return ext.workerCertificationCheck({ projectId })
      case 'worker_assign': return ext.workerAssign(args as any)
      case 'worker_payment': return ext.workerPayment({ projectId })

      // ─── 자재 ───
      case 'material_add': return ext.materialAdd({ projectId, ...args } as any)
      case 'material_in': return ext.materialIn(args as any)
      case 'material_out': return ext.materialOut(args as any)
      case 'material_stock': return ext.materialStock({ projectId })
      case 'material_order': return ext.materialOrder({ projectId, ...args } as any)
      case 'material_cost': return ext.materialCost({ projectId })

      // ─── 증빙/인증 ───
      case 'evidence_create': return ext.evidenceCreate({ projectId, description: args.description })
      case 'evidence_verify': return ext.evidenceVerify({ projectId })
      case 'evidence_export': return ext.evidenceExport({ projectId })
      case 'certificate_generate': return ext.certificateGenerate({ projectId })
      case 'certificate_verify': return ext.certificateVerify({ code: args.code })

      // ─── 보고서 확장 ───
      case 'report_daily': return ext.reportDaily({ projectId })
      case 'report_weekly': return ext.reportWeekly({ projectId })
      case 'report_monthly': return ext.reportMonthly({ projectId })
      case 'report_final': return ext.reportFinal({ projectId })
      case 'report_custom': return ext.reportCustom({ projectId, sections: args.sections })
      case 'report_export_pdf': return ext.reportExportPdf({ projectId })
      case 'auto_report_daily': return auto.autoReportDaily({ projectId: args.projectId || projectId, date: args.date })
      case 'auto_report_weekly': return auto.autoReportWeekly({ projectId: args.projectId || projectId, weekStart: args.weekStart })
      case 'auto_report_completion': return auto.autoReportCompletion({ projectId: args.projectId || projectId })
      case 'export_pdf': return auto.exportPdf(args as any)

      // ─── 공유/계약 ───
      case 'share_create': return ext.shareCreate({ projectId, expiresDays: args.expiresDays })
      case 'share_update': return ext.shareUpdate()
      case 'share_send': return ext.shareSend({ projectId })
      case 'share_permission': return ext.sharePermission()
      case 'contract_create': return ext.contractCreate({ projectId })
      case 'contract_sign_request': return ext.contractSignRequest({ projectId })
      case 'contract_sign': return ext.contractSign()
      case 'contract_status': return ext.contractStatus({ projectId })

      // ─── 알림 ───
      case 'notification_send': return ext.notificationSend(args as any)
      case 'notification_list': return ext.notificationList()
      case 'notification_settings': return ext.notificationSettings()

      // ─── 대시보드 ───
      case 'dashboard_summary': return ext.dashboardSummary()
      case 'dashboard_stats': return ext.dashboardStats(args as any)
      case 'dashboard_feed': return ext.dashboardFeed()

      // ─── 프로필 ───
      case 'profile_update': return ext.profileUpdate(args as any)
      case 'portfolio_add': return ext.portfolioAdd()
      case 'portfolio_list': return ext.portfolioList()

      // ─── 관리/법규 ───
      case 'admin_doc_generate': return ext.adminDocGenerate({ projectId, docType: args.docType })
      case 'admin_permit_check': return ext.adminPermitCheck(args as any)
      case 'law_search': return ext.lawSearch({ query: args.query })
      case 'law_check_compliance': return ext.lawCheckCompliance({ projectId })
      case 'auto_law_check': return auto.autoLawCheck(args as any)

      // ─── 리스크 ───
      case 'risk_safety': return ext.riskSafety({ projectId })
      case 'risk_cost': return ext.riskCost({ projectId })
      case 'risk_schedule': return ext.riskSchedule({ projectId })
      case 'risk_recommendation': return ext.riskRecommendation({ projectId })
      case 'risk_full_diagnosis': return ext.riskFullDiagnosis({ projectId })

      // ─── 워크플로우 ───
      case 'workflow_check_prerequisites': return ext.workflowCheckPrerequisites({ projectId, processName: args.processName })
      case 'workflow_next_step': return ext.workflowNextStep({ projectId })
      case 'workflow_auto_sequence': return ext.workflowAutoSequence({ projectId })

      // ─── 결제 ───
      case 'payment_record': return ext.paymentRecord({ projectId, amount: args.amount, description: args.description })
      case 'payment_request': return ext.paymentRequest({ projectId })
      case 'payment_history': return ext.paymentHistory({ projectId })
      case 'payment_outstanding': return ext.paymentOutstanding({ projectId })

      // ─── 디자인 ───
      case 'design_generate': return auto.designGenerate(args as any)
      case 'design_moodboard': return auto.designMoodboard(args as any)
      case 'design_material_recommend': return auto.designMaterialRecommend(args as any)
      case 'design_layout_suggest': return auto.designLayoutSuggest(args as any)

      // ─── 도면 ───
      case 'floorplan_generate': return auto.floorplanGenerate(args as any)
      case 'floorplan_from_description': return auto.floorplanFromDescription(args as any)
      case 'floorplan_edit': return auto.floorplanEdit(args as any)
      case 'floorplan_export': return auto.floorplanExport(args as any)

      default:
        return { tool: toolName, success: false, message: `알 수 없는 도구: ${toolName}` }
    }
  } catch (error: any) {
    return { tool: toolName, success: false, message: `도구 실행 오류: ${error?.message || '알 수 없는 오류'}` }
  }
}

// ═══════════════════════════════════════════════════════════
// Gemini 대화 응답 생성
// ═══════════════════════════════════════════════════════════

export interface GeminiResponse {
  message: string
  tool?: string
  toolSuccess?: boolean
  data?: any
}

// 모델 폴백 체인: 할당량 초과 시 자동 전환
// gemini-2.5-flash: 20 RPD (무료) - 더 똑똑함
// gemini-2.0-flash: 1,500 RPD (무료) - 안정적
// 모델 폴백 체인 (할당량 초과 시 다음 모델로 자동 전환)
// 2.0-flash(1500RPD) → 2.5-flash-lite(별도할당) → 2.5-flash(20RPD)
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'] as const

function isRateLimitError(error: any): boolean {
  const msg = error?.message || ''
  return error?.status === 429
    || msg.includes('429')
    || msg.includes('RESOURCE_EXHAUSTED')
    || msg.includes('quota')
    || msg.includes('rate limit')
    || msg.includes('Too Many Requests')
}

export interface ImageData {
  base64: string
  mimeType: string
}

async function callGeminiWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  userMessage: string,
  ctx: ProjectContext | null,
  conversationHistory?: Array<{ role: string; content: string }>,
  image?: ImageData,
): Promise<GeminiResponse> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: CHEKI_SYSTEM_PROMPT,
    tools: [TOOL_DECLARATIONS],
  })

  // 프로젝트 컨텍스트 정보를 사용자 메시지에 추가
  let contextPrefix = ''
  if (ctx?.project) {
    contextPrefix = `[현재 선택된 프로젝트: "${ctx.project.name}" (ID: ${ctx.project.id}, 업종: ${ctx.project.industry}, 진행률: ${ctx.project.progress || 0}%)]\n\n`
  }

  // 대화 히스토리 구성
  const contents: Content[] = []

  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })
    }
  }

  // 사용자 메시지 parts 구성 (텍스트 + 이미지)
  const userParts: any[] = [{ text: contextPrefix + userMessage }]
  if (image?.base64) {
    userParts.push({
      inlineData: {
        mimeType: image.mimeType || 'image/jpeg',
        data: image.base64,
      },
    })
  }

  contents.push({
    role: 'user',
    parts: userParts,
  })

  // Gemini API 호출
  const chat = model.startChat({ history: contents.slice(0, -1) })
  let result = await chat.sendMessage(contents[contents.length - 1].parts)
  let response = result.response

  // Function Calling 처리 (최대 5회 반복 - 연쇄/병렬 호출 대비)
  let toolResult: ToolResult | null = null
  const allToolResults: ToolResult[] = []

  for (let i = 0; i < 5; i++) {
    const functionCalls = response.functionCalls()
    if (!functionCalls || functionCalls.length === 0) break

    // 병렬 함수 호출: 모든 함수를 동시에 실행
    const results = await Promise.all(
      functionCalls.map(fc => executeTool(fc.name, fc.args || {}, ctx))
    )

    // 모든 결과를 Gemini에게 전달
    const functionResponses = functionCalls.map((fc, idx) => ({
      functionResponse: {
        name: fc.name,
        response: {
          success: results[idx].success,
          message: results[idx].message,
          data: results[idx].data || null,
        },
      },
    }))

    allToolResults.push(...results)
    toolResult = results[results.length - 1]

    result = await chat.sendMessage(functionResponses)
    response = result.response
  }

  // 최종 텍스트 응답 추출
  const textResponse = response.text()

  if (toolResult) {
    return {
      message: textResponse || toolResult.message,
      tool: toolResult.tool,
      toolSuccess: toolResult.success,
      data: allToolResults.length > 1
        ? { multipleResults: allToolResults.map(r => ({ tool: r.tool, success: r.success, data: r.data })) }
        : toolResult.data,
    }
  }

  return { message: textResponse }
}

export async function callGemini(
  userMessage: string,
  ctx: ProjectContext | null,
  conversationHistory?: Array<{ role: string; content: string }>,
  image?: ImageData,
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  // 모델 폴백 체인: 2.0-flash → 1.5-flash → 2.5-flash
  let lastError: any = null
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const modelName = GEMINI_MODELS[i]
    try {
      console.log(`[체키] ${modelName} 시도 중...`)
      const result = await callGeminiWithModel(genAI, modelName, userMessage, ctx, conversationHistory, image)
      console.log(`[체키] ${modelName} 응답 성공 ✓`)
      return result
    } catch (error: any) {
      lastError = error
      console.error(`[체키] ${modelName} 실패:`, error?.message?.substring(0, 200))
      if (isRateLimitError(error) && i < GEMINI_MODELS.length - 1) {
        console.warn(`[체키] → ${GEMINI_MODELS[i + 1]}로 자동 전환`)
        continue
      }
      throw error
    }
  }

  throw lastError || new Error('모든 Gemini 모델의 할당량이 초과되었습니다.')
}
