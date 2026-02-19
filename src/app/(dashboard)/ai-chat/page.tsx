'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PERSONA_LIST, type PersonaMeta } from '@/lib/ai/personas'
import type { UserPersona } from '@/lib/ai/brain'
import styles from './page.module.scss'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: { title: string }[]
  model?: string
}

interface ProjectInfo {
  id: string
  name: string
  client_name: string
  status: string
  risk_score: number
  progress: number
}

// 프로젝트 상태에 따른 맥락 질문
const getProjectQuickTopics = (project: ProjectInfo): string[] => {
  const topics: string[] = []
  if ((project.risk_score ?? 0) >= 60) {
    topics.push(`${project.name} 리스크 점수 ${project.risk_score}점, 어떻게 낮춰야 할까요?`)
  }
  if ((project.progress ?? 0) < 30) {
    topics.push(`${project.name} 공정 시작 단계에서 무엇을 먼저 해야 하나요?`)
  }
  topics.push(`${project.name} 현장에서 지금 당장 확인해야 할 사항은?`)
  topics.push(`${project.name} 고객에게 진행 상황을 어떻게 보고할까요?`)
  return topics.slice(0, 4)
}

export default function AiChatPage() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  // searchParams에서 persona와 projectId 읽기
  const initialPersona = (searchParams.get('persona') as UserPersona) || 'customer'
  const queryProjectId = searchParams.get('projectId')

  const [selectedPersona, setSelectedPersona] = useState<UserPersona>(initialPersona)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPersonaSelect, setShowPersonaSelect] = useState(true)

  // 프로젝트 컨텍스트
  const [contextProjectId, setContextProjectId] = useState<string | null>(null)
  const [contextProject, setContextProject] = useState<ProjectInfo | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [contextDismissed, setContextDismissed] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const persona = PERSONA_LIST.find(p => p.id === selectedPersona)!

  // 프로젝트 컨텍스트 초기화 (쿼리파라미터 > localStorage)
  useEffect(() => {
    const pid = queryProjectId || localStorage.getItem('lastProjectId')
    if (!pid) return

    setContextProjectId(pid)
    setContextLoading(true)

    supabase
      .from('projects')
      .select('id, name, client_name, status, risk_score, progress')
      .eq('id', pid)
      .single()
      .then(({ data }) => {
        if (data) setContextProject(data)
      })
      .catch(() => {})
      .finally(() => setContextLoading(false))
  }, [queryProjectId])

  // 페르소나 변경 시 인사말 초기화
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: persona.greeting,
    }])
  }, [selectedPersona])

  // 새 메시지 시 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handlePersonaSelect = (p: PersonaMeta) => {
    setSelectedPersona(p.id)
    setShowPersonaSelect(false)
  }

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          persona: selectedPersona,
          projectId: contextDismissed ? undefined : contextProjectId,
          history,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `서버 오류 (${res.status})`)
      }

      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        sources: data.sources?.length ? data.sources : undefined,
        model: data.model,
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `죄송해요, 오류가 발생했어요. (${err?.message})`,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 현재 컨텍스트에서 보여줄 추천 질문
  const suggestedTopics = contextProject && !contextDismissed
    ? getProjectQuickTopics(contextProject)
    : persona.topics

  const statusLabel: Record<string, string> = {
    planning: '기획', in_progress: '진행중', review: '검토', completed: '완료'
  }

  return (
    <div className={styles.page}>
      {/* 사이드바: 역할 선택 */}
      <aside className={`${styles.sidebar} ${showPersonaSelect ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2>역할 선택</h2>
          <button
            className={styles.sidebarClose}
            onClick={() => setShowPersonaSelect(false)}
          >
            ✕
          </button>
        </div>

        <div className={styles.personaList}>
          {PERSONA_LIST.map(p => (
            <button
              key={p.id}
              className={`${styles.personaCard} ${selectedPersona === p.id ? styles.personaCardActive : ''}`}
              onClick={() => handlePersonaSelect(p)}
              style={{ '--persona-color': p.color } as React.CSSProperties}
            >
              <span className={styles.personaIcon}>{p.icon}</span>
              <div className={styles.personaInfo}>
                <span className={styles.personaName}>{p.name}</span>
                <span className={styles.personaDesc}>{p.description}</span>
              </div>
              {selectedPersona === p.id && (
                <span className={styles.personaCheck}>✓</span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* 채팅 메인 */}
      <div className={styles.chatArea}>
        {/* 헤더 */}
        <div
          className={styles.chatHeader}
          style={{ '--persona-color': persona.color } as React.CSSProperties}
        >
          <button
            className={styles.personaToggle}
            onClick={() => setShowPersonaSelect(v => !v)}
            title="역할 변경"
          >
            <span className={styles.currentPersonaIcon}>{persona.icon}</span>
            <span className={styles.currentPersonaName}>{persona.name} 모드</span>
            <span className={styles.chevron}>▾</span>
          </button>

          <button
            className={styles.clearBtn}
            onClick={() => setMessages([{ role: 'assistant', content: persona.greeting }])}
            title="대화 초기화"
          >
            새 대화
          </button>
        </div>

        {/* 프로젝트 컨텍스트 배너 */}
        {contextProject && !contextDismissed && (
          <div className={styles.contextBanner}>
            <span className={styles.contextIcon}>📌</span>
            <div className={styles.contextInfo}>
              <span className={styles.contextLabel}>현재 프로젝트 컨텍스트</span>
              <span className={styles.contextName}>
                {contextProject.name}
                <span className={styles.contextMeta}>
                  {statusLabel[contextProject.status] ?? contextProject.status}
                  {' · '}리스크 {contextProject.risk_score ?? 0}점
                  {' · '}진행률 {contextProject.progress ?? 0}%
                </span>
              </span>
            </div>
            <button
              className={styles.contextDismiss}
              onClick={() => setContextDismissed(true)}
              title="컨텍스트 해제"
            >
              ✕
            </button>
          </div>
        )}

        {/* 추천 질문 (메시지가 인사말 하나뿐일 때) */}
        {messages.length <= 1 && (
          <div className={styles.suggestionsArea}>
            <p className={styles.suggestionsLabel}>
              {contextProject && !contextDismissed ? `📎 ${contextProject.name} 관련 질문` : '자주 묻는 질문'}
            </p>
            <div className={styles.suggestions}>
              {suggestedTopics.map((topic, i) => (
                <button
                  key={i}
                  className={styles.suggestionChip}
                  onClick={() => handleSend(topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        <div className={styles.messages}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className={styles.avatar}
                  style={{ '--persona-color': persona.color } as React.CSSProperties}
                >
                  {persona.icon}
                </div>
              )}

              <div className={styles.bubble}>
                <div className={styles.bubbleContent}>
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>

                {/* 출처 뱃지 */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className={styles.sources}>
                    <span className={styles.sourcesLabel}>참고 법령·기준</span>
                    {msg.sources.map((s, si) => (
                      <span key={si} className={styles.sourceBadge}>{s.title}</span>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className={styles.userAvatar}>나</div>
              )}
            </div>
          ))}

          {/* 로딩 버블 */}
          {loading && (
            <div className={`${styles.message} ${styles.assistantMsg}`}>
              <div
                className={styles.avatar}
                style={{ '--persona-color': persona.color } as React.CSSProperties}
              >
                {persona.icon}
              </div>
              <div className={styles.bubble}>
                <div className={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className={styles.inputArea}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${persona.name} 모드로 질문하세요... (Enter로 전송, Shift+Enter 줄바꿈)`}
            rows={2}
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{ '--persona-color': persona.color } as React.CSSProperties}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  )
}
