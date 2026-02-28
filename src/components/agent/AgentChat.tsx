'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import styles from './AgentChat.module.scss'

interface Message {
  role: 'user' | 'ai'
  content: string
  tool?: string
  toolSuccess?: boolean
  imageUrl?: string
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
    { icon: '💰', label: '가견적', message: '카페 20평 견적 뽑아줘' },
  ],
  '/dashboard': [
    { icon: '📈', label: '리스크 분석', message: '전체 리스크 현황 분석해줘' },
    { icon: '📋', label: '오늘 할일', message: '오늘 해야 할 작업 알려줘' },
    { icon: '📊', label: '통계 요약', message: '대시보드 요약해줘' },
  ],
  'diagnostic': [
    { icon: '🔍', label: '리스크 진단', message: '전체 리스크 종합 진단해줘' },
    { icon: '📋', label: '체크리스트 분석', message: '체크리스트 분석해줘' },
    { icon: '⚠️', label: '안전 점검', message: '안전 리스크 분석해줘' },
  ],
  'sow': [
    { icon: '💰', label: 'AI 자동 견적', message: '표준 견적 자동으로 생성해줘' },
    { icon: '📊', label: '등급별 비교', message: '이코노미/스탠다드/프리미엄 견적 비교해줘' },
    { icon: '📄', label: 'PDF 내보내기', message: '견적서 PDF로 내보내줘' },
  ],
  'cost-analysis': [
    { icon: '💵', label: '적정가 분석', message: '비용 적정성 분석해줘' },
    { icon: '📉', label: '비용 예측', message: '비용 예측해줘' },
    { icon: '📊', label: '예산 대비', message: '예산 대비 실제 지출 비교해줘' },
  ],
  'report': [
    { icon: '📄', label: '일일보고서', message: '오늘 일일보고서 자동 생성해줘' },
    { icon: '📊', label: '주간보고서', message: '주간보고서 자동 생성해줘' },
    { icon: '📋', label: '최종보고서', message: '최종 보고서 생성해줘' },
  ],
  'changes': [
    { icon: '🔄', label: '변경 등록', message: '변경사항 등록해줘' },
    { icon: '📋', label: '변경 이력', message: '변경 이력 분석해줘' },
  ],
  'certificate': [
    { icon: '🤖', label: 'AI 검증', message: 'AI 검증 점수 확인해줘' },
    { icon: '📜', label: '인증서 발급', message: '인증서 발급해줘' },
  ],
  'process': [
    { icon: '📅', label: 'AI 공정표 생성', message: '공정표 자동으로 만들어줘' },
    { icon: '⏰', label: '지연 감지', message: '지연 공정 확인해줘' },
    { icon: '📊', label: '간트 차트', message: '간트 차트 보여줘' },
  ],
  'workforce': [
    { icon: '👷', label: '인력 현황', message: '인력 현황 알려줘' },
    { icon: '📋', label: '자격증 확인', message: '작업자 자격증 확인해줘' },
    { icon: '💵', label: '노무비 조회', message: '노무비 현황 알려줘' },
  ],
  'materials': [
    { icon: '📦', label: '재고 현황', message: '자재 재고 현황 알려줘' },
    { icon: '💰', label: '자재비 분석', message: '자재비 현황 알려줘' },
    { icon: '🛒', label: '발주 안내', message: '부족한 자재 발주해줘' },
  ],
  'gallery': [
    { icon: '📷', label: '사진 분석', message: '현장 사진 분석해줘' },
    { icon: '🔄', label: '전후 비교', message: '시공 전후 비교해줘' },
  ],
  'defects': [
    { icon: '🔧', label: '하자 등록', message: '새 하자 등록해줘' },
    { icon: '📋', label: '하자 현황', message: '하자 목록 보여줘' },
    { icon: '📊', label: '처리 이력', message: '하자 처리 이력 알려줘' },
  ],
  'evidence-package': [
    { icon: '📁', label: '증빙 현황', message: '증빙 패키지 현황 조회해줘' },
    { icon: '✅', label: '무결성 검증', message: '증빙 무결성 검증해줘' },
  ],
  'agreement': [
    { icon: '🤝', label: '합의서 생성', message: '3자 합의서 생성해줘' },
  ],
}

// 시간대별 체크인 인사말
function getChekiGreeting(): string {
  const hour = new Date().getHours()
  const greetings = [
    { range: [0, 6], msgs: ['늦은 시간까지 수고하세요! 🌙', '야근 중이시군요. 힘내세요! 🌙'] },
    { range: [6, 9], msgs: ['좋은 아침이에요! ☀️', '오늘도 좋은 하루 되세요! 🌅'] },
    { range: [9, 12], msgs: ['활기찬 오전이에요! 💪', '오전 작업 화이팅! ☀️'] },
    { range: [12, 14], msgs: ['점심 맛있게 드세요! 🍚', '잠깐 쉬어가세요! ☕'] },
    { range: [14, 18], msgs: ['오후도 파이팅이에요! 💪', '오후도 순조롭길 바라요! 🌤️'] },
    { range: [18, 21], msgs: ['하루 마무리 잘하세요! 🌆', '오늘도 수고하셨어요! 👏'] },
    { range: [21, 24], msgs: ['편안한 저녁 되세요! 🌙', '오늘도 고생했어요! 🌃'] },
  ]
  const match = greetings.find(g => hour >= g.range[0] && hour < g.range[1])
  const msgs = match?.msgs || greetings[0].msgs
  return msgs[Math.floor(Math.random() * msgs.length)]
}

export default function AgentChat() {
  const pathname = usePathname()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: `${getChekiGreeting()}\n체크인입니다 🤖 무엇을 도와드릴까요?\n\n인테리어는 물론 무엇이든 물어보세요!\n• "카페 20평 견적 알려줘"\n• "리스크 분석해줘"\n• 일반 질문도 OK!` },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 드래그 위치 상태
  const [btnPos, setBtnPos] = useState({ bottom: 24, right: 24 })
  const btnPosRef = useRef({ bottom: 24, right: 24 })
  const dragRef = useRef({
    dragging: false, hasMoved: false,
    startX: 0, startY: 0, startBottom: 24, startRight: 24,
  })

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

  // open/sendMessage의 최신 값을 ref로 유지 (stale closure 방지)
  const openRef = useRef(open)
  useEffect(() => { openRef.current = open }, [open])

  const sendMessageRef = useRef<typeof sendMessage | null>(null)

  // 채팅창 열릴 때 입력창 자동 포커스 (다른 input에 입력 중이면 포커스 도둑질 안 함)
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const active = document.activeElement
        const isOtherInputFocused =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement
        if (!isOtherInputFocused) {
          inputRef.current?.focus()
        }
      }, 100)
    }
  }, [open])

  // Ctrl+K 단축키로 체크인 열기/닫기 (deps 없이 ref로 처리)
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape' && openRef.current) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [])

  // 버튼 위치 localStorage에서 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cheki-btn-pos')
      if (saved) {
        const pos = JSON.parse(saved)
        setBtnPos(pos)
        btnPosRef.current = pos
      }
    } catch {}
  }, [])

  // btnPosRef 동기화
  useEffect(() => { btnPosRef.current = btnPos }, [btnPos])

  // 외부에서 메시지를 보내는 이벤트 리스너 (QuickActions 연동, 안정된 deps)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.message) {
        setOpen(true)
        setTimeout(() => sendMessageRef.current?.(detail.message), 300)
      }
    }
    window.addEventListener('cheki-send', handler)
    return () => window.removeEventListener('cheki-send', handler)
  }, [])

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      toast.warning('이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF, WebP)')
      return
    }

    // 10MB 제한
    if (file.size > 10 * 1024 * 1024) {
      toast.warning('파일 크기는 10MB 이하만 가능합니다.')
      return
    }

    setImageMimeType(file.type)

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setImagePreview(dataUrl)
      // base64 데이터만 추출 (data:image/jpeg;base64, 부분 제거)
      setImageBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)

    // input 초기화 (같은 파일 다시 선택 가능)
    e.target.value = ''
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageBase64(null)
  }

  // 드래그 핸들러
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = {
      dragging: true, hasMoved: false,
      startX: e.clientX, startY: e.clientY,
      startBottom: btnPosRef.current.bottom,
      startRight: btnPosRef.current.right,
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.hasMoved = true
      if (dragRef.current.hasMoved) {
        const newRight = Math.max(8, Math.min(window.innerWidth - 64, dragRef.current.startRight - dx))
        const newBottom = Math.max(8, Math.min(window.innerHeight - 64, dragRef.current.startBottom + dy))
        setBtnPos({ bottom: newBottom, right: newRight })
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (!dragRef.current.hasMoved) {
        setOpen(prev => !prev)
      } else {
        try { localStorage.setItem('cheki-btn-pos', JSON.stringify(btnPosRef.current)) } catch {}
      }
      dragRef.current.dragging = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const sendMessage = useCallback(async (msgText?: string) => {
    const userMsg = (msgText || input).trim()
    if ((!userMsg && !imageBase64) || loading) return

    const currentImage = imagePreview
    const currentBase64 = imageBase64
    const currentMime = imageMimeType

    // 대화 히스토리 캡처 (state 업데이트 전)
    const historyMessages = messages
      .filter(m => m.content)
      .slice(-20)
      .map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        content: m.content,
      }))

    setInput('')
    setImagePreview(null)
    setImageBase64(null)

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMsg || '📷 이미지 분석 요청',
      imageUrl: currentImage || undefined,
    }])
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...historyMessages,
            { role: 'user', content: userMsg || '이 이미지를 분석해줘' },
          ],
          projectId,
          pageContext: pathname,
          ...(currentBase64 && {
            image: {
              base64: currentBase64,
              mimeType: currentMime,
            }
          }),
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
      // 전송 후 입력창 포커스 자동 복원
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, imageBase64, imagePreview, imageMimeType, messages, projectId, pathname, loading])

  // sendMessageRef를 항상 최신 sendMessage로 유지
  useEffect(() => { sendMessageRef.current = sendMessage }, [sendMessage])

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
    estimate: '가견적 생성 완료',
    auto_quote_generate: 'AI 자동 견적 완료',
    auto_quote_compare: '견적 비교 완료',
    auto_schedule_generate: 'AI 공정표 생성 완료',
    auto_report_daily: '일일보고서 생성 완료',
    auto_report_weekly: '주간보고서 생성 완료',
    auto_report_completion: '완료보고서 생성 완료',
    auto_law_check: '법규 체크 완료',
    design_generate: '디자인 컨셉 생성 완료',
    design_layout_suggest: '레이아웃 제안 완료',
    floorplan_generate: '도면 생성 완료',
    floorplan_from_description: '도면 자동 생성 완료',
    risk_full_diagnosis: '종합 리스크 진단 완료',
    certificate_generate: '인증서 발급 완료',
    schedule_gantt: '간트 차트 생성 완료',
    defect_create: '하자 등록 완료',
    worker_add: '작업자 등록 완료',
    material_add: '자재 등록 완료',
    export_pdf: 'PDF 내보내기 완료',
  }

  return (
    <>
      {/* Floating Button */}
      <button
        className={styles.floatingBtn}
        onMouseDown={handleDragStart}
        aria-label="AI 비서 체크인"
        title="체크인 AI 비서 (Ctrl+K) — 드래그로 이동"
        style={{ bottom: btnPos.bottom, right: btnPos.right }}
      >
        {open ? '✕' : '🤖'}
        {!open && <span className={styles.shortcutHint}>Ctrl+K</span>}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className={styles.panel}
          style={{ bottom: btnPos.bottom + 68, right: btnPos.right }}
        >
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <span className={styles.headerIcon}>🤖</span>
              체크인 AI 비서
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
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="업로드 이미지" className={styles.chatImage} />
                  )}
                  {msg.content}
                </div>
              )
            })}
            {loading && (
              <div className={styles.loading}>
                체크인가 분석 중
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

          {/* Image Preview */}
          {imagePreview && (
            <div className={styles.imagePreview}>
              <img src={imagePreview} alt="미리보기" />
              <button className={styles.imageRemove} onClick={removeImage}>✕</button>
              <span className={styles.imageLabel}>📷 이미지 첨부됨</span>
            </div>
          )}

          <div className={styles.inputArea}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="사진/파일 업로드"
            >
              📷
            </button>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={imagePreview ? "이미지에 대해 질문하세요..." : "체크인에게 물어보세요..."}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage()}
              disabled={loading || (!input.trim() && !imageBase64)}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </>
  )
}
