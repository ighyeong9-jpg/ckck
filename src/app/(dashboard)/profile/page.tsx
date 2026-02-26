'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompanyProfile } from '@/types/companyProfile'
import { SPECIALTY_OPTIONS } from '@/types/companyProfile'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

export default function ProfilePage() {
  const toast = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Partial<CompanyProfile>>({
    company_name: '',
    description: '',
    specialty_tags: [],
    phone: '',
    email: '',
    address: '',
    logo_url: null,
    portfolio_images: [],
    is_public: false,
    profile_token: null,
  })
  const [stats, setStats] = useState({ totalProjects: 0, avgScore: 0, avgDuration: 0 })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile (profiles 테이블: id = auth user id)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
      }

      // Auto-calculate stats from projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, status, created_at, updated_at, start_date, end_date')

      const { data: certs } = await supabase
        .from('verification_certificates')
        .select('overall_score')

      const totalProjects = projects?.filter(p => p.status === 'completed').length || 0
      const avgScore = certs && certs.length > 0
        ? Math.round(certs.reduce((s, c) => s + (c.overall_score || 0), 0) / certs.length)
        : 0

      // Average duration in days
      let avgDuration = 0
      if (projects) {
        const completedWithDates = projects.filter(p => p.start_date && p.end_date && p.status === 'completed')
        if (completedWithDates.length > 0) {
          const totalDays = completedWithDates.reduce((sum, p) => {
            const days = Math.ceil((new Date(p.end_date!).getTime() - new Date(p.start_date!).getTime()) / 86400000)
            return sum + days
          }, 0)
          avgDuration = Math.round(totalDays / completedWithDates.length)
        }
      }

      setStats({ totalProjects, avgScore, avgDuration })
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 32; i++) {
      token += chars[Math.floor(Math.random() * chars.length)]
    }
    return token
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const saveData: Record<string, any> = {
        phone: profile.phone || null,
        updated_at: new Date().toISOString(),
      }

      // migration 후 사용 가능한 컬럼들
      if (profile.company_name !== undefined) saveData.company_name = profile.company_name || null
      if (profile.description !== undefined) saveData.description = profile.description || null
      if (profile.specialty_tags !== undefined) saveData.specialty_tags = profile.specialty_tags || []
      if (profile.address !== undefined) saveData.address = profile.address || null
      if (profile.logo_url !== undefined) saveData.logo_url = profile.logo_url || null
      if (profile.portfolio_images !== undefined) saveData.portfolio_images = profile.portfolio_images || []
      if (profile.is_public !== undefined) saveData.is_public = profile.is_public || false
      if (profile.profile_token !== undefined) saveData.profile_token = profile.profile_token || null
      saveData.avg_verification_score = stats.avgScore
      saveData.total_projects = stats.totalProjects
      saveData.avg_duration_days = stats.avgDuration

      const { error } = await supabase.from('profiles').update(saveData).eq('id', user.id)
      if (error) throw error

      toast.success('프로필이 저장되었습니다.')
    } catch (err: any) {
      toast.error(`저장 오류: ${err?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleTag = (tag: string) => {
    setProfile(prev => ({
      ...prev,
      specialty_tags: prev.specialty_tags?.includes(tag)
        ? prev.specialty_tags.filter(t => t !== tag)
        : [...(prev.specialty_tags || []), tag],
    }))
  }

  const generatePublicLink = () => {
    const token = generateToken()
    setProfile(prev => ({ ...prev, profile_token: token, is_public: true }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const ext = file.name.split('.').pop()
      const fileName = `logos/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('evidence').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('evidence').getPublicUrl(fileName)
      setProfile(prev => ({ ...prev, logo_url: data.publicUrl }))
    } catch (err: any) {
      toast.error(`로고 업로드 오류: ${err?.message}`)
    }
  }

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    try {
      const newImages: string[] = []
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const fileName = `portfolio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('evidence').upload(fileName, file)
        if (error) throw error
        const { data } = supabase.storage.from('evidence').getPublicUrl(fileName)
        newImages.push(data.publicUrl)
      }
      setProfile(prev => ({ ...prev, portfolio_images: [...(prev.portfolio_images || []), ...newImages] }))
    } catch (err: any) {
      toast.error(`포트폴리오 업로드 오류: ${err?.message}`)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>프로필 로딩 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>업체 프로필</h1>
        <p>회사 정보를 관리하고 고객에게 포트폴리오를 공유하세요</p>
      </header>

      <main className={styles.main}>
        {/* Stats */}
        <section className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>📁</span>
            <span className={styles.statValue}>{stats.totalProjects}</span>
            <span className={styles.statLabel}>완료 프로젝트</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🤖</span>
            <span className={styles.statValue}>{stats.avgScore}점</span>
            <span className={styles.statLabel}>평균 AI 검증</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>📅</span>
            <span className={styles.statValue}>{stats.avgDuration}일</span>
            <span className={styles.statLabel}>평균 공기</span>
          </div>
        </section>

        {/* Company Info */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>회사 정보</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>회사명</label>
              <input
                type="text"
                value={profile.company_name || ''}
                onChange={e => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="예: 홍길동 인테리어"
              />
            </div>
            <div className={styles.formGroup}>
              <label>연락처</label>
              <input
                type="tel"
                value={profile.phone || ''}
                onChange={e => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>
            <div className={styles.formGroup}>
              <label>이메일</label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={e => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className={styles.formGroup}>
              <label>주소</label>
              <input
                type="text"
                value={profile.address || ''}
                onChange={e => setProfile(prev => ({ ...prev, address: e.target.value }))}
                placeholder="사업장 주소"
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>소개글</label>
            <textarea
              value={profile.description || ''}
              onChange={e => setProfile(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="회사에 대한 간단한 소개"
            />
          </div>
        </section>

        {/* Logo */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>로고</h2>
          <div className={styles.logoUpload}>
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="로고" className={styles.logoPreview} />
            ) : (
              <div className={styles.logoPlaceholder}>🏢</div>
            )}
            <label className={styles.uploadBtn}>
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              로고 업로드
            </label>
          </div>
        </section>

        {/* Specialty Tags */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>전문분야</h2>
          <div className={styles.tagGrid}>
            {SPECIALTY_OPTIONS.map(tag => (
              <button
                key={tag}
                className={`${styles.tagChip} ${profile.specialty_tags?.includes(tag) ? styles.tagActive : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* Portfolio Images */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>포트폴리오</h2>
          <div className={styles.portfolioGrid}>
            {(profile.portfolio_images || []).map((img, i) => (
              <div key={i} className={styles.portfolioItem}>
                <img src={img} alt={`포트폴리오 ${i + 1}`} />
                <button
                  className={styles.removeBtn}
                  onClick={() => setProfile(prev => ({
                    ...prev,
                    portfolio_images: prev.portfolio_images?.filter((_, idx) => idx !== i),
                  }))}
                >
                  ✕
                </button>
              </div>
            ))}
            <label className={styles.portfolioAddBtn}>
              <input type="file" accept="image/*" multiple onChange={handlePortfolioUpload} style={{ display: 'none' }} />
              📷 사진 추가
            </label>
          </div>
        </section>

        {/* Public Profile Link */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>공개 프로필</h2>
          {profile.profile_token ? (
            <div className={styles.publicLink}>
              <span className={styles.linkUrl}>
                {typeof window !== 'undefined' ? `${window.location.origin}/profile/${profile.profile_token}` : ''}
              </span>
              <button
                className={styles.copyBtn}
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/profile/${profile.profile_token}`)
                  toast.success('링크가 복사되었습니다!')
                }}
              >
                복사
              </button>
            </div>
          ) : (
            <button className={styles.generateBtn} onClick={generatePublicLink}>
              공개 프로필 링크 생성
            </button>
          )}
        </section>

        {/* Save */}
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '프로필 저장'}
        </button>
      </main>
    </div>
  )
}
