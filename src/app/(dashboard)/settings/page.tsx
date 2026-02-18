'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserSettings } from '@/types/settings'
import styles from './page.module.scss'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)

  const [formData, setFormData] = useState({
    display_name: '',
    company_name: '',
    phone: '',
    email_notifications: true,
    push_notifications: true,
    weekly_report: true,
    risk_alerts: true,
    theme: 'light',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (settingsData) {
          setSettings(settingsData)
          setFormData({
            display_name: settingsData.display_name || '',
            company_name: settingsData.company_name || '',
            phone: settingsData.phone || '',
            email_notifications: settingsData.email_notifications ?? true,
            push_notifications: settingsData.push_notifications ?? true,
            weekly_report: settingsData.weekly_report ?? true,
            risk_alerts: settingsData.risk_alerts ?? true,
            theme: settingsData.theme || 'light',
          })
        } else {
          // 설정이 없으면 기본값으로 새로 생성
          setFormData({
            display_name: user.email?.split('@')[0] || '',
            company_name: '',
            phone: '',
            email_notifications: true,
            push_notifications: true,
            weekly_report: true,
            risk_alerts: true,
            theme: 'light',
          })
        }
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)

    try {
      const settingsData = {
        user_id: user.id,
        ...formData,
        updated_at: new Date().toISOString(),
      }

      if (settings) {
        // 업데이트
        const { error } = await supabase
          .from('user_settings')
          .update(settingsData)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // 새로 생성
        const { data, error } = await supabase
          .from('user_settings')
          .insert([settingsData])
          .select()
          .single()

        if (error) throw error
        setSettings(data)
      }

      alert('설정이 저장되었습니다.')
    } catch (err: any) {
      alert(`저장 오류: ${err?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return

    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>설정</h1>
        <p className={styles.subtitle}>프로필 및 알림 설정을 관리합니다</p>
      </header>

      <main className={styles.main}>
        {/* Profile Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>프로필</h2>
          <div className={styles.card}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}>
                {formData.display_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.email}>{user?.email}</span>
                <span className={styles.joinDate}>
                  가입일: {new Date(user?.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>표시 이름</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="홍길동"
                />
              </div>
              <div className={styles.formGroup}>
                <label>회사명</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="(주)회사"
                />
              </div>
              <div className={styles.formGroup}>
                <label>연락처</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Notification Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>알림 설정</h2>
          <div className={styles.card}>
            <div className={styles.toggleList}>
              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleIcon}>📧</span>
                  <div>
                    <h3>이메일 알림</h3>
                    <p>프로젝트 업데이트를 이메일로 받습니다</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={formData.email_notifications}
                    onChange={e => setFormData(prev => ({ ...prev, email_notifications: e.target.checked }))}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleIcon}>🔔</span>
                  <div>
                    <h3>푸시 알림</h3>
                    <p>실시간 알림을 브라우저에서 받습니다</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={formData.push_notifications}
                    onChange={e => setFormData(prev => ({ ...prev, push_notifications: e.target.checked }))}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleIcon}>📊</span>
                  <div>
                    <h3>주간 리포트</h3>
                    <p>매주 프로젝트 요약 리포트를 받습니다</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={formData.weekly_report}
                    onChange={e => setFormData(prev => ({ ...prev, weekly_report: e.target.checked }))}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.toggleItem}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleIcon}>⚠️</span>
                  <div>
                    <h3>리스크 알림</h3>
                    <p>고위험 프로젝트 감지 시 알림을 받습니다</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={formData.risk_alerts}
                    onChange={e => setFormData(prev => ({ ...prev, risk_alerts: e.target.checked }))}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Theme Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>테마</h2>
          <div className={styles.card}>
            <div className={styles.themeOptions}>
              <button
                className={`${styles.themeBtn} ${formData.theme === 'light' ? styles.active : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, theme: 'light' }))}
              >
                <span>☀️</span>
                <span>라이트</span>
              </button>
              <button
                className={`${styles.themeBtn} ${formData.theme === 'dark' ? styles.active : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, theme: 'dark' }))}
              >
                <span>🌙</span>
                <span>다크</span>
              </button>
              <button
                className={`${styles.themeBtn} ${formData.theme === 'system' ? styles.active : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, theme: 'system' }))}
              >
                <span>💻</span>
                <span>시스템</span>
              </button>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '설정 저장'}
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </main>
    </div>
  )
}
