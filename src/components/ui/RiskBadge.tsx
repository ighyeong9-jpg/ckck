/**
 * RiskBadge - 리스크 플래그 표시 컴포넌트
 */

'use client';

import type { RiskFlag } from '@/lib/estimate/constants';

interface RiskBadgeProps {
  flag: RiskFlag;
}

const severityConfig = {
  HIGH: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconBg: 'bg-red-100',
    icon: '🚨',
    label: '높음',
  },
  MEDIUM: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    iconBg: 'bg-orange-100',
    icon: '⚠️',
    label: '중간',
  },
  LOW: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    iconBg: 'bg-yellow-100',
    icon: '⚡',
    label: '낮음',
  },
  CRITICAL: {
    bg: 'bg-red-100',
    border: 'border-red-400',
    text: 'text-red-900',
    iconBg: 'bg-red-200',
    icon: '🔴',
    label: '심각',
  },
};

export default function RiskBadge({ flag }: RiskBadgeProps) {
  const config = severityConfig[flag.severity];

  return (
    <div
      className={`${config.bg} border-2 ${config.border} rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg ${config.iconBg} border ${config.border} flex items-center justify-center flex-shrink-0`}
        >
          <span className="text-xl">{config.icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 ${config.bg} border ${config.border} ${config.text} text-xs font-bold rounded-full`}
            >
              {config.label}
            </span>
          </div>
          <p className={`text-sm font-medium ${config.text} leading-relaxed`}>
            {flag.message}
          </p>
        </div>
      </div>
    </div>
  );
}
