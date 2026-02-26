'use client'

import Link from 'next/link'

interface TopBarProps {
  title: string
  subtitle?: string
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-7 flex-shrink-0 sticky top-0 z-10">
      <div>
        <h1 className="text-[15px] font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <Link
          href="/projects"
          className="h-9 px-4 rounded-lg text-xs font-semibold text-navy-800 border border-navy-800/20 hover:bg-navy-100 transition-colors flex items-center gap-1.5"
        >
          📁 현장 선택
        </Link>
      </div>
    </header>
  )
}
