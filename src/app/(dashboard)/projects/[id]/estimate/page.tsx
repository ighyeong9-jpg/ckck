/**
 * /projects/[id]/estimate - 견적단가 검증 페이지
 * SCREENS.md 화면 4 기반
 */

import { Suspense } from 'react';
import EstimateValidator from '@/components/estimate/EstimateValidator';

interface PageProps {
  params: {
    id: string;
  };
}

function EstimatePageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <div className="h-10 w-64 bg-gray-100 rounded-lg animate-pulse mb-3" />
        <div className="h-5 w-96 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-8">
        <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

export default function EstimatePage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Suspense fallback={<EstimatePageSkeleton />}>
        <EstimateValidator projectId={params.id} />
      </Suspense>
    </div>
  );
}
