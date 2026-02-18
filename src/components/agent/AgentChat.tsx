'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import styles from './AgentChat.module.scss'

interface Message {
  role: 'user' | 'ai'
  content: string
  tool?: string
  toolSuccess?: boolean
}

interface SuggestionChip {
  label: string
  message: string
  icon: string
}

const PAGE_SUGGESTIONS: Record<string, SuggestionChip[]> = {
  '/projects': [
    { icon: '🏗️', label: '프로젝트 생성', message: '카페 20평 프로젝트 만들어줘' },
    { icon: '📊', label: '현황 요약', message: '전체 프로젝트 현황 알려줘' },
  ],
  '/dashboard': [
    { icon: '📈', label: '리스크 분석', message: '전체 리스크 현황 분석해줘' },
    { icon: '📋', label: '오늘 할일', message: '오늘 해야 할 작업 알려줘' },
  ],
  'diagnostic': [
    { icon: '🔍', label: '리스크 분석', message: '리스크 분석해줘' },
    { icon: '📋', label: '체크리스트 점검', message: '체크리스트 분석해줘' },
  ],
  'sow': [
    { icon: '💰', label: '견적 생성', message: '표준 견적 생성해줘' },
    { icon: '📊', label: '단가 비교', message: '견적 단가 분석해줘' },
  ],
  'cost-analysis': [
    { icon: '💵', label: '적정가 분석', message: '적정가 분석해줘' },
    { icon: '📉', label: '비용 최적화', message: '비용 절감 방안 분석해줘' },
  ],
  'report': [
    { icon: '📄', label: '리포트 생성', message: '리포트 생성해줘' },
    { icon: '📊', label: '요약 보기', message: '프로젝트 요약해줘' },
  ],
  'changes': [
    { icon: '🔄', label: '변경 등록', message: '변경사항 등록해줘' },
    { icon: '📋', label: '변경 이력', message: '변경 이력 분석해줘' },
  ],
  'certificate': [
    { icon: '🤖', label: 'AI 검증', message: 'AI 검증 점수 확인해줘' },
    { icon: '📜', label: '인증서 발급', message: '인증서 발급해줘' },
  ],
}

export default function AgentChat() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '안녕하세요! 체키입니다 🤖\n무엇을 도와드릴까요?\n\n예시:\n• "카페 20평 프로젝트 만들어줘"\n• "견적 만들어줘"\n• "리스크 분석해줘"' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 현재 프로젝트 ID 추출
  const projectIdMatch = pathname.match(/\/projects\/([^/]+)/)
  const projectId = projectIdMatch ? projectIdMatch[1] : undefined

  // 현재 페이지에 맞는 추천 칩 결정
  const suggestions = useMemo(() => {
    // Check project sub-pages first
    if (projectId) {
      const subPage = pathname.split('/').pop() || ''
      if (PAGE_SUGGESTIONS[subPage]) return PAGE_SUGGESTIONS[subPage]
    }
    // Check main pages
    if (pathname.startsWith('/projects') && !projectId) return PAGE_SUGGESTIONS['/projects']
    if (pathname.startsWith('/dashboard')) return PAGE_SUGGESTIONS['/dashboard']
    // Default suggestions
    return [
      { icon: '🏗️', label: '프로젝트 생성', message: '프로젝트 만들어줘' },
      { icon: '❓', label: '도움말', message: '무엇을 할 수 있어?' },
    ]
  }, [pathname, projectId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (msgText?: string) => {
    const userMsg = (msgText || input).trim()
    if (!userMsg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMsg }],
          projectId,
          pageContext: pathname,
        }),
      })

      const data = await res.json()

      if (data.tool && data.tool !== 'help' && data.tool !== 'error' && data.toolSuccess) {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: '',
          tool: data.tool,
          toolSuccess: data.toolSuccess,
        }])
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        content: data.message || '응답을 받지 못했습니다.',
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '⚠️ 서버 연결에 실패했습니다. 다시 시도해주세요.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleChipClick = (chip: SuggestionChip) => {
    sendMessage(chip.message)
  }

  const toolLabels: Record<string, string> = {
    project_setup: '프로젝트 생성 완료',
    checklist_analyze: '진단 분석 완료',
    quote_generate: '견적서 생성 완료',
    cost_analyze: '비용 분석 완료',
    risk_calculate: '리스크 분석 완료',
    change_record: '변경 등록 완료',
    evidence_package: '증빙 패키지 조회',
    agreement_create: '합의서 생성 완료',
    report_generate: '리포트 생성 완료',
    schedule_check: '일정 점검 완료',
    verify_score: 'AI 검증 완료',
    get_project_summary: '현황 조회 완료',
  }

  return (
    <>
      {/* Floating Button */}
      <button
        className={`${styles.floatingBtn} ${open ? styles.hasPanel : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="AI 비서 체키"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <span className={styles.headerIcon}>🤖</span>
              체키 AI 비서
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className={styles.messages}>
            {messages.map((msg, i) => {
              if (msg.tool && msg.toolSuccess) {
                return (
                  <div key={i} className={styles.toolCard}>
                    <span className={styles.toolIcon}>⚡</span>
                    {toolLabels[msg.tool] || msg.tool}
                  </div>
                )
              }
              return (
                <div
                  key={i}
                  className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.aiMsg}`}
                >
                  {msg.content}
                </div>
              )
            })}
            {loading && (
              <div className={styles.loading}>
                체키가 분석 중
                <span className={styles.dots}>
                  <span /><span /><span />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div className={styles.suggestionsArea}>
            {suggestions.map((chip, i) => (
              <button
                key={i}
                className={styles.suggestionChip}
                onClick={() => handleChipClick(chip)}
                disabled={loading}
              >
                <span>{chip.icon}</span>
                {chip.label}
              </button>
            ))}
          </div>

          <div className={styles.inputArea}>
            <input
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="체키에게 물어보세요..."
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </>
  )
}
