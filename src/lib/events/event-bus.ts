/**
 * event-bus.ts — 기능 간 이벤트 허브
 *
 * Next.js 서버리스 환경에서 작동하는 동기식 이벤트 버스.
 * 하나의 API 요청 내에서 기능들을 유기적으로 연결한다.
 *
 * 이벤트 흐름:
 * PHOTO_UPLOADED       → auto-checker → CHECKLIST_AUTO_FILLED
 * CHECKLIST_COMPLETED  → prediction-engine → NEXT_RISK_PREDICTED
 * RISK_HIGH_DETECTED   → alert-engine → NOTIFICATION_SENT
 * DAILY_END            → report-writer → DAILY_REPORT_DRAFTED
 * DISPUTE_SIGNAL       → alert-engine → DISPUTE_ALERT_SENT
 */

// ═══════════════════════════════════════════════════════════
// 이벤트 타입
// ═══════════════════════════════════════════════════════════

export type CheckInEvent =
  | 'PHOTO_UPLOADED'           // 증빙 사진 업로드 완료
  | 'CHECKLIST_AUTO_FILLED'    // AI가 체크리스트 자동 완성
  | 'CHECKLIST_COMPLETED'      // 체크리스트 전체 완료
  | 'NEXT_RISK_PREDICTED'      // 다음 공종 리스크 예측 완료
  | 'RISK_HIGH_DETECTED'       // 고위험 감지
  | 'LAW_VIOLATION_SUSPECTED'  // 법규 미충족 의심
  | 'DAILY_END'                // 일과 종료
  | 'DAILY_REPORT_DRAFTED'     // 일보 초안 생성
  | 'DISPUTE_SIGNAL_DETECTED'  // 기록 관리 징후 감지
  | 'PROJECT_CREATED'          // 프로젝트 생성
  | 'PROCESS_COMPLETED'        // 공정 완료
  | 'DEADLINE_OVERDUE'         // 마감 초과

export interface EventPayload {
  projectId: string
  userId?: string
  data?: Record<string, unknown>
  timestamp: string
}

type EventHandler = (payload: EventPayload) => void | Promise<void>

// ═══════════════════════════════════════════════════════════
// 이벤트 버스 클래스
// ═══════════════════════════════════════════════════════════

class CheckInEventBus {
  private handlers: Map<CheckInEvent, EventHandler[]> = new Map()

  /** 이벤트 핸들러 등록 */
  on(event: CheckInEvent, handler: EventHandler): void {
    const existing = this.handlers.get(event) ?? []
    this.handlers.set(event, [...existing, handler])
  }

  /** 이벤트 핸들러 해제 */
  off(event: CheckInEvent, handler: EventHandler): void {
    const existing = this.handlers.get(event) ?? []
    this.handlers.set(event, existing.filter(h => h !== handler))
  }

  /** 이벤트 발행 (비동기 — 모든 핸들러 병렬 실행) */
  async emit(event: CheckInEvent, payload: Omit<EventPayload, 'timestamp'>): Promise<void> {
    const fullPayload: EventPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    }

    const handlers = this.handlers.get(event) ?? []
    if (handlers.length === 0) return

    await Promise.allSettled(
      handlers.map(handler => {
        try {
          return Promise.resolve(handler(fullPayload))
        } catch (err) {
          console.error(`[EventBus] 핸들러 오류 (event=${event}):`, err)
          return Promise.resolve()
        }
      })
    )
  }

  /** 이벤트 발행 (동기 — fire-and-forget, await 불필요) */
  emitSync(event: CheckInEvent, payload: Omit<EventPayload, 'timestamp'>): void {
    this.emit(event, payload).catch(err => {
      console.error(`[EventBus] emitSync 오류 (event=${event}):`, err)
    })
  }
}

// 싱글턴 인스턴스
export const eventBus = new CheckInEventBus()

// ═══════════════════════════════════════════════════════════
// 헬퍼: 표준 페이로드 생성
// ═══════════════════════════════════════════════════════════

export function makePayload(
  projectId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Omit<EventPayload, 'timestamp'> {
  return { projectId, userId, data }
}
