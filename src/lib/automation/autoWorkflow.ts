/**
 * autoWorkflow.ts — 7가지 자동화 흐름 통합
 *
 * triggerPhotoWorkflow: 사진 AI 체크 후 자동 처리
 * triggerProcessCompleteWorkflow: 공종 완료 후 자동 처리
 * triggerChecklistCompleteWorkflow: 체크리스트 완료 후 자동 처리
 */

import { createClient } from '@/lib/supabase/server'
import { eventBus } from '@/lib/events/event-bus'
import type { AutoCheckResult } from '@/lib/ai/auto-checker'

// ─────────────────────────────────────────────
// 1. 사진 워크플로우
// ─────────────────────────────────────────────

export async function triggerPhotoWorkflow(
  projectId: string,
  photoUrl: string,
  checkResult: AutoCheckResult,
  userId: string,
): Promise<void> {
  const supabase = createClient()

  // 1) 공정 완료 자동 기록 — GO + confidence > 0.8이면 해당 공종 progress 업데이트
  if (checkResult.goNoGo !== 'NO-GO' && checkResult.confidence > 0.8 && checkResult.detectedProcess !== '알 수 없음') {
    try {
      const { data: processes } = await supabase
        .from('processes')
        .select('id, name, progress')
        .eq('project_id', projectId)

      if (processes) {
        const matched = processes.find(p =>
          p.name?.includes(checkResult.detectedProcess) ||
          checkResult.detectedProcess.includes(p.name ?? '')
        )
        if (matched && (matched.progress ?? 0) < 100) {
          const newProgress = Math.min(100, (matched.progress ?? 0) + 10)
          await supabase
            .from('processes')
            .update({ progress: newProgress })
            .eq('id', matched.id)
        }
      }
    } catch (err) {
      console.error('[autoWorkflow] 공정 업데이트 오류:', err)
    }
  }

  // 2) 하자 자동 등록 — NO-GO이면 site_issues에 INSERT
  if (checkResult.goNoGo === 'NO-GO' && checkResult.issues.length > 0) {
    try {
      const issueText = checkResult.issues.join('\n')
      await supabase.from('site_issues').insert({
        project_id: projectId,
        user_id: userId,
        title: `[AI 자동감지] ${checkResult.detectedProcess} NO-GO`,
        description: issueText,
        severity: 'high',
        category: 'quality',
        status: 'open',
        photo_url: photoUrl,
        ai_classification: {
          detectedProcess: checkResult.detectedProcess,
          confidence: checkResult.confidence,
          goNoGo: checkResult.goNoGo,
          issues: checkResult.issues,
          recommendations: checkResult.recommendations,
        },
      })
    } catch (err) {
      console.error('[autoWorkflow] 하자 자동 등록 오류:', err)
    }
  }

  // 3) 안전 위험 즉시 알림
  if (checkResult.goNoGo === 'NO-GO') {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    eventBus.emitSync('RISK_HIGH_DETECTED', {
      projectId,
      userId,
      data: {
        projectName: project?.name ?? '현장',
        riskScore: 75,
        source: 'photo-workflow',
        process: checkResult.detectedProcess,
      },
    })
  }

  // 4) 공정 순서 위반 감지
  try {
    const { data: processes } = await supabase
      .from('processes')
      .select('id, name, order_index, status')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    if (processes && processes.length > 1) {
      const currentIdx = processes.findIndex(p =>
        p.name?.includes(checkResult.detectedProcess)
      )
      if (currentIdx > 0) {
        const prevProcess = processes[currentIdx - 1]
        if (prevProcess && prevProcess.status !== 'completed') {
          eventBus.emitSync('DISPUTE_SIGNAL_DETECTED', {
            projectId,
            userId,
            data: {
              signalType: '공정 순서 위반',
              description: `${checkResult.detectedProcess} 시공 전 ${prevProcess.name ?? '이전 공종'}이 완료되지 않았습니다.`,
            },
          })
        }
      }
    }
  } catch (err) {
    console.error('[autoWorkflow] 공정 순서 감지 오류:', err)
  }

  // 5) 일일 보고서 자동 생성
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('daily_reports')
      .select('id, auto_check_count')
      .eq('project_id', projectId)
      .eq('date', today)
      .single()

    if (existing) {
      await supabase
        .from('daily_reports')
        .update({ auto_check_count: (existing.auto_check_count ?? 0) + 1 })
        .eq('id', existing.id)
    } else {
      await supabase.from('daily_reports').insert({
        project_id: projectId,
        user_id: userId,
        date: today,
        auto_check_count: 1,
        go_count: checkResult.goNoGo === 'GO' ? 1 : 0,
        nogo_count: checkResult.goNoGo === 'NO-GO' ? 1 : 0,
      })
    }
  } catch (err) {
    console.error('[autoWorkflow] 일일보고서 오류:', err)
  }

  // 6) 증거 패키징 — evidence_files의 merkle_root 재계산 트리거 (무결성 마킹)
  try {
    await supabase
      .from('evidence_files')
      .update({ needs_rehash: true })
      .eq('project_id', projectId)
      .is('needs_rehash', null)
  } catch {
    // evidence_files에 needs_rehash 컬럼이 없을 수 있음 — 무시
  }
}

// ─────────────────────────────────────────────
// 2. 공종 완료 워크플로우
// ─────────────────────────────────────────────

export async function triggerProcessCompleteWorkflow(
  projectId: string,
  processId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient()

  try {
    const { data: process } = await supabase
      .from('processes')
      .select('name, warranty_months')
      .eq('id', processId)
      .single()

    if (!process) return

    eventBus.emitSync('PROCESS_COMPLETED', {
      projectId,
      userId,
      data: {
        processName: process.name,
        warrantyMonths: process.warranty_months ?? 12,
      },
    })

    // 전체 공정 완료 여부 확인
    const { data: allProcesses } = await supabase
      .from('processes')
      .select('status')
      .eq('project_id', projectId)

    if (allProcesses && allProcesses.every(p => p.status === 'completed')) {
      await triggerChecklistCompleteWorkflow(projectId, userId)
    }
  } catch (err) {
    console.error('[autoWorkflow] 공종 완료 워크플로우 오류:', err)
  }
}

// ─────────────────────────────────────────────
// 3. 체크리스트 완료 워크플로우
// ─────────────────────────────────────────────

export async function triggerChecklistCompleteWorkflow(
  projectId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient()

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('name, risk_score')
      .eq('id', projectId)
      .single()

    if (!project) return

    const riskScore = project.risk_score ?? 0
    if (riskScore >= 60) {
      eventBus.emitSync('RISK_HIGH_DETECTED', {
        projectId,
        userId,
        data: {
          projectName: project.name,
          riskScore,
          source: 'checklist-complete',
        },
      })
    }
  } catch (err) {
    console.error('[autoWorkflow] 체크리스트 완료 워크플로우 오류:', err)
  }
}
