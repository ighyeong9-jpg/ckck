'use client'

import { useRouter } from 'next/navigation'
import ProjectTabs, { type TabStatus } from '@/components/project/ProjectTabs'
import styles from './layout.module.scss'

interface ProjectDetailHeaderProps {
  projectId: string
  projectName: string
  tabStatuses: Record<string, TabStatus>
}

export default function ProjectDetailHeader({
  projectId,
  projectName,
  tabStatuses,
}: ProjectDetailHeaderProps) {
  const router = useRouter()

  return (
    <div className={styles.headerArea}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button className={styles.backBtn} onClick={() => router.push('/projects')}>
            ← 프로젝트 목록
          </button>
          <h1 className={styles.title}>{projectName}</h1>
        </div>
      </header>
      <ProjectTabs
        projectId={projectId}
        tabStatuses={tabStatuses}
      />
    </div>
  )
}
