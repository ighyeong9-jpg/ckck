'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

// ─── 타입 ─────────────────────────────────────────────────

interface WarrantyRecord {
  id: string
  project_id: string | null
  process_name: string
  completed_date: string
  warranty_period_months: number
  warranty_expires_date: string | null
  reminder_sent_30d: boolean
  reminder_sent_7d: boolean
  created_at: string
  // 조인된 프로젝트명 (별도 fetch)
  project_name?: string
}

type WarrantyStatus = '정상' | '만료임박' | '만료'

// 공종별 법정 기간 (건산법 시행령 별표4)
const PROCESS_WARRANTY: Record<string, number> = {
  '방수': 36,
  '타일': 12,
  '도장': 12,
  '전기': 24,
  '설비': 24,
  '목공': 12,
  '창호': 24,
  '바닥재': 12,
  '석재': 24,
  '철근콘크리트': 60,
  '조적': 36,
  '방음': 24,
}

const PROCESS_OPTIONS = Object.entries(PROCESS_WARRANTY).map(([name, months]) => ({ name, months }))

function getStatus(expiresDate: string | null): WarrantyStatus {
  if (!expiresDate) return '정상'
  const now = Date.now()
  const expires = new Date(expiresDate).getTime()
  const diffDays = Math.floor((expires - now) / 86400000)
  if (diffDays < 0) return '만료'
  if (diffDays <= 30) return '만료임박'
  return '정상'
}

function getDaysLeft(expiresDate: string | null): number | null {
  if (!expiresDate) return null
  const now = Date.now()
  const expires = new Date(expiresDate).getTime()
  return Math.floor((expires - now) / 86400000)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────

export default function WarrantyPage() {
  const supabase = createClient()
  const [records, setRecords] = useState<WarrantyRecord[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // 폼 상태
  const [form, setForm] = useState({
    project_id: '',
    process_name: '',
    completed_date: new Date().toISOString().split('T')[0],
    warranty_period_months: 12,
  })

  const loadData = useCallback(async () => {
    const [{ data: wData }, { data: pData }] = await Promise.all([
      supabase
        .from('warranty_tracking')
        .select('*')
        .order('warranty_expires_date', { ascending: true }),
      supabase
        .from('projects')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (pData) setProjects(pData)
    if (wData) {
      const projectMap = Object.fromEntries((pData ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))
      setRecords((wData as WarrantyRecord[]).map((r: WarrantyRecord) => ({
        ...r,
        project_name: r.project_id ? projectMap[r.project_id] : undefined,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleProcessChange = (name: string) => {
    const months = PROCESS_WARRANTY[name] ?? 12
    setForm(prev => ({ ...prev, process_name: name, warranty_period_months: months }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('warranty_tracking')
      .insert({
        project_id: form.project_id || null,
        process_name: form.process_name,
        completed_date: form.completed_date,
        warranty_period_months: form.warranty_period_months,
      })
    if (!error) {
      setShowForm(false)
      setForm({
        project_id: '',
        process_name: '',
        completed_date: new Date().toISOString().split('T')[0],
        warranty_period_months: 12,
      })
      loadData()
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('warranty_tracking').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  // 통계
  const expiredCount = records.filter(r => getStatus(r.warranty_expires_date) === '만료').length
  const soonCount = records.filter(r => getStatus(r.warranty_expires_date) === '만료임박').length
  const normalCount = records.filter(r => getStatus(r.warranty_expires_date) === '정상').length

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>하자담보 현황 확인</h1>
          <p className={styles.subtitle}>건산법 시행령 별표4 기준 — 공종별 하자담보기간 자동 현황 확인</p>
        </div>
        <button className={styles.newBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ 닫기' : '+ 공종 등록'}
        </button>
      </div>

      {/* 통계 */}
      <div className={styles.stats}>
        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <span className={styles.statNum}>{expiredCount}</span>
          <span className={styles.statLabel}>만료</span>
        </div>
        <div className={`${styles.statCard} ${soonCount > 0 ? styles.statWarn : ''}`}>
          <span className={styles.statNum}>{soonCount}</span>
          <span className={styles.statLabel}>D-30 이내</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{normalCount}</span>
          <span className={styles.statLabel}>정상</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{records.length}</span>
          <span className={styles.statLabel}>전체</span>
        </div>
      </div>

      {/* 만료임박 경고 배너 */}
      {soonCount > 0 && (
        <div className={styles.alertBanner}>
          <span className={styles.alertIcon}>⚠️</span>
          <div>
            <strong>{soonCount}개 공종</strong>의 하자담보기간이 30일 이내 만료됩니다.
            <span> 만료 전 하자 점검을 실시하고 증빙을 보존하세요.</span>
          </div>
        </div>
      )}

      {/* 등록 폼 */}
      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>공종 하자담보 등록</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>현장 (선택)</label>
              <select
                value={form.project_id}
                onChange={e => setForm(prev => ({ ...prev, project_id: e.target.value }))}
              >
                <option value="">현장 선택 안 함</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>공종 *</label>
              <select
                value={form.process_name}
                onChange={e => handleProcessChange(e.target.value)}
                required
              >
                <option value="">공종 선택</option>
                {PROCESS_OPTIONS.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.months}개월)
                  </option>
                ))}
                <option value="기타">기타</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>완료일 *</label>
              <input
                type="date"
                value={form.completed_date}
                onChange={e => setForm(prev => ({ ...prev, completed_date: e.target.value }))}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>담보기간 (개월) *</label>
              <input
                type="number"
                min="1"
                max="120"
                value={form.warranty_period_months}
                onChange={e => setForm(prev => ({ ...prev, warranty_period_months: Number(e.target.value) }))}
                required
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn}>등록</button>
            <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>취소</button>
          </div>
        </form>
      )}

      {/* 목록 */}
      {loading ? (
        <div className={styles.loading}>불러오는 중...</div>
      ) : records.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🛡️</div>
          <p className={styles.emptyTitle}>등록된 하자담보 기록이 없어요</p>
          <p className={styles.emptyDesc}>공사 완료 후 공종별 담보기간을 등록하면 만료 전 자동 알림을 받을 수 있어요</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>공종</th>
                <th>현장</th>
                <th>완료일</th>
                <th>담보기간</th>
                <th>만료일</th>
                <th>상태</th>
                <th>남은 일수</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const status = getStatus(r.warranty_expires_date)
                const daysLeft = getDaysLeft(r.warranty_expires_date)
                return (
                  <tr key={r.id} className={styles[`row_${status === '만료임박' ? 'warn' : status === '만료' ? 'danger' : 'normal'}`]}>
                    <td className={styles.processName}>{r.process_name}</td>
                    <td className={styles.projectName}>{r.project_name ?? <span className={styles.noProject}>미지정</span>}</td>
                    <td>{formatDate(r.completed_date)}</td>
                    <td>{r.warranty_period_months}개월</td>
                    <td>{r.warranty_expires_date ? formatDate(r.warranty_expires_date) : '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status_${status === '만료임박' ? 'warn' : status === '만료' ? 'danger' : 'ok'}`]}`}>
                        {status === '만료임박' ? '⚠️ 만료임박' : status === '만료' ? '❌ 만료' : '✅ 정상'}
                      </span>
                    </td>
                    <td className={styles.daysLeft}>
                      {daysLeft === null ? '-' : daysLeft < 0 ? `만료 ${Math.abs(daysLeft)}일 경과` : daysLeft <= 7 ? <strong className={styles.urgent}>D-{daysLeft}</strong> : daysLeft <= 30 ? <span className={styles.warning}>D-{daysLeft}</span> : `D-${daysLeft}`}
                    </td>
                    <td>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(r.id)}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 법령 안내 */}
      <div className={styles.lawNote}>
        <p className={styles.lawTitle}>⚖️ 건설산업기본법 시행령 별표4 — 하자담보책임기간</p>
        <div className={styles.lawGrid}>
          <div className={styles.lawItem}><span>방수공사</span><strong>3년 (36개월)</strong></div>
          <div className={styles.lawItem}><span>타일·석재</span><strong>1~2년</strong></div>
          <div className={styles.lawItem}><span>전기·설비</span><strong>2년 (24개월)</strong></div>
          <div className={styles.lawItem}><span>도장·목공</span><strong>1년 (12개월)</strong></div>
          <div className={styles.lawItem}><span>철근콘크리트</span><strong>5년 (60개월)</strong></div>
          <div className={styles.lawItem}><span>창호</span><strong>2년 (24개월)</strong></div>
        </div>
      </div>
    </div>
  )
}
