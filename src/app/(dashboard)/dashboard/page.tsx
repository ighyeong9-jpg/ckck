/**
 * 대시보드 메인 페이지
 * 빠른 접근 카드 추가
 */

'use client';

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  const quickAccessCards = [
    {
      title: '💰 견적단가 검증',
      description: '시장 벤치마크 대비 견적 적정성을 즉시 확인하세요',
      href: '/projects/demo/estimate',
      color: 'from-orange-500 to-orange-600',
      badge: '신규',
    },
    {
      title: '📋 사전진단',
      description: '착공 전 현장 리스크를 사전에 파악합니다',
      href: '/projects/demo/diagnostic',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: '📁 현장 목록',
      description: '전체 현장을 한눈에 관리하세요',
      href: '/projects',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: '🤖 AI 채팅',
      description: '건설 법규와 시공 기준을 AI에게 물어보세요',
      href: '/ai-chat',
      color: 'from-green-500 to-green-600',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
            대시보드
          </h1>
          <p className="text-gray-600">
            체키로 현장을 완벽하게 보호하세요
          </p>
        </div>

        {/* 빠른 접근 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickAccessCards.map((card, idx) => (
            <button
              key={idx}
              onClick={() => router.push(card.href)}
              className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-transparent hover:shadow-xl transition-all duration-200 hover:-translate-y-1 text-left overflow-hidden"
            >
              {/* 배경 그라데이션 (hover시 보임) */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />

              {/* 컨텐츠 */}
              <div className="relative z-10">
                {card.badge && (
                  <span className="inline-block px-2 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full mb-3 group-hover:bg-white/20 group-hover:text-white transition-colors">
                    {card.badge}
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-white transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                  {card.description}
                </p>
                <div className="mt-4 flex items-center text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">
                  <span>바로가기</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">진행 중 현장</h3>
              <span className="text-2xl">🏗️</span>
            </div>
            <p className="text-3xl font-black text-gray-900">0</p>
            <p className="text-sm text-gray-500 mt-1">현장 추가하고 시작하세요</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">리스크 알림</h3>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-3xl font-black text-gray-900">0</p>
            <p className="text-sm text-gray-500 mt-1">주의가 필요한 항목이 없습니다</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">완료 현장</h3>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-black text-gray-900">0</p>
            <p className="text-sm text-gray-500 mt-1">성공적으로 완료된 프로젝트</p>
          </div>
        </div>

        {/* 시작 안내 */}
        <div className="mt-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-black mb-3">🎯 견적단가 검증부터 시작해보세요</h2>
          <p className="text-white/90 mb-6">
            받은 견적서가 시장 가격 대비 적정한지 AI가 즉시 분석해드립니다.
            <br />
            덤핑, 과다청구, 누락 공정을 자동으로 감지합니다.
          </p>
          <button
            onClick={() => router.push('/projects/demo/estimate')}
            className="px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-colors inline-flex items-center gap-2"
          >
            지금 바로 체험하기 →
          </button>
        </div>
      </div>
    </div>
  );
}
