/**
 * PricingGauge - 게이지 차트 래퍼
 * 버그 7 수정: dynamic import로 SSR 비활성화
 */

import dynamic from 'next/dynamic';

const PricingGaugeClient = dynamic(
  () => import('./PricingGaugeClient'),
  {
    ssr: false,
    loading: () => (
      <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
    ),
  }
);

export default PricingGaugeClient;
