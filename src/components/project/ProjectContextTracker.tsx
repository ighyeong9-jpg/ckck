'use client'

import { useEffect } from 'react'

/**
 * 프로젝트 페이지 방문 시 projectId와 projectName을 localStorage에 저장.
 * AI 채팅 페이지에서 마지막 방문 프로젝트 컨텍스트를 자동으로 감지하는 데 사용됩니다.
 */
export default function ProjectContextTracker({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  useEffect(() => {
    if (!projectId || projectId === 'new') return
    localStorage.setItem('lastProjectId', projectId)
    localStorage.setItem('lastProjectName', projectName)
  }, [projectId, projectName])

  return null
}
