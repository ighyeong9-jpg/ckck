'use client'

import { useRouter, useParams } from 'next/navigation'
import { useProjectRole } from '@/hooks/useProjectRole'
import styles from './MobileQuickAction.module.scss'

interface MobileQuickActionProps {
  projectId: string
}

export default function MobileQuickAction({ projectId }: MobileQuickActionProps) {
  const router = useRouter()
  const { role } = useProjectRole(projectId)

  // TECHNICIAN, MANAGER만 표시
  const shouldShow = role === 'TECHNICIAN' || role === 'MANAGER'

  if (!shouldShow) return null

  const actions = [
    {
      icon: '📷',
      label: '사진',
      onClick: () => router.push(`/projects/${projectId}/evidence`),
    },
    {
      icon: '⚠️',
      label: '이슈',
      onClick: () => router.push(`/projects/${projectId}/issues`),
    },
    {
      icon: '✅',
      label: '체크리스트',
      onClick: () => router.push(`/projects/${projectId}/checklist`),
    },
    {
      icon: '✔️',
      label: '완료',
      onClick: () => {
        // TODO: 완료 처리 모달 또는 페이지로 이동
        alert('공정 완료 처리 기능은 준비 중입니다')
      },
    },
  ]

  return (
    <div className={styles.container}>
      {actions.map((action, index) => (
        <button
          key={index}
          className={styles.actionBtn}
          onClick={action.onClick}
        >
          <span className={styles.icon}>{action.icon}</span>
          <span className={styles.label}>{action.label}</span>
        </button>
      ))}
    </div>
  )
}
