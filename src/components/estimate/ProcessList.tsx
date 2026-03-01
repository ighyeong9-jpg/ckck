/**
 * ProcessList - 공정 항목 추가/삭제 리스트
 * 버그 4 수정: 합계 실시간 업데이트
 * 밝은 테마
 */

'use client';

import { useMemo } from 'react';

interface ProcessItem {
  processName: string;
  quotedAmount: number | undefined;
}

interface ProcessListProps {
  processes: ProcessItem[];
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, item: ProcessItem) => void;
  editable?: boolean;
  showTotal?: boolean;
}

export default function ProcessList({
  processes,
  onAdd,
  onRemove,
  onUpdate,
  editable = true,
  showTotal = true,
}: ProcessListProps) {
  // 버그 4 수정: useMemo로 합계 자동 재계산
  const totalQuoted = useMemo(
    () => processes.reduce((sum, p) => sum + (p.quotedAmount || 0), 0),
    [processes]
  );

  return (
    <div className="space-y-3">
      {processes.map((item, idx) => (
        <div
          key={idx}
          className="group flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 hover:border-gray-200 transition-all duration-200"
        >
          <div className="flex-1">
            <input
              type="text"
              value={item.processName}
              onChange={(e) =>
                onUpdate?.(idx, { ...item, processName: e.target.value })
              }
              disabled={!editable}
              className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E8651A] focus:ring-2 focus:ring-[#E8651A]/20 transition-all duration-200 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="공정명 (예: 타일, 도배, 전기)"
            />
          </div>
          <div className="w-36">
            <input
              type="number"
              value={item.quotedAmount || ''}
              onChange={(e) =>
                onUpdate?.(idx, {
                  ...item,
                  quotedAmount: e.target.value ? Number(e.target.value) : undefined as any,
                })
              }
              disabled={!editable}
              className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg text-right tabular-nums font-semibold focus:outline-none focus:border-[#E8651A] focus:ring-2 focus:ring-[#E8651A]/20 transition-all duration-200 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="만원"
              min="0"
            />
          </div>
          {editable && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              title="삭제"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {editable && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="w-full px-4 py-3.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#E8651A] hover:text-[#E8651A] hover:bg-orange-50 transition-all duration-200 font-medium"
        >
          + 공정 추가
        </button>
      )}

      {showTotal && processes.length > 0 && (
        <div className="flex justify-between items-center p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
          <span className="font-bold text-gray-900">합계</span>
          <span className="text-2xl font-black text-[#E8651A] tabular-nums">
            {totalQuoted.toLocaleString()}
            <span className="text-base font-semibold text-gray-600 ml-1">만원</span>
          </span>
        </div>
      )}
    </div>
  );
}
