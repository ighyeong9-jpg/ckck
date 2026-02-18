'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CompanyProfile } from '@/types/companyProfile'
import styles from './page.module.scss'

export default function PublicProfilePage() {
  const params = useParams()
  const token = params.token as string
  const supabase = createClient()

  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('profile_token', token)
          .eq('is_public', true)
          .single()

        if (fetchError || !data) {
          setError('프로필을 찾을 수 없습니다.')
          return
        }

        setProfile(data)
      } catch (err) {
        setError('데이터를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>프로필 로딩 중...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>프로필을 찾을 수 없습니다</h2>
        <p>{error || '유효하지 않은 프로필 링크입니다.'}</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.branding}>
            <span className={styles.logoIcon}>✓</span>
            <span className={styles.logoText}>Check-In</span>
          </div>
          <div className={styles.profileHeader}>
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="로고" className={styles.profileLogo} />
            ) : (
              <div className={styles.profileLogoPlaceholder}>🏢</div>
            )}
            <h1 className={styles.companyName}>{profile.company_name || '업체명'}</h1>
            {profile.description && <p className={styles.description}>{profile.description}</p>}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Stats */}
        <section className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{profile.total_projects || 0}</span>
            <span className={styles.statLabel}>완료 프로젝트</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{profile.avg_verification_score || 0}점</span>
            <span className={styles.statLabel}>AI 검증 점수</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{profile.avg_duration_days || 0}일</span>
            <span className={styles.statLabel}>평균 공기</span>
          </div>
        </section>

        {/* Specialties */}
        {profile.specialty_tags && profile.specialty_tags.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>전문분야</h2>
            <div className={styles.tagList}>
              {profile.specialty_tags.map((tag, i) => (
                <span key={i} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>연락처</h2>
          <div className={styles.contactList}>
            {profile.phone && <div className={styles.contactItem}>📞 {profile.phone}</div>}
            {profile.email && <div className={styles.contactItem}>✉️ {profile.email}</div>}
            {profile.address && <div className={styles.contactItem}>📍 {profile.address}</div>}
          </div>
        </section>

        {/* Portfolio */}
        {profile.portfolio_images && profile.portfolio_images.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>포트폴리오</h2>
            <div className={styles.portfolioGrid}>
              {profile.portfolio_images.map((img, i) => (
                <img key={i} src={img} alt={`포트폴리오 ${i + 1}`} className={styles.portfolioImg} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerLogo}>✓ Check-In</span>
        <span className={styles.footerText}>기록의 편 - 인테리어 프로젝트 관리</span>
      </footer>
    </div>
  )
}
