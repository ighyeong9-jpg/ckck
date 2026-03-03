/**
 * StatusBanner - 견적 검증 결과 상태 배너
 */

'use client';

interface StatusBannerProps {
  status: 'GO' | 'CAUTION' | 'WARNING' | 'DANGER';
  title: string;
}

const statusConfig = {
  GO: {
    bg: 'bg-gradient-to-r from-green-500/[0.08] to-green-500/[0.04]',
    border: 'border-green-500/20 border-l-green-500',
    text: 'text-green-600',
    icon: '✓',
  },
  CAUTION: {
    bg: 'bg-gradient-to-r from-yellow-500/[0.08] to-yellow-500/[0.04]',
    border: 'border-yellow-500/20 border-l-yellow-500',
    text: 'text-yellow-600',
    icon: '⚠',
  },
  WARNING: {
    bg: 'bg-gradient-to-r from-orange-500/[0.08] to-orange-500/[0.04]',
    border: 'border-orange-500/20 border-l-orange-500',
    text: 'text-orange-600',
    icon: '⚠',
  },
  DANGER: {
    bg: 'bg-gradient-to-r from-red-500/[0.08] to-red-500/[0.04]',
    border: 'border-red-500/20 border-l-red-500',
    text: 'text-red-600',
    icon: '!',
  },
};

export default function StatusBanner({ status, title }: StatusBannerProps) {
  const config = statusConfig[status];

  return (
    <div
      className={`${config.bg} border ${config.border} border-l-4 rounded-xl p-6 mb-6 flex items-center gap-4 shadow-sm`}
    >
      <div
        className={`w-12 h-12 rounded-xl ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}
      >
        <span className={`text-2xl font-bold ${config.text}`}>
          {config.icon}
        </span>
      </div>
      <div className="flex-1">
        <div className={`text-lg font-extrabold ${config.text}`}>{title}</div>
      </div>
    </div>
  );
}
