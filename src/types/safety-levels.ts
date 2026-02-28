export type SafetyLevel = 'safe' | 'caution' | 'warning' | 'danger'

export const SAFETY_LEVELS: Record<SafetyLevel, {
  label: string
  color: string
  bg: string
  icon: string
}> = {
  safe: { label: '정상', color: '#10B981', bg: '#ECFDF5', icon: '🟢' },
  caution: { label: '주의', color: '#F59E0B', bg: '#FFFBEB', icon: '🟡' },
  warning: { label: '경고', color: '#F97316', bg: '#FFF7ED', icon: '🟠' },
  danger: { label: '위험', color: '#EF4444', bg: '#FEF2F2', icon: '🔴' },
}

/**
 * 완료율(%)에 따른 안전 등급 현황
 * - 100%     → 정상
 * - 80~99%   → 주의
 * - 50~79%   → 경고
 * - 50% 미만 → 위험
 */
export function getSafetyLevelFromRate(rate: number): SafetyLevel {
  if (rate >= 100) return 'safe'
  if (rate >= 80) return 'caution'
  if (rate >= 50) return 'warning'
  return 'danger'
}

/**
 * 리스크 점수에 따른 안전 등급 현황 (0-10 스케일)
 * - score < 2  → 정상
 * - score < 4  → 주의
 * - score < 6  → 경고
 * - score >= 6 → 위험
 */
export function getSafetyLevelFromScore(score: number): SafetyLevel {
  if (score < 2) return 'safe'
  if (score < 4) return 'caution'
  if (score < 6) return 'warning'
  return 'danger'
}

/**
 * 특허 공식 리스크 점수에 따른 4단계 판정 (0-100 스케일)
 * RISK_FORMULA_SPEC.md 기준:
 * - 0~25   → 안전 (정상 관리)
 * - 26~50  → 주의 (모니터링 강화)
 * - 51~75  → 경고 (즉시 조치 필요)
 * - 76~100 → 위험 (긴급 대응)
 */
export function getSafetyLevelFromRiskScore(riskScore: number): SafetyLevel {
  if (riskScore <= 25) return 'safe'
  if (riskScore <= 50) return 'caution'
  if (riskScore <= 75) return 'warning'
  return 'danger'
}
