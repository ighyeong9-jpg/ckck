/**
 * PricingGaugeClient - 게이지 차트
 * 버그 7 대응: SSR 비활성화용 클라이언트 컴포넌트
 * 밝은 테마
 */

'use client';

interface PricingGaugeProps {
  low: number;
  avg: number;
  high: number;
  quoted: number;
  unit?: string;
}

export default function PricingGaugeClient({
  low,
  avg,
  high,
  quoted,
  unit = '만원',
}: PricingGaugeProps) {
  const range = high - low;
  const position = range > 0 ? Math.max(0, Math.min(100, ((quoted - low) / range) * 100)) : 50;
  const avgPosition = range > 0 ? ((avg - low) / range) * 100 : 50;

  let statusColor = '#10B981';
  let statusLabel = 'NORMAL';

  if (quoted < low * 0.7) {
    statusColor = '#EF4444';
    statusLabel = 'DANGER';
  } else if (quoted < low) {
    statusColor = '#F59E0B';
    statusLabel = 'CAUTION';
  } else if (quoted > high * 1.3) {
    statusColor = '#EF4444';
    statusLabel = 'DANGER';
  } else if (quoted > high) {
    statusColor = '#F59E0B';
    statusLabel = 'WARNING';
  }

  const diffFromAvg = ((quoted - avg) / avg) * 100;

  return (
    <div className="space-y-6">
      {/* 범위 레이블 */}
      <div className="flex justify-between text-sm font-semibold">
        <div className="text-gray-600">
          <div className="text-xs text-gray-400 mb-1">하한</div>
          <div className="tabular-nums">{low.toLocaleString()}{unit}</div>
        </div>
        <div className="text-[#E8651A]">
          <div className="text-xs text-gray-400 mb-1 text-center">평균</div>
          <div className="tabular-nums text-center">{avg.toLocaleString()}{unit}</div>
        </div>
        <div className="text-gray-600">
          <div className="text-xs text-gray-400 mb-1 text-right">상한</div>
          <div className="tabular-nums text-right">{high.toLocaleString()}{unit}</div>
        </div>
      </div>

      {/* 게이지 바 */}
      <div className="relative h-16">
        {/* 배경 바 */}
        <div className="absolute inset-0 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          {/* 정상 범위 */}
          <div
            className="absolute top-0 bottom-0 bg-green-100"
            style={{ left: 0, right: 0 }}
          />
          {/* 평균선 */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#E8651A]"
            style={{ left: `${avgPosition}%` }}
          />
        </div>

        {/* 견적 위치 마커 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
          style={{ left: `${position}%`, transform: 'translateX(-50%) translateY(-50%)' }}
        >
          <div
            className="w-6 h-6 rounded-full border-4 border-white shadow-lg"
            style={{ backgroundColor: statusColor }}
          />
          <div
            className="absolute top-full mt-1 w-0.5 h-3"
            style={{ backgroundColor: statusColor, left: '50%', transform: 'translateX(-50%)' }}
          />
        </div>
      </div>

      {/* 견적 위치 표시 */}
      <div className="text-center p-6 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="mb-3">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-xs font-bold border-2"
            style={{
              backgroundColor: `${statusColor}20`,
              borderColor: `${statusColor}60`,
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
        </div>
        <div className="text-4xl md:text-5xl font-black tabular-nums mb-2" style={{ color: statusColor }}>
          {quoted.toLocaleString()}
          <span className="text-xl font-semibold text-gray-500 ml-2">{unit}</span>
        </div>
        <div className="text-base text-gray-600 font-medium">
          평균 대비{' '}
          <span className={`font-bold ${diffFromAvg > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {diffFromAvg > 0 ? '+' : ''}{Math.round(diffFromAvg)}%
          </span>
        </div>
      </div>
    </div>
  );
}
