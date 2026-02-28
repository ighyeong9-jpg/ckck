'use client'

import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export default function DashboardLayout({ children, title = '대시보드', subtitle }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60 min-h-screen">
        <TopBar title={title} subtitle={subtitle} />
        <main className="flex-1 p-7 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
