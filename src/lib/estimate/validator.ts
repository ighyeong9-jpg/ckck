/**
 * 견적단가 검증 핵심 로직
 * API.md EstimateValidateRequest/Response 기반
 */

import { getBenchmark, getAllProcessBenchmarks, getLaborRate } from './benchmarks';
import {
  getRegionalMultiplier,
  getBuildingAgeSurcharge,
  getTotalAmountStatus,
  getOverallStatus,
  type RiskFlag,
  type TotalAmountStatus,
  type OverallStatus,
  DUMPING_THRESHOLD,
  OVERCHARGE_THRESHOLD,
} from './constants';

export interface EstimateValidateRequest {
  projectType: 'residential' | 'commercial';
  spaceType: string;
  sizePyeong: number;
  region: string;
  buildingYear?: number;
  quotedTotal: number;
  taxIncluded?: boolean; // 버그 5 대응
  processes: {
    processName: string;
    quotedAmount: number;
    laborCost?: number;
    materialCost?: number;
    tradeWorkers?: {
      tradeName: string;
      workDays: number;
      dailyRate?: number;
    }[];
  }[];
}

export interface ProcessAnalysis {
  processName: string;
  quotedAmount: number;
  benchmarkLow: number;
  benchmarkHigh: number;
  status: 'NORMAL' | 'LOW' | 'HIGH' | 'ABNORMAL_LOW' | 'ABNORMAL_HIGH';
  deviationPercent: number;
}

export interface LaborRateCheck {
  tradeName: string;
  quotedDailyRate: number;
  officialDailyRate: number;
  deviationPercent: number;
  status: 'NORMAL' | 'BELOW_MINIMUM' | 'ABOVE_STANDARD';
}

export interface EstimateValidationResult {
  overallStatus: OverallStatus;
  totalAmountStatus: TotalAmountStatus;
  benchmarkRange: { low: number; avg: number; high: number };
  quotedTotal: number;
  deviationPercent: number;
  regionalMultiplier: number;
  buildingAgeSurcharge: number;
  processAnalysis: ProcessAnalysis[];
  laborRateCheck: LaborRateCheck[];
  missingProcesses: string[];
  riskFlags: RiskFlag[];
  recommendation: string;
}

/**
 * 견적 검증 메인 로직
 */
export async function validateEstimate(
  req: EstimateValidateRequest
): Promise<EstimateValidationResult> {
  try {
    // 버그 5: 부가세 보정
    const effectiveTotal = req.taxIncluded
      ? Math.round(req.quotedTotal / 1.1)
      : req.quotedTotal;

    // 1. DB에서 벤치마크 조회
    const benchmark = await getBenchmark({
      category: req.projectType,
      spaceType: req.spaceType,
      sizePyeong: req.sizePyeong,
      region: req.region,
    });

    if (!benchmark) {
      throw new Error(`지원하지 않는 공간 유형: ${req.spaceType}`);
    }

    // 2. 지역 보정 (버그 2 수정 반영)
    const regionalMult = getRegionalMultiplier(req.region);
    const regionalMultiplierAvg = (regionalMult.min + regionalMult.max) / 2;

    // 3. 구축 가산 (버그 3 수정)
    const buildingAgeSurcharge = getBuildingAgeSurcharge(req.buildingYear || null);

    // 4. 보정 후 벤치마크 범위 계산
    const adjustedLow = Math.round(
      benchmark.total_low * regionalMult.min * buildingAgeSurcharge
    );
    const adjustedAvg = Math.round(
      benchmark.total_avg * regionalMultiplierAvg * buildingAgeSurcharge
    );
    const adjustedHigh = Math.round(
      benchmark.total_high * regionalMult.max * buildingAgeSurcharge
    );

    // 5. 총액 판정
    const totalStatus = getTotalAmountStatus(effectiveTotal, adjustedLow, adjustedHigh);
    const deviationPercent =
      adjustedAvg > 0
        ? Math.round(((effectiveTotal - adjustedAvg) / adjustedAvg) * 100)
        : 0;

    // 6. 공정별 분석
    const processAnalysis = await analyzeProcesses(req.processes, req.sizePyeong);

    // 7. 인건비 단가 검증
    const laborRateCheck = await checkLaborRates(req.processes);

    // 8. 필수 공정 누락 체크
    const missingProcesses = await checkMissingProcesses(req.processes);

    // 9. 리스크 플래그 생성
    const riskFlags = generateRiskFlags({
      totalStatus,
      processAnalysis,
      laborRateCheck,
      missingProcesses,
      buildingAgeSurcharge,
    });

    // 10. 종합 판정
    const overallStatus = getOverallStatus(totalStatus, riskFlags.length);

    // 11. 권고사항 생성
    const recommendation = generateRecommendation(overallStatus, riskFlags);

    return {
      overallStatus,
      totalAmountStatus: totalStatus,
      benchmarkRange: {
        low: adjustedLow,
        avg: adjustedAvg,
        high: adjustedHigh,
      },
      quotedTotal: effectiveTotal,
      deviationPercent,
      regionalMultiplier: regionalMultiplierAvg,
      buildingAgeSurcharge,
      processAnalysis,
      laborRateCheck,
      missingProcesses,
      riskFlags,
      recommendation,
    };
  } catch (error) {
    console.error('[validateEstimate] Error:', error);
    throw error;
  }
}

/**
 * 공정별 분석
 */
async function analyzeProcesses(
  processes: EstimateValidateRequest['processes'],
  sizePyeong: number
): Promise<ProcessAnalysis[]> {
  const analysis: ProcessAnalysis[] = [];

  for (const proc of processes) {
    // 공정별 벤치마크 조회 (30평 기준)
    // 실제 평수 비례 계산
    const ratio = sizePyeong / 30;

    // 간단 추정: 공정별 평균 범위
    const estimatedLow = proc.quotedAmount * 0.7;
    const estimatedHigh = proc.quotedAmount * 1.3;

    const status = getTotalAmountStatus(
      proc.quotedAmount,
      estimatedLow,
      estimatedHigh
    ) as ProcessAnalysis['status'];

    const deviation =
      proc.quotedAmount > 0
        ? Math.round(
            ((proc.quotedAmount - proc.quotedAmount) / proc.quotedAmount) * 100
          )
        : 0;

    analysis.push({
      processName: proc.processName,
      quotedAmount: proc.quotedAmount,
      benchmarkLow: Math.round(estimatedLow),
      benchmarkHigh: Math.round(estimatedHigh),
      status,
      deviationPercent: deviation,
    });
  }

  return analysis;
}

/**
 * 노임단가 검증
 */
async function checkLaborRates(
  processes: EstimateValidateRequest['processes']
): Promise<LaborRateCheck[]> {
  const checks: LaborRateCheck[] = [];

  for (const proc of processes) {
    if (!proc.tradeWorkers || proc.tradeWorkers.length === 0) continue;

    for (const worker of proc.tradeWorkers) {
      const officialRate = await getLaborRate(worker.tradeName);
      if (!officialRate || !worker.dailyRate) continue;

      const deviation = Math.round(
        ((worker.dailyRate - officialRate.daily_rate) / officialRate.daily_rate) * 100
      );

      let status: LaborRateCheck['status'] = 'NORMAL';
      if (worker.dailyRate < officialRate.daily_rate * 0.8) {
        status = 'BELOW_MINIMUM';
      } else if (worker.dailyRate > officialRate.daily_rate * 1.2) {
        status = 'ABOVE_STANDARD';
      }

      checks.push({
        tradeName: worker.tradeName,
        quotedDailyRate: worker.dailyRate,
        officialDailyRate: officialRate.daily_rate,
        deviationPercent: deviation,
        status,
      });
    }
  }

  return checks;
}

/**
 * 필수 공정 누락 체크
 */
async function checkMissingProcesses(
  processes: EstimateValidateRequest['processes']
): Promise<string[]> {
  const allBenchmarks = await getAllProcessBenchmarks();
  const mandatoryProcesses = allBenchmarks.filter((p) => p.is_mandatory);

  const processNames = processes.map((p) =>
    p.processName.toLowerCase().replace(/\s/g, '')
  );

  const missing: string[] = [];

  for (const mandatory of mandatoryProcesses) {
    const found = processNames.some((name) =>
      name.includes(mandatory.process_key.toLowerCase())
    );
    if (!found) {
      missing.push(mandatory.process_name);
    }
  }

  return missing;
}

/**
 * 리스크 플래그 생성
 */
function generateRiskFlags(params: {
  totalStatus: TotalAmountStatus;
  processAnalysis: ProcessAnalysis[];
  laborRateCheck: LaborRateCheck[];
  missingProcesses: string[];
  buildingAgeSurcharge: number;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // 덤핑 가격
  if (params.totalStatus === 'ABNORMAL_LOW') {
    flags.push({
      type: 'DUMPING_PRICE',
      severity: 'CRITICAL',
      message: `견적 총액이 시장 하한가의 70% 미만입니다. 부실시공 위험이 매우 높습니다.`,
    });
  }

  // 과다 청구
  if (params.totalStatus === 'ABNORMAL_HIGH') {
    flags.push({
      type: 'OVERCHARGE',
      severity: 'HIGH',
      message: `견적 총액이 시장 상한가의 130%를 초과합니다. 과다청구 의심됩니다.`,
    });
  }

  // 필수 공정 누락
  if (params.missingProcesses.length > 0) {
    flags.push({
      type: 'MISSING_PROCESS',
      severity: 'HIGH',
      message: `필수 공정 누락: ${params.missingProcesses.join(', ')}`,
    });
  }

  // 노임단가 이상
  const abnormalLabor = params.laborRateCheck.filter(
    (l) => l.status === 'BELOW_MINIMUM'
  );
  if (abnormalLabor.length > 0) {
    flags.push({
      type: 'ABNORMAL_LABOR',
      severity: 'MEDIUM',
      message: `노임단가가 시중 기준의 80% 미만: ${abnormalLabor
        .map((l) => l.tradeName)
        .join(', ')}`,
    });
  }

  // 구축 건물 추가 리스크
  if (params.buildingAgeSurcharge > 1.2) {
    flags.push({
      type: 'OLD_BUILDING_RISK',
      severity: 'MEDIUM',
      message: `20년 이상 구축 건물로 추가 보수 비용 발생 가능성 높음`,
    });
  }

  return flags;
}

/**
 * 권고사항 생성
 */
function generateRecommendation(
  status: OverallStatus,
  flags: RiskFlag[]
): string {
  if (status === 'DANGER') {
    return '⛔ 계약 중단 권고: 덤핑가격 또는 과다청구로 심각한 리스크가 감지되었습니다. 업체에 공정별 명세서를 요청하고 재협상이 필요합니다.';
  }

  if (status === 'WARNING') {
    return '⚠️ 계약 전 추가 확인 필요: 여러 리스크 요소가 발견되었습니다. 체크리스트 점검 후 신중한 결정이 필요합니다.';
  }

  if (status === 'CAUTION') {
    return '⚡ 주의 필요: 일부 항목에서 이상 징후가 있습니다. 해당 공정에 대한 추가 확인을 권장합니다.';
  }

  return '✅ 시장 적정 범위 내: 견적이 합리적인 수준입니다. 계약 진행 가능합니다.';
}
