/**
 * EstimateResult - 검증 결과 표시
 * 밝은 테마
 */

'use client';

import { useState } from 'react';
import StatusBanner from '../ui/StatusBanner';
import RiskBadge from '../ui/RiskBadge';
import PricingGauge from './PricingGauge';
import type { EstimateValidationResult } from '@/lib/estimate/validator';

interface EstimateResultProps {
  result: EstimateValidationResult;
  onPdfSave?: () => void;
  onNext?: () => void;
}

export default function EstimateResult({
  result,
  onPdfSave,
  onNext,
}: EstimateResultProps) {
  const [expandedCount, setExpandedCount] = useState(3);

  const bannerStatus = {
    NORMAL: 'GO',
    CAUTION: 'CAUTION',
    WARNING: 'WARNING',
    DANGER: 'DANGER',
  }[result.overallStatus] as any;

  const bannerTitle = {
    NORMAL: 'NORMAL — 시장 적정 범위 내',
    CAUTION: 'CAUTION — 주의 필요',
    WARNING: 'WARNING — 추가 확인 필요',
    DANGER: 'DANGER — 계약 중단 권고',
  }[result.overallStatus];

  return (
    <div className="space-y-6">
      {/* 결과 배너 */}
      <div className="sticky top-0 z-50">
        <StatusBanner status={bannerStatus} title={bannerTitle} />
      </div>

      {/* 총액 게이지 카드 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8651A]" />
          총액 시장 위치
        </h3>
        <PricingGauge
          low={result.benchmarkRange.low}
          avg={result.benchmarkRange.avg}
          high={result.benchmarkRange.high}
          quoted={result.quotedTotal}
        />
      </div>

      {/* 공정별 분석 */}
      {result.processAnalysis.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm transition-all duration-200 hover:shadow-md">
          <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8651A]" />
            공정별 분석
            <span className="text-sm font-normal text-gray-500 ml-auto">
              {result.processAnalysis.length}개 공정
            </span>
          </h3>
          <div className="space-y-3">
            {result.processAnalysis.slice(0, expandedCount).map((proc, idx) => {
              const statusConfig = {
                NORMAL: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '✓', label: '정상' },
                LOW: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: '⚠', label: '낮음' },
                HIGH: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '⚠', label: '높음' },
                ABNORMAL_LOW: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '!', label: '비정상 저가' },
                ABNORMAL_HIGH: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '!', label: '비정상 고가' },
              }[proc.status];

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 ${statusConfig.bg} border ${statusConfig.border} rounded-xl transition-all duration-200 hover:-translate-y-0.5`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center ${statusConfig.text} font-bold`}>
                      {statusConfig.icon}
                    </div>
                    <span className="font-semibold text-gray-900">{proc.processName}</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 tabular-nums mr-4">
                    {proc.quotedAmount?.toLocaleString() || '0'}
                    <span className="text-sm font-medium text-gray-500 ml-1">만원</span>
                  </span>
                  <span className={`px-3 py-1 rounded-lg ${statusConfig.bg} border ${statusConfig.border} ${statusConfig.text} text-sm font-bold whitespace-nowrap`}>
                    {statusConfig.label}
                  </span>
                </div>
              );
            })}
          </div>

          {result.processAnalysis.length > 3 && (
            <button
              onClick={() => setExpandedCount(prev => prev === 3 ? result.processAnalysis.length : 3)}
              className="w-full mt-4 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              {expandedCount === 3 ? `+ ${result.processAnalysis.length - 3}개 더보기` : '접기 ↑'}
            </button>
          )}
        </div>
      )}

      {/* 리스크 플래그 */}
      {result.riskFlags.length > 0 && (
        <div className="bg-white border-2 border-red-200 rounded-2xl p-8 shadow-sm transition-all duration-200 hover:shadow-md">
          <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            리스크 경고
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full ml-2">
              {result.riskFlags.length}
            </span>
          </h3>
          <div className="space-y-3">
            {result.riskFlags.map((flag, idx) => (
              <RiskBadge key={idx} flag={flag} />
            ))}
          </div>
        </div>
      )}

      {/* 누락 공정 */}
      {result.missingProcesses.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 p-6 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 border border-yellow-300 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">⚠</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-yellow-900 mb-2">
                누락 공정 의심
              </p>
              <p className="text-sm text-yellow-800">
                {result.missingProcesses.join(', ')} — 대부분 현장에서 포함되는 필수 공정입니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 권고사항 */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">💡</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 mb-1">권고사항</p>
            <p className="text-sm text-gray-700 leading-relaxed">{result.recommendation}</p>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-col md:flex-row gap-3 pt-4">
        {onPdfSave && (
          <button
            onClick={onPdfSave}
            className="flex-1 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold hover:-translate-y-0.5"
          >
            📄 PDF 저장
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="flex-1 px-8 py-4 bg-[#E8651A] text-white rounded-xl hover:bg-[#FF7020] transition-all duration-200 font-bold shadow-lg shadow-[#E8651A]/20 hover:shadow-xl hover:shadow-[#E8651A]/30 hover:-translate-y-0.5"
          >
            증거 패키징으로 이동 →
          </button>
        )}
      </div>
    </div>
  );
}
