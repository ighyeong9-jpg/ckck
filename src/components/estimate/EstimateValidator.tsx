/**
 * EstimateValidator - 견적단가 검증 메인 컴포넌트
 * 밝은 테마
 */

'use client';

import { useState } from 'react';
import EstimateForm, { type EstimateFormData } from './EstimateForm';
import EstimateResult from './EstimateResult';
import type { EstimateValidationResult } from '@/lib/estimate/validator';

interface EstimateValidatorProps {
  projectId?: string;
  initialData?: Partial<EstimateFormData>;
  onComplete?: (result: EstimateValidationResult) => void;
}

export default function EstimateValidator({
  projectId,
  initialData,
  onComplete,
}: EstimateValidatorProps) {
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EstimateValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: EstimateFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/estimate/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || '검증 실패');
      }

      setResult(json.data);
      setStep('result');
      onComplete?.(json.data);
    } catch (err: any) {
      console.error('[EstimateValidator] Error:', err);
      setError(err.message || '서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {step === 'input' && (
        <div>
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 flex items-center gap-3">
              <span className="w-2 h-8 bg-[#E8651A] rounded-full" />
              견적단가 검증
            </h1>
            <p className="text-gray-600 text-base">
              시장 벤치마크와 비교하여 견적의 적정성을 검증합니다.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-300 flex items-center justify-center flex-shrink-0">
                  <span className="text-base text-red-600">✕</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-800 mb-1">검증 실패</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <EstimateForm
            initialData={initialData}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      )}

      {step === 'result' && result && (
        <div>
          {/* 헤더 with 뒤로가기 */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-2 h-8 bg-[#E8651A] rounded-full" />
              검증 결과
            </h1>
            <button
              onClick={handleReset}
              className="px-6 py-3 text-sm border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition-all duration-200 font-semibold"
            >
              ← 다시 검증
            </button>
          </div>

          <EstimateResult
            result={result}
            onPdfSave={() => alert('PDF 저장 기능 준비 중')}
            onNext={() => alert('증거 패키징 페이지로 이동')}
          />
        </div>
      )}
    </div>
  );
}
