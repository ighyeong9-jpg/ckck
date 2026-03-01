/**
 * 견적단가 검증 상수 정의
 * CLAUDE.md 기반 지역계수·보정계수
 */

/**
 * 지역별 보정계수 (서울 기준 1.0)
 * 버그 2 수정: 강남 구분 추가
 */
export const REGIONAL_MULTIPLIERS = {
  gangnam: { min: 1.2, max: 1.5 },   // 강남/서초/송파/용산
  seoul: { min: 1.0, max: 1.0 },     // 서울 일반
  gyeonggi: { min: 0.85, max: 0.95 }, // 경기도
  metro: { min: 0.75, max: 0.90 },   // 광역시
  local: { min: 0.65, max: 0.80 },   // 지방 소도시
} as const;

export type RegionKey = keyof typeof REGIONAL_MULTIPLIERS;

/**
 * 강남 3구 + 용산 구분 (버그 2 수정)
 */
const GANGNAM_DISTRICTS = ['강남구', '서초구', '송파구', '용산구'];

/**
 * 지역 문자열 → 계수 매핑
 */
export function getRegionalMultiplier(region: string): { min: number; max: number } {
  // 버그 2 수정: 강남 구분 로직
  if (GANGNAM_DISTRICTS.some(d => region.includes(d))) {
    return REGIONAL_MULTIPLIERS.gangnam;
  }

  // 기본 매핑
  const normalized = region.toLowerCase();
  if (normalized.includes('gangnam')) return REGIONAL_MULTIPLIERS.gangnam;
  if (normalized.includes('seoul') || normalized.includes('서울')) return REGIONAL_MULTIPLIERS.seoul;
  if (normalized.includes('gyeonggi') || normalized.includes('경기')) return REGIONAL_MULTIPLIERS.gyeonggi;
  if (normalized.includes('metro') || normalized.includes('광역')) return REGIONAL_MULTIPLIERS.metro;

  // 기본값: 서울
  return REGIONAL_MULTIPLIERS.seoul;
}

/**
 * 공시가 보정계수 (공정위+서울시 합동점검 근거)
 * 공시 단가 × 1.32 = 실거래 단가
 */
export const DISCLOSURE_CORRECTION_FACTOR = 1.32;

/**
 * 구축 가산율 (20년 이상 건물)
 * 버그 3 수정: buildingAge 기반 동적 계산
 */
export function getBuildingAgeSurcharge(buildingYear: number | null): number {
  if (!buildingYear) return 1.0;

  const currentYear = new Date().getFullYear();
  const buildingAge = currentYear - buildingYear;

  if (buildingAge < 20) return 1.0;

  // 20년 이상: 1년당 1% 가산, 최대 40%
  const surcharge = 1.0 + Math.min((buildingAge - 20) * 0.01, 0.40);
  return surcharge;
}

/**
 * 덤핑가격 판정 기준 (하한가의 70%)
 */
export const DUMPING_THRESHOLD = 0.70;

/**
 * 과다청구 판정 기준 (상한가의 130%)
 */
export const OVERCHARGE_THRESHOLD = 1.30;

/**
 * 총액 상태 판정 (5단계)
 */
export type TotalAmountStatus =
  | 'ABNORMAL_LOW'   // 하한가의 70% 미만
  | 'LOW'            // 하한가~평균 미만
  | 'NORMAL'         // 하한가~상한가
  | 'HIGH'           // 상한가~130% 이하
  | 'ABNORMAL_HIGH'; // 상한가의 130% 초과

export function getTotalAmountStatus(
  quoted: number,
  benchmarkLow: number,
  benchmarkHigh: number
): TotalAmountStatus {
  if (quoted < benchmarkLow * DUMPING_THRESHOLD) return 'ABNORMAL_LOW';
  if (quoted < benchmarkLow) return 'LOW';
  if (quoted <= benchmarkHigh) return 'NORMAL';
  if (quoted <= benchmarkHigh * OVERCHARGE_THRESHOLD) return 'HIGH';
  return 'ABNORMAL_HIGH';
}

/**
 * 종합 판정 상태 (4단계)
 */
export type OverallStatus =
  | 'NORMAL'   // 모든 체크 통과
  | 'CAUTION'  // 1개 리스크 플래그 또는 LOW/HIGH
  | 'WARNING'  // 2개 이상 리스크 플래그
  | 'DANGER';  // ABNORMAL_LOW 또는 ABNORMAL_HIGH

export function getOverallStatus(
  totalStatus: TotalAmountStatus,
  riskFlagCount: number
): OverallStatus {
  if (totalStatus === 'ABNORMAL_LOW' || totalStatus === 'ABNORMAL_HIGH') {
    return 'DANGER';
  }
  if (riskFlagCount >= 2) return 'WARNING';
  if (riskFlagCount >= 1 || totalStatus === 'LOW' || totalStatus === 'HIGH') {
    return 'CAUTION';
  }
  return 'NORMAL';
}

/**
 * 리스크 플래그 타입
 */
export type RiskFlagType =
  | 'DUMPING_PRICE'         // 덤핑 가격 (부실시공 위험)
  | 'OVERCHARGE'            // 과다 청구
  | 'MISSING_PROCESS'       // 필수 공정 누락
  | 'ABNORMAL_LABOR'        // 노임단가 이상
  | 'OLD_BUILDING_RISK';    // 구축 건물 추가 리스크

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskFlag {
  type: RiskFlagType;
  severity: RiskSeverity;
  message: string;
}
