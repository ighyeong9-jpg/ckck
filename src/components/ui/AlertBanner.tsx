'use client'

interface AlertBannerProps {
  score: number
  projectId?: string
}

export default function AlertBanner({ score, projectId }: AlertBannerProps) {
  if (score < 61) return null

  return (
    <div className="bg-gradient-to-r from-red-500/[0.08] to-red-500/[0.04] border border-red-500/20 border-l-4 border-l-red-500 rounded-xl p-[18px] mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3.5">
        <span className="text-2xl">⚠️</span>
        <div>
          <div className="text-sm font-extrabold text-red-500 mb-0.5">
            기록 관리 징후 감지 — 리스크 {score}점
          </div>
          <div className="text-sm text-gray-600">
            방치 시 기록 관리 비용 평균{' '}
            <strong className="text-red-500 font-black">700만원</strong> 발생
          </div>
        </div>
      </div>
      <a
        href={projectId ? `/projects/${projectId}/evidence-package` : '/projects'}
        className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-[15px] font-bold text-white bg-orange-500 shadow-orange hover:bg-orange-400 hover:-translate-y-0.5 transition-all duration-[250ms] whitespace-nowrap"
      >
        🛡 증빙 패키지 받기 →
      </a>
    </div>
  )
}
