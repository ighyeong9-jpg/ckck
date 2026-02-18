'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VerificationCertificate } from '@/types/verification'
import { GRADE_COLORS, GRADE_LABELS } from '@/types/verification'
import styles from './VerificationBadge.module.scss'

interface VerificationBadgeProps {
  projectId: string
  compact?: boolean
}

export default function VerificationBadge({ projectId, compact = false }: VerificationBadgeProps) {
  const [cert, setCert] = useState<VerificationCertificate | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('verification_certificates')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('issued_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) setCert(data as VerificationCertificate)
    }
    load()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!cert || !cert.badge_eligible) return null

  if (compact) {
    return (
      <span
        className={styles.compactBadge}
        style={{ background: GRADE_COLORS[cert.grade] }}
        title={`AI 검증 ${cert.grade}등급 (${cert.total_score}점)`}
      >
        {cert.grade}
      </span>
    )
  }

  return (
    <div className={styles.badge} style={{ borderColor: GRADE_COLORS[cert.grade] }}>
      <div className={styles.badgeGrade} style={{ background: GRADE_COLORS[cert.grade] }}>
        {cert.grade}
      </div>
      <div className={styles.badgeInfo}>
        <span className={styles.badgeTitle}>AI 검증 {GRADE_LABELS[cert.grade]}</span>
        <span className={styles.badgeScore}>{cert.total_score}점</span>
      </div>
    </div>
  )
}
