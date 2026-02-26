/**
 * handlers.ts — CheckIn 이벤트 핸들러 등록
 *
 * 이벤트 연동:
 * PHOTO_UPLOADED        → AI 자동 체크 실행 (결과 DB 저장)
 * CHECKLIST_AUTO_FILLED → 체크리스트 완료율 업데이트
 * RISK_HIGH_DETECTED    → proactive_notifications 생성
 * DISPUTE_SIGNAL_DETECTED → 분쟁 경고 알림 생성
 * PROCESS_COMPLETED     → 하자담보 자동 등록 안내
 *
 * 사용법: 서버 API route에서 `import '@/lib/events/handlers'`
 */

import { eventBus } from './event-bus'
import { createClient } from '@/lib/supabase/server'

let registered = false

export function registerEventHandlers() {
  // 중복 등록 방지 (서버 모듈 캐시 재사용 시)
  if (registered) return
  registered = true

  // ── 1. RISK_HIGH_DETECTED → proactive_notifications 생성 ──
  eventBus.on('RISK_HIGH_DETECTED', async (payload) => {
    try {
      const supabase = createClient()
      const { projectId, userId, data } = payload
      if (!userId) return

      const riskScore = (data?.riskScore as number) ?? 70
      const projectName = (data?.projectName as string) ?? '현장'

      await supabase.from('proactive_notifications').insert({
        user_id: userId,
        project_id: projectId,
        trigger_type: 'RISK_HIGH',
        severity: riskScore >= 80 ? 'CRITICAL' : 'WARNING',
        title: `⚠️ ${projectName} 리스크 점수 ${riskScore}점`,
        message: `리스크 점수가 ${riskScore}점으로 분쟁 발생 가능성이 높습니다. 지금 바로 증빙을 보강하세요.`,
        action_url: `/projects/${projectId}/diagnostic`,
        action_label: '진단 보기',
        metadata: { riskScore, source: 'event-bus' },
      })
    } catch (err) {
      console.error('[Handler] RISK_HIGH_DETECTED 오류:', err)
    }
  })

  // ── 2. DISPUTE_SIGNAL_DETECTED → 분쟁 경고 알림 ──
  eventBus.on('DISPUTE_SIGNAL_DETECTED', async (payload) => {
    try {
      const supabase = createClient()
      const { projectId, userId, data } = payload
      if (!userId) return

      const signalType = (data?.signalType as string) ?? '분쟁 징후'
      const description = (data?.description as string) ?? '분쟁 징후가 감지되었습니다.'

      await supabase.from('proactive_notifications').insert({
        user_id: userId,
        project_id: projectId,
        trigger_type: 'DISPUTE_SIGNAL',
        severity: 'CRITICAL',
        title: `🚨 분쟁 징후 감지: ${signalType}`,
        message: description,
        action_url: `/projects/${projectId}/evidence-package`,
        action_label: '증빙 확인',
        metadata: { signalType, source: 'event-bus' },
      })
    } catch (err) {
      console.error('[Handler] DISPUTE_SIGNAL_DETECTED 오류:', err)
    }
  })

  // ── 3. PROCESS_COMPLETED → 하자담보 등록 안내 알림 ──
  eventBus.on('PROCESS_COMPLETED', async (payload) => {
    try {
      const supabase = createClient()
      const { projectId, userId, data } = payload
      if (!userId) return

      const processName = (data?.processName as string) ?? '공종'
      const warrantyMonths = (data?.warrantyMonths as number) ?? 12

      await supabase.from('proactive_notifications').insert({
        user_id: userId,
        project_id: projectId,
        trigger_type: 'WARRANTY_REGISTER',
        severity: 'INFO',
        title: `🛡️ ${processName} 완료 — 하자담보 등록 필요`,
        message: `${processName} 시공이 완료되었습니다. 하자담보기간(${warrantyMonths}개월)을 등록하고 만료 알림을 받으세요.`,
        action_url: '/warranty',
        action_label: '하자담보 등록',
        metadata: { processName, warrantyMonths, source: 'event-bus' },
      })
    } catch (err) {
      console.error('[Handler] PROCESS_COMPLETED 오류:', err)
    }
  })

  // ── 4. DEADLINE_OVERDUE → 마감 초과 알림 ──
  eventBus.on('DEADLINE_OVERDUE', async (payload) => {
    try {
      const supabase = createClient()
      const { projectId, userId, data } = payload
      if (!userId) return

      const daysOverdue = (data?.daysOverdue as number) ?? 0
      const projectName = (data?.projectName as string) ?? '현장'

      await supabase.from('proactive_notifications').insert({
        user_id: userId,
        project_id: projectId,
        trigger_type: 'DEADLINE_OVERDUE',
        severity: daysOverdue >= 7 ? 'CRITICAL' : 'WARNING',
        title: `📅 ${projectName} 완공 ${daysOverdue}일 초과`,
        message: `공사 완공 기한이 ${daysOverdue}일 지났습니다. 지연 사유를 기록하고 고객과 합의하세요.`,
        action_url: `/projects/${projectId}/changes`,
        action_label: '변경관리 확인',
        metadata: { daysOverdue, source: 'event-bus' },
      })
    } catch (err) {
      console.error('[Handler] DEADLINE_OVERDUE 오류:', err)
    }
  })
}
