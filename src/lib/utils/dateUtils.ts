/**
 * dateUtils.ts — 한국식 날짜/시간 유틸리티
 *
 * 한국 사용자에게 친숙한 상대 시간 표기 제공
 * 예: "방금 전", "3분 전", "어제", "2일 전", "2025. 1. 15."
 */

/**
 * 상대 시간 표기 (한국어)
 * @example
 * toKoreanRelativeTime(new Date(Date.now() - 30000)) // "방금 전"
 * toKoreanRelativeTime(new Date(Date.now() - 3600000)) // "1시간 전"
 */
export function toKoreanRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()

  if (diff < 0) return '방금 전'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / 60000)
  const hours   = Math.floor(diff / 3600000)
  const days    = Math.floor(diff / 86400000)
  const weeks   = Math.floor(days / 7)
  const months  = Math.floor(days / 30)

  if (seconds < 60)  return '방금 전'
  if (minutes < 60)  return `${minutes}분 전`
  if (hours < 24)    return `${hours}시간 전`
  if (days === 1)    return '어제'
  if (days < 7)      return `${days}일 전`
  if (weeks < 5)     return `${weeks}주 전`
  if (months < 12)   return `${months}달 전`

  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * D-day 표기 (한국식)
 * @example
 * toKoreanDday(new Date(Date.now() + 86400000 * 3)) // "D-3"
 * toKoreanDday(new Date(Date.now() - 86400000))     // "D+1 초과"
 */
export function toKoreanDday(date: Date | string): { text: string; isUrgent: boolean; isOverdue: boolean } {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffDays = Math.ceil((d.getTime() - Date.now()) / 86400000)

  if (diffDays < 0)  return { text: `D+${Math.abs(diffDays)} 초과`, isUrgent: true,  isOverdue: true  }
  if (diffDays === 0) return { text: 'D-Day',                        isUrgent: true,  isOverdue: false }
  if (diffDays <= 3)  return { text: `D-${diffDays}`,                isUrgent: true,  isOverdue: false }
  if (diffDays <= 7)  return { text: `D-${diffDays}`,                isUrgent: false, isOverdue: false }
  return { text: `D-${diffDays}`, isUrgent: false, isOverdue: false }
}

/**
 * 날짜를 한국식 단축 표기로 변환
 * @example
 * toKoreanDate(new Date()) // "오늘", "어제", "2025. 1. 15."
 */
export function toKoreanDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (isSameDay(d, today))     return '오늘'
  if (isSameDay(d, yesterday)) return '어제'

  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * 날짜 범위 표기
 * @example
 * toKoreanDateRange(start, end) // "1월 15일 ~ 2월 20일 (36일)"
 */
export function toKoreanDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start
  const e = typeof end   === 'string' ? new Date(end)   : end
  const days = Math.ceil((e.getTime() - s.getTime()) / 86400000)

  const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  return `${fmt(s)} ~ ${fmt(e)} (${days}일)`
}

/**
 * 시간 표기 (오전/오후)
 * @example
 * toKoreanTime(new Date()) // "오후 2:30"
 */
export function toKoreanTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })
}
