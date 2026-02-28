/**
 * 안전 확인 체커 (12개 법규 기반)
 * 4단계 안전 등급 시스템:
 * 정상 / 주의 / 경고 / 위험
 */

import type { SafetyLevel } from '@/types/safety-levels'

export interface RegulationCheck {
  id: string
  law: string           // 법규명
  category: string      // 분류
  description: string   // 점검 항목
  isMet: boolean        // 충족 여부
  note?: string         // 비고
}

export interface SafetyJudgment {
  level: SafetyLevel
  score: number          // 0~100 (충족률)
  totalChecks: number
  passedChecks: number
  regulations: RegulationCheck[]
}

// 12개 법규 기반 점검 항목 정의
export const REGULATION_DEFINITIONS: Omit<RegulationCheck, 'isMet' | 'note'>[] = [
  { id: 'OSH-001', law: '산업안전보건법', category: '안전관리', description: '안전보건관리체계 수립 및 이행' },
  { id: 'SDA-001', law: '중대재해처벌법', category: '안전관리', description: '안전보건 확보 의무 이행 현황' },
  { id: 'CTP-001', law: '건설기술진흥법', category: '시공관리', description: '건설기술 기준 충족 현황' },
  { id: 'BA-001', law: '건축법', category: '시공관리', description: '건축물 구조 안전 기준 충족' },
  { id: 'FFA-001', law: '소방시설법', category: '소방', description: '소방시설 설치 기준 충족' },
  { id: 'EUA-001', law: '전기사업법', category: '설비', description: '전기설비 안전 기준 충족' },
  { id: 'GSA-001', law: '가스안전관리법', category: '설비', description: '가스설비 안전관리 기준 충족' },
  { id: 'HMS-001', law: '위험물안전관리법', category: '자재', description: '위험물 보관·취급 기준 충족' },
  { id: 'EIA-001', law: '환경영향평가법', category: '환경', description: '환경영향 최소화 조치 현황' },
  { id: 'FCI-001', law: '건설산업기본법', category: '행정', description: '건설업 등록 및 도급 기준 충족' },
  { id: 'NLP-001', law: '국토계획법', category: '행정', description: '용도지역 및 행위제한 충족' },
  { id: 'ACD-001', law: '장애인편의법', category: '편의시설', description: '장애인 편의시설 기준 충족' },
]

/**
 * 안전 확인 수행
 * 점검 결과(충족 여부)를 받아 4단계 안전 등급 반환
 */
export function performSafetyJudgment(checks: RegulationCheck[]): SafetyJudgment {
  const totalChecks = checks.length
  const passedChecks = checks.filter(c => c.isMet).length
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0

  let level: SafetyLevel
  if (score >= 100) level = 'safe'       // 전부 충족 → 정상
  else if (score >= 80) level = 'caution' // 80% 이상 → 주의
  else if (score >= 50) level = 'warning' // 50% 이상 → 경고
  else level = 'danger'                    // 50% 미만 → 위험

  return { level, score, totalChecks, passedChecks, regulations: checks }
}

/**
 * 프로젝트별 데모 점검 결과 생성
 * (실제 운영에서는 compliance_checks 테이블에서 조회)
 */
export function getDemoChecks(projectId: string): RegulationCheck[] {
  // 프로젝트별로 다른 결과 제공
  const demoResults: Record<string, boolean[]> = {
    '1': [true, true, true, false, true, true, true, true, true, true, true, false],   // 10/12 충족
    '2': [true, true, true, true, true, true, true, true, true, true, true, true],      // 12/12 전부 충족
    '3': [true, false, true, false, false, true, true, false, true, true, false, true], // 7/12 충족
  }

  const results = demoResults[projectId] || demoResults['1']

  return REGULATION_DEFINITIONS.map((def, i) => ({
    ...def,
    isMet: results[i] ?? true,
    note: results[i] ? undefined : '보완 필요',
  }))
}
