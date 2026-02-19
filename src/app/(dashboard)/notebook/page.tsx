'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NotebookInsight, NotebookDocType } from '@/lib/ai/notebook-lm'
import styles from './page.module.scss'

interface NotebookEntry {
  id: string
  fileName: string
  docType: NotebookDocType
  insight: NotebookInsight
  userNote?: string
  analyzedAt: string
}

const DOC_TYPE_ICONS: Record<string, string> = {
  contract: '📃', drawing: '📐', photo: '📸',
  report: '📋', estimate: '💰', other: '📄',
}
const DOC_TYPE_LABELS: Record<string, string> = {
  contract: '계약서', drawing: '도면', photo: '현장사진',
  report: '리포트', estimate: '견적서', other: '문서',
}

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/pdf',
  'text/plain', 'text/markdown',
].join(',')

export default function NotebookPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [entries, setEntries] = useState<NotebookEntry[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [userNote, setUserNote] = useState('')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<NotebookEntry | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 마지막 방문 프로젝트 컨텍스트
  useEffect(() => {
    const pid = localStorage.getItem('lastProjectId')
    const pname = localStorage.getItem('lastProjectName')
    if (pid) setCurrentProjectId(pid)
    if (pname) setCurrentProjectName(pname)
  }, [])

  // 이전 분석 기록 로드 (notebooks 테이블이 있으면)
  useEffect(() => {
    const loadHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data && data.length > 0) {
        const loaded: NotebookEntry[] = data.map((row: any) => ({
          id: row.id,
          fileName: row.file_name,
          docType: row.doc_type as NotebookDocType,
          userNote: row.user_note,
          analyzedAt: row.created_at,
          insight: {
            summary: row.summary ?? '',
            keyFindings: row.key_findings ?? [],
            riskFlags: row.risk_flags ?? [],
            actionItems: row.action_items ?? [],
            documentType: row.doc_type,
            confidence: row.confidence ?? 0,
            model: row.model ?? 'gemini',
            analyzedAt: row.created_at,
          },
        }))
        setEntries(loaded)
      }
    }
    loadHistory().catch(() => {})
  }, [])

  const analyzeFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('파일 크기가 10MB를 초과합니다.')
      return
    }

    setAnalyzing(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (userNote.trim()) formData.append('userNote', userNote.trim())
      if (currentProjectId) formData.append('projectId', currentProjectId)

      const res = await fetch('/api/ai/notebook', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `분석 오류 (${res.status})`)
      }

      const insight: NotebookInsight = await res.json()

      const newEntry: NotebookEntry = {
        id: `local-${Date.now()}`,
        fileName: file.name,
        docType: insight.documentType,
        userNote: userNote.trim() || undefined,
        analyzedAt: insight.analyzedAt,
        insight,
      }

      // DB 저장 시도 (실패해도 로컬 상태 유지)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: saved } = await supabase
          .from('notebooks')
          .insert({
            user_id: user.id,
            project_id: currentProjectId ?? null,
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            doc_type: insight.documentType,
            user_note: userNote.trim() || null,
            summary: insight.summary,
            key_findings: insight.keyFindings,
            risk_flags: insight.riskFlags,
            action_items: insight.actionItems,
            confidence: insight.confidence,
            model: insight.model,
          })
          .select('id')
          .single()
        if (saved?.id) newEntry.id = saved.id
      }

      setEntries(prev => [newEntry, ...prev])
      setSelectedEntry(newEntry)
      setUserNote('')
    } catch (err: any) {
      setErrorMsg(err?.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    analyzeFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>📒 AI 노트북</h1>
          <p className={styles.subtitle}>계약서, 도면, 사진을 올리면 AI가 핵심을 분석해드려요</p>
        </div>
        {currentProjectName && (
          <span className={styles.projectContext}>
            📌 {currentProjectName} 컨텍스트
          </span>
        )}
      </header>

      <div className={styles.layout}>
        {/* 왼쪽: 업로드 + 기록 */}
        <div className={styles.leftPanel}>
          {/* 파일 업로드 영역 */}
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''} ${analyzing ? styles.dropZoneLoading : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !analyzing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className={styles.fileInput}
              onChange={e => handleFileSelect(e.target.files)}
            />

            {analyzing ? (
              <div className={styles.analyzingState}>
                <div className={styles.spinner} />
                <p>AI가 문서를 분석 중이에요...</p>
                <span>Gemini 2.5 Flash 모델 사용</span>
              </div>
            ) : (
              <div className={styles.uploadState}>
                <span className={styles.uploadIcon}>📄</span>
                <p>파일을 드래그하거나 클릭하여 업로드</p>
                <span>JPG, PNG, PDF, TXT · 최대 10MB</span>
              </div>
            )}
          </div>

          {/* 메모 입력 */}
          <div className={styles.noteArea}>
            <textarea
              className={styles.noteInput}
              value={userNote}
              onChange={e => setUserNote(e.target.value)}
              placeholder="분석할 때 참고할 메모 (선택): 예) 이 계약서에서 하자 조항을 중점으로 봐줘"
              rows={2}
              disabled={analyzing}
            />
          </div>

          {/* 오류 메시지 */}
          {errorMsg && (
            <div className={styles.errorMsg}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 분석 기록 목록 */}
          {entries.length > 0 && (
            <div className={styles.historySection}>
              <h3 className={styles.historyTitle}>분석 기록</h3>
              <ul className={styles.historyList}>
                {entries.map(entry => (
                  <li
                    key={entry.id}
                    className={`${styles.historyItem} ${selectedEntry?.id === entry.id ? styles.historyItemActive : ''}`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <span className={styles.historyIcon}>{DOC_TYPE_ICONS[entry.docType] || '📄'}</span>
                    <div className={styles.historyInfo}>
                      <span className={styles.historyFileName}>{entry.fileName}</span>
                      <span className={styles.historyMeta}>
                        {DOC_TYPE_LABELS[entry.docType]}
                        {' · '}
                        {new Date(entry.analyzedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {entry.insight.riskFlags.length > 0 && (
                      <span className={styles.riskIndicator}>⚠️</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 빈 상태 */}
          {entries.length === 0 && !analyzing && (
            <div className={styles.emptyState}>
              <span>📂</span>
              <p>아직 분석한 문서가 없어요</p>
              <span>계약서, 도면, 현장사진을 올려보세요</span>
            </div>
          )}
        </div>

        {/* 오른쪽: 분석 결과 */}
        <div className={styles.rightPanel}>
          {selectedEntry ? (
            <div className={styles.insightCard}>
              {/* 문서 정보 */}
              <div className={styles.insightHeader}>
                <span className={styles.insightDocIcon}>{DOC_TYPE_ICONS[selectedEntry.docType]}</span>
                <div>
                  <h2 className={styles.insightFileName}>{selectedEntry.fileName}</h2>
                  <span className={styles.insightType}>{DOC_TYPE_LABELS[selectedEntry.docType]}</span>
                  <span className={styles.insightModel}>
                    {selectedEntry.insight.model === 'gemini' ? '🟢 Gemini' : '🟣 Claude'}
                  </span>
                </div>
              </div>

              {/* 요약 */}
              <div className={styles.insightSection}>
                <h3 className={styles.insightSectionTitle}>📌 한줄 요약</h3>
                <p className={styles.insightSummary}>{selectedEntry.insight.summary}</p>
              </div>

              {/* 핵심 발견 */}
              {selectedEntry.insight.keyFindings.length > 0 && (
                <div className={styles.insightSection}>
                  <h3 className={styles.insightSectionTitle}>🔍 핵심 발견사항</h3>
                  <ul className={styles.insightList}>
                    {selectedEntry.insight.keyFindings.map((f, i) => (
                      <li key={i} className={styles.insightListItem}>
                        <span className={styles.bulletGreen}>●</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 리스크 플래그 */}
              {selectedEntry.insight.riskFlags.length > 0 && (
                <div className={`${styles.insightSection} ${styles.riskSection}`}>
                  <h3 className={styles.insightSectionTitle}>⚠️ 리스크 플래그</h3>
                  <ul className={styles.insightList}>
                    {selectedEntry.insight.riskFlags.map((r, i) => (
                      <li key={i} className={styles.insightListItem}>
                        <span className={styles.bulletRed}>●</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 액션 아이템 */}
              {selectedEntry.insight.actionItems.length > 0 && (
                <div className={`${styles.insightSection} ${styles.actionSection}`}>
                  <h3 className={styles.insightSectionTitle}>✅ 즉시 조치사항</h3>
                  <ul className={styles.insightList}>
                    {selectedEntry.insight.actionItems.map((a, i) => (
                      <li key={i} className={styles.insightListItem}>
                        <span className={styles.bulletBlue}>●</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 신뢰도 */}
              <div className={styles.confidenceBar}>
                <span className={styles.confidenceLabel}>분석 신뢰도</span>
                <div className={styles.confidenceTrack}>
                  <div
                    className={styles.confidenceFill}
                    style={{ width: `${Math.round(selectedEntry.insight.confidence * 100)}%` }}
                  />
                </div>
                <span className={styles.confidenceValue}>
                  {Math.round(selectedEntry.insight.confidence * 100)}%
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.rightEmpty}>
              <span>🔬</span>
              <p>파일을 업로드하면 분석 결과가 여기에 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
