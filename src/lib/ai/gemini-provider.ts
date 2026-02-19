/**
 * Gemini AI Provider
 * 체키 AI 비서의 두뇌 역할 - Gemini Flash 모델 사용
 * Function Calling으로 100+개 도구를 자연어로 연결
 *
 * 모델 폴백 체인:
 *   gemini-2.5-flash → gemini-2.5-flash-lite
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

/** 체키 시스템 프롬프트 (압축 버전) */
export const CHEKI_SYSTEM_PROMPT = `당신은 '체키(Cheki)'입니다. 인테리어/건설 현장 AI 관리 시스템입니다.

핵심 규칙:
1. 반드시 한국어로 답변
2. 인테리어/건설 전문가로서 구체적이고 실용적으로 답변
3. 도구를 적극 활용하되, 도구 결과가 없으면 당신의 지식으로 최선의 답변을 제공
4. 사용자가 요청하면 관련된 모든 도구를 동시에 실행 (병렬 Function Calling)
5. 사진이 첨부되면 공종/작업단계/안전이슈/품질이슈를 자동 분석
6. 금액은 ₩ + 천단위 콤마. 존댓말 사용

자동 실행 원칙:
- "카페 30평 하고 싶어" → auto_quote_generate + auto_schedule_generate + auto_law_check + design_generate (4개 동시)
- "보고서 만들어" → auto_report_daily + checklist_progress (2개 동시)
- "견적 뽑아줘" → auto_quote_generate (업종, 면적, 등급 파악 후 실행)
- "공정표 만들어" → auto_schedule_generate (업종, 면적, 착공일 파악 후 실행)
- "법규 체크해줘" → auto_law_check (업종, 면적 기반 자동)
- "디자인 제안해줘" → design_generate (업종, 스타일 기반)
- "리스크 분석해줘" → risk_full_diagnosis 또는 checklist_analyze

부족한 정보가 있을 때:
정보가 부족하면 최소한만 물어봐:
- 견적인데 면적 없으면: "몇 평이세요?"
- 공정표인데 착공일 없으면: "착공일이 언제인가요?"
- 절대로 한번에 3개 이상 질문하지 마

46개 업종 지원:
카페, 레스토랑, 주점/바, 베이커리, 디저트, 뷔페/푸드코트, 한식당, 일식당, 중식당, 양식당, 분식/패스트푸드, 고기/BBQ, 아파트, 빌라/다세대, 원룸/오피스텔, 주택, 복층/펜트하우스, 전원주택, 일반사무실, 공유오피스, 회의실/세미나, IT/스타트업, 로펌/회계, 금융/은행지점, 병원/의원, 치과, 한의원, 피부과/성형, 동물병원, 약국, 소매/편의점, 의류/패션, 뷰티/헤어살롱, 피트니스/헬스, 학원/교육, 어린이집/유치원, 키즈카페, 실버복지, 호텔/펜션, 게스트하우스, 갤러리/전시, 스튜디오/공방, 자동차정비, 창고/물류, 공장/제조, 종교시설

견적/디자인/도면 원칙:
- 견적은 공종별 상세 내역으로 (뭉텅이 금지)
- 결과물에 면책 단서 간단히 붙이되, 구체적이고 실용적인 내용 우선
- 일반 지식 질문(날씨, 요리, IT 등)에도 친절히 답변`

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

// 모델 폴백 체인 (할당량 초과 시 다음 모델로 자동 전환)
// gemini-2.5-flash: 1순위 (가장 똑똑함)
// gemini-2.5-flash-lite: 2순위 (폴백용)
// ※ gemini-2.0-flash는 2026-03-03 퇴역 예정이므로 제외
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const

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

  // 모델 폴백 체인: 2.5-flash → 2.5-flash-lite
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
