/**
 * EstimateForm - 견적 입력 폼
 * 밝은 테마 (흰 배경 + 어두운 글자)
 */

'use client';

import { useState } from 'react';
import ProcessList from './ProcessList';

interface ProcessItem {
  processName: string;
  quotedAmount: number | undefined;
}

export interface EstimateFormData {
  projectType: 'residential' | 'commercial';
  spaceType: string;
  sizePyeong: number | undefined;
  region: string;
  buildingYear?: number;
  quotedTotal: number;
  taxIncluded: boolean;
  processes: ProcessItem[];
}

interface EstimateFormProps {
  initialData?: Partial<EstimateFormData>;
  onSubmit: (data: EstimateFormData) => void;
  isLoading?: boolean;
}

export default function EstimateForm({
  initialData,
  onSubmit,
  isLoading = false,
}: EstimateFormProps) {
  const [formData, setFormData] = useState<EstimateFormData>({
    projectType: 'residential',
    spaceType: '아파트_올수리',
    sizePyeong: undefined,
    region: 'seoul',
    quotedTotal: undefined as any,
    taxIncluded: false,
    processes: [],
    ...initialData,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addProcess = () => {
    setFormData({
      ...formData,
      processes: [
        ...formData.processes,
        { processName: '', quotedAmount: undefined as any },
      ],
    });
  };

  const removeProcess = (index: number) => {
    setFormData({
      ...formData,
      processes: formData.processes.filter((_, i) => i !== index),
    });
  };

  const updateProcess = (index: number, item: ProcessItem) => {
    const newProcesses = [...formData.processes];
    newProcesses[index] = item;
    setFormData({ ...formData, processes: newProcesses });
  };

  const inputClass = "w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:border-[#E8651A] focus:ring-2 focus:ring-[#E8651A]/20 transition-all duration-200 placeholder-gray-400";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 기본 정보 카드 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8651A]" />
          기본 정보
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>공간 유형</label>
            <select
              value={formData.spaceType}
              onChange={(e) =>
                setFormData({ ...formData, spaceType: e.target.value })
              }
              className={inputClass}
            >
              <optgroup label="주거">
                <option value="아파트_올수리">아파트 올수리</option>
                <option value="구축아파트_올수리">구축아파트 올수리</option>
                <option value="부분수리">부분수리</option>
              </optgroup>
              <optgroup label="상업">
                <option value="카페">카페</option>
                <option value="음식점_일반">음식점 일반</option>
                <option value="미용실">미용실</option>
                <option value="사무실">사무실</option>
                <option value="의료기관">의료기관</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className={labelClass}>공사 면적</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.sizePyeong || ''}
                onChange={(e) =>
                  setFormData({ ...formData, sizePyeong: e.target.value ? Number(e.target.value) : undefined })
                }
                className={`${inputClass} tabular-nums`}
                placeholder="평수 입력"
                min="1"
                max="999"
              />
              <span className="text-gray-600 text-sm font-medium px-3">평</span>
            </div>
          </div>

          <div>
            <label className={labelClass}>지역</label>
            <select
              value={formData.region}
              onChange={(e) =>
                setFormData({ ...formData, region: e.target.value })
              }
              className={inputClass}
            >
              <option value="gangnam">서울 강남권 (강남/서초/송파/용산)</option>
              <option value="seoul">서울 일반</option>
              <option value="gyeonggi">경기도</option>
              <option value="metro">광역시</option>
              <option value="local">지방</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              건축연도 <span className="text-gray-400 font-normal text-xs">(선택)</span>
            </label>
            <input
              type="number"
              value={formData.buildingYear || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  buildingYear: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className={`${inputClass} tabular-nums`}
              placeholder="20년+ → 구축 가산 적용"
              min="1980"
              max="2026"
            />
          </div>

          <div>
            <label className={labelClass}>견적 총액</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.quotedTotal || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quotedTotal: e.target.value ? Number(e.target.value) : undefined as any
                  })
                }
                className={`${inputClass} tabular-nums font-bold text-lg`}
                placeholder="견적 총액 입력"
                min="1"
              />
              <span className="text-gray-600 text-sm font-medium px-3">만원</span>
            </div>
          </div>

          <div className="flex items-center pt-8">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.taxIncluded}
                  onChange={(e) =>
                    setFormData({ ...formData, taxIncluded: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-[#E8651A] transition-all duration-200" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5 shadow-sm" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">부가세 포함</span>
            </label>
          </div>
        </div>
      </div>

      {/* 공정 항목 카드 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8651A]" />
          공정별 항목
        </h2>
        <ProcessList
          processes={formData.processes}
          onAdd={addProcess}
          onRemove={removeProcess}
          onUpdate={updateProcess}
          editable={true}
          showTotal={true}
        />
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={isLoading || formData.processes.length === 0}
        className="w-full px-8 py-4 bg-[#E8651A] text-white rounded-xl font-bold text-base hover:bg-[#FF7020] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 disabled:transform-none shadow-lg shadow-[#E8651A]/20 hover:shadow-xl hover:shadow-[#E8651A]/30"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            검증 중...
          </span>
        ) : (
          '검증 시작 →'
        )}
      </button>
    </form>
  );
}
