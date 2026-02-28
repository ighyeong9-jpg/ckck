import type { FeatureSetId } from '@/types/roles'

export interface FeatureItem {
  name: string
  desc: string
  priority: '핵심' | '중요' | '일반'
  icon: string
  href: string
  slug: string
}

export interface FeatureSet {
  id: FeatureSetId
  icon: string
  title: string
  subtitle: string
  color: string
  bgGrad: string
  desc: string
  items: FeatureItem[]
}

export const FEATURE_SETS: FeatureSet[] = [
  {
    id: 'safety',
    icon: '🛡️',
    title: '안전관리',
    subtitle: 'Safety Management',
    color: '#DC2626',
    bgGrad: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
    desc: '현장 안전의 핵심. 매일 쓰는 기능',
    items: [
      { name: '안전 확인', desc: '12개 법규 기반 현장 안전 상태 자동 확인', priority: '핵심', icon: '⚡', href: '/features/safety-status', slug: 'safety-status' },
      { name: '안전 체크리스트', desc: '13업종 419개 항목 점검 실행', priority: '핵심', icon: '✅', href: '/features/safety-checklist', slug: 'safety-checklist' },
      { name: '사고/위험 보고', desc: '사진+위치+영상 포함 즉시 보고', priority: '핵심', icon: '🚨', href: '/features/incident-report', slug: 'incident-report' },
      { name: '안전교육 이력', desc: '작업자별 교육 이수 현황 확인', priority: '중요', icon: '📚', href: '/features/safety-training', slug: 'safety-training' },
      { name: '사전 안전 평가', desc: '공종별 위험요인 사전 평가', priority: '중요', icon: '⚠️', href: '/features/risk-assessment', slug: 'risk-assessment' },
      { name: '안전회의(TBM)', desc: 'Toolbox Meeting 기록 및 서명', priority: '일반', icon: '🤝', href: '/features/tbm', slug: 'tbm' },
    ],
  },
  {
    id: 'process',
    icon: '📋',
    title: '공정관리',
    subtitle: 'Process Control',
    color: '#2563EB',
    bgGrad: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
    desc: '공사 진행을 한눈에. 일정·진척 관리',
    items: [
      { name: '공정 현황 대시보드', desc: '전체 진척률, 공정별 상태 한눈에', priority: '핵심', icon: '📊', href: '/features/process-dashboard', slug: 'process-dashboard' },
      { name: '공정 일정표', desc: '공정별 시작/종료/선후행 관계 표시', priority: '핵심', icon: '📅', href: '/features/schedule', slug: 'schedule' },
      { name: '일일 작업 지시서', desc: '당일 작업 내용 자동 생성 및 배포', priority: '중요', icon: '📝', href: '/features/work-order', slug: 'work-order' },
      { name: '공정 사진 기록', desc: '날짜·공종별 시공 전/중/후 사진 보관', priority: '핵심', icon: '📷', href: '/features/photo-record', slug: 'photo-record' },
      { name: '지연 알림', desc: '일정 지연 시 자동 알림 및 원인 기록', priority: '중요', icon: '🔔', href: '/features/delay-alert', slug: 'delay-alert' },
      { name: '준공 검수 체크', desc: '공종별 완료 기준 확인 및 승인', priority: '일반', icon: '🏁', href: '/features/completion-check', slug: 'completion-check' },
    ],
  },
  {
    id: 'workforce',
    icon: '👷',
    title: '인력·현장',
    subtitle: 'Workforce & Site',
    color: '#059669',
    bgGrad: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    desc: '누가 어디서 일하는지. 인력 출역 관리',
    items: [
      { name: 'QR 체크인/아웃', desc: '작업자 출퇴근 QR코드 기록', priority: '핵심', icon: '📱', href: '/features/qr-checkin', slug: 'qr-checkin' },
      { name: '출역 현황판', desc: '현장별 금일 투입 인원 실시간 표시', priority: '핵심', icon: '👥', href: '/features/workforce-board', slug: 'workforce-board' },
      { name: '하도급 업체 관리', desc: '협력사 정보, 계약, 보험 현황', priority: '중요', icon: '🏢', href: '/features/subcontractor-mgmt', slug: 'subcontractor-mgmt' },
      { name: '자격증·면허 관리', desc: '작업자 보유 자격 및 만료일 관리', priority: '중요', icon: '🪪', href: '/features/certification', slug: 'certification' },
      { name: '비상 연락망', desc: '현장별 비상 연락처 즉시 조회', priority: '일반', icon: '📞', href: '/features/emergency-contacts', slug: 'emergency-contacts' },
      { name: '현장 지도/배치도', desc: '구역별 작업 위치 및 주의 구역 표시', priority: '일반', icon: '🗺️', href: '/features/site-map', slug: 'site-map' },
    ],
  },
  {
    id: 'materials',
    icon: '📦',
    title: '자재·비용',
    subtitle: 'Materials & Cost',
    color: '#D97706',
    bgGrad: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    desc: '자재 입출고, 비용 산출. 돈 관리',
    items: [
      { name: '자재 입고/재고', desc: '자재별 입고 수량, 현재 재고 현황', priority: '핵심', icon: '📥', href: '/features/material-inventory', slug: 'material-inventory' },
      { name: '자재 QR 스캔', desc: 'QR코드로 자재 입고 확인', priority: '중요', icon: '🔍', href: '/features/material-qr', slug: 'material-qr' },
      { name: '비용 자동 산출(ΔC)', desc: '공종별 실행 예산 vs 실비 비교', priority: '핵심', icon: '💰', href: '/features/cost-calculation', slug: 'cost-calculation' },
      { name: '견적 비교', desc: '업체별 견적 비교표 자동 생성', priority: '중요', icon: '📑', href: '/features/quote-comparison', slug: 'quote-comparison' },
      { name: '발주 요청', desc: '부족 자재 발주 요청서 생성', priority: '일반', icon: '🛒', href: '/features/purchase-order', slug: 'purchase-order' },
      { name: '정산 리포트', desc: '월별/공종별 비용 정산 PDF 출력', priority: '일반', icon: '🧾', href: '/features/settlement-report', slug: 'settlement-report' },
    ],
  },
  {
    id: 'compliance',
    icon: '⚖️',
    title: '법규·서류',
    subtitle: 'Compliance & Documents',
    color: '#7C3AED',
    bgGrad: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    desc: '중대재해처벌법 대응. 법적 보호막',
    items: [
      { name: '법규 준수 현황판', desc: '12개 법규 191개 규칙 자동 체크 현황', priority: '핵심', icon: '📋', href: '/features/compliance-dashboard', slug: 'compliance-dashboard' },
      { name: '시공 기록 패키징', desc: '머클트리 기반 시공 기록 무결성 보장', priority: '핵심', icon: '🔐', href: '/features/evidence-package', slug: 'evidence-package' },
      { name: '안전보건계획서', desc: '법정 서류 자동 생성 및 이력 관리', priority: '중요', icon: '📄', href: '/features/safety-plan', slug: 'safety-plan' },
      { name: '감리 점검 연동', desc: '감리자 점검 결과 연동 및 조치 확인', priority: '중요', icon: '🔗', href: '/features/inspection-link', slug: 'inspection-link' },
      { name: '기록 보관 패키지', desc: '사진+서명+로그 PDF 일괄 출력', priority: '일반', icon: '📁', href: '/features/dispute-package', slug: 'dispute-package' },
      { name: 'AI 법규 비서(체크인)', desc: '법규 질문 시 원문 인용 답변', priority: '일반', icon: '🤖', href: '/features/ai-legal-assistant', slug: 'ai-legal-assistant' },
    ],
  },
]

export function getFeatureBySlug(slug: string): { set: FeatureSet; item: FeatureItem } | null {
  for (const set of FEATURE_SETS) {
    const item = set.items.find(i => i.slug === slug)
    if (item) return { set, item }
  }
  return null
}

export function getFeatureSetById(id: FeatureSetId): FeatureSet | undefined {
  return FEATURE_SETS.find(s => s.id === id)
}
