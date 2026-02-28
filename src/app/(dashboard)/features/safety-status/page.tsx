'use client'

import { useState } from 'react'
import { SAFETY_LEVELS } from '@/types/safety-levels'
import type { SafetyLevel } from '@/types/safety-levels'
import { getDemoChecks, performSafetyJudgment } from '@/lib/go-no-go/checker'
import type { RegulationCheck, SafetyJudgment } from '@/lib/go-no-go/checker'

const DEMO_PROJECTS = [
  { id: '1', name: '강남 카페 인테리어' },
  { id: '2', name: '홍대 음식점 리모델링' },
  { id: '3', name: '판교 사무실 공사' },
]

export default function SafetyStatusPage() {
  const [selectedProject, setSelectedProject] = useState('1')
  const [judgment, setJudgment] = useState<SafetyJudgment | null>(null)
  const [checks, setChecks] = useState<RegulationCheck[]>([])

  const handleJudge = () => {
    const projectChecks = getDemoChecks(selectedProject)
    setChecks(projectChecks)
    setJudgment(performSafetyJudgment(projectChecks))
  }

  const handleToggleCheck = (id: string) => {
    const updated = checks.map(c =>
      c.id === id ? { ...c, isMet: !c.isMet, note: !c.isMet ? undefined : '보완 필요' } : c
    )
    setChecks(updated)
    setJudgment(performSafetyJudgment(updated))
  }

  const levelInfo = judgment ? SAFETY_LEVELS[judgment.level] : null

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <a href="/dashboard" style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.875rem' }}>← 대시보드</a>

      <h1 style={{ fontSize: '2rem', marginTop: '1rem', marginBottom: '0.5rem' }}>⚡ 안전 현황</h1>
      <p style={{ color: '#64748B', marginBottom: '2rem' }}>
        12개 법규 기반 현장 안전 상태 자동 확인
      </p>

      {/* 프로젝트 선택 */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#0f172a', fontSize: '1rem', flex: 1 }}
        >
          {DEMO_PROJECTS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={handleJudge}
          style={{ padding: '0.75rem 2rem', background: '#2563EB', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          확인 실행
        </button>
      </div>

      {/* 확인 결과 */}
      {judgment && levelInfo && (
        <>
          <div style={{
            background: levelInfo.bg,
            border: `2px solid ${levelInfo.color}`,
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{levelInfo.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: levelInfo.color, marginBottom: '0.25rem' }}>
              {levelInfo.label}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748B' }}>
              충족률 {judgment.score}% ({judgment.passedChecks}/{judgment.totalChecks}개 충족)
            </div>

            {/* 4단계 게이지 바 */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '1.5rem', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
              {(['danger', 'warning', 'caution', 'safe'] as SafetyLevel[]).map(l => {
                const info = SAFETY_LEVELS[l]
                const isActive = judgment.level === l
                return (
                  <div key={l} style={{
                    flex: 1,
                    background: isActive ? info.color : info.color + '30',
                    transition: 'all 0.3s',
                    position: 'relative',
                  }}>
                    {isActive && (
                      <div style={{
                        position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)',
                        fontSize: '0.625rem', fontWeight: 700, color: info.color, whiteSpace: 'nowrap',
                      }}>
                        {info.label}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.625rem', color: '#94A3B8' }}>
              <span>위험</span>
              <span>경고</span>
              <span>주의</span>
              <span>정상</span>
            </div>
          </div>

          {/* 12개 법규 현황 */}
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>법규별 확인 현황</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {checks.map((check) => {
              const checkLevel: SafetyLevel = check.isMet ? 'safe' : 'danger'
              const checkInfo = SAFETY_LEVELS[checkLevel]

              return (
                <div
                  key={check.id}
                  onClick={() => handleToggleCheck(check.id)}
                  style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer',
                    borderLeft: `4px solid ${checkInfo.color}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{check.isMet ? '🟢' : '🔴'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', background: '#E2E8F0', padding: '0.125rem 0.5rem', borderRadius: '4px', color: '#64748B' }}>
                        {check.category}
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                        {check.law}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                      {check.description}
                    </div>
                  </div>
                  <span style={{
                    background: checkInfo.bg,
                    color: checkInfo.color,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    {check.isMet ? '충족' : '보완 필요'}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 초기 상태 */}
      {!judgment && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>프로젝트를 선택하고 확인을 실행하세요</h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
            12개 법규 기반으로 현장 안전 상태를 자동으로 확인합니다
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem' }}>
            {(['safe', 'caution', 'warning', 'danger'] as SafetyLevel[]).map(l => {
              const info = SAFETY_LEVELS[l]
              return (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{info.icon}</div>
                  <div style={{ fontSize: '0.75rem', color: info.color, fontWeight: 600 }}>{info.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
