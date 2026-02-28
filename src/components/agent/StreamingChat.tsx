'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import styles from './StreamingChat.module.scss'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface StreamingChatProps {
  projectId?: string
  placeholder?: string
  className?: string
}

export default function StreamingChat({ projectId, placeholder, className }: StreamingChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])

    // 빈 assistant 메시지 추가 (스트리밍 중)
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])
    setIsStreaming(true)

    abortRef.current = new AbortController()

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, projectId, history }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('스트리밍 실패')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break

          try {
            const parsed = JSON.parse(raw) as { delta?: string; error?: string }
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.delta) {
              accumulated += parsed.delta
              const current = accumulated
              setMessages(prev => {
                const next = [...prev]
                const lastIdx = next.length - 1
                if (next[lastIdx]?.role === 'assistant') {
                  next[lastIdx] = { ...next[lastIdx], content: current, streaming: true }
                }
                return next
              })
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }

      // 스트리밍 완료 — streaming 플래그 제거
      setMessages(prev => {
        const next = [...prev]
        const lastIdx = next.length - 1
        if (next[lastIdx]?.role === 'assistant') {
          next[lastIdx] = { ...next[lastIdx], streaming: false }
        }
        return next
      })
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return
      setMessages(prev => {
        const next = [...prev]
        const lastIdx = next.length - 1
        if (next[lastIdx]?.role === 'assistant' && next[lastIdx].streaming) {
          next[lastIdx] = { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.', streaming: false }
        }
        return next
      })
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, projectId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setMessages(prev => {
      const next = [...prev]
      const lastIdx = next.length - 1
      if (next[lastIdx]?.streaming) {
        next[lastIdx] = { ...next[lastIdx], streaming: false }
      }
      return next
    })
  }

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      <div className={styles.messageList}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span>🤖</span>
            <p>체키 AI와 대화를 시작하세요</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            {msg.role === 'assistant' && <span className={styles.avatar}>🤖</span>}
            <div className={styles.bubble}>
              <span className={styles.text}>{msg.content}</span>
              {msg.streaming && <span className={styles.cursor}>|</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? '메시지를 입력하세요... (Shift+Enter: 줄바꿈)'}
          rows={2}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button type="button" className={styles.stopBtn} onClick={handleStop}>
            ⏹ 중지
          </button>
        ) : (
          <button type="button" className={styles.sendBtn} onClick={handleSend} disabled={!input.trim()}>
            전송
          </button>
        )}
      </div>
    </div>
  )
}
