/**
 * logger.ts — 활동 로그 기록 유틸리티
 *
 * activity_logs 테이블에 사용자 행동을 기록합니다.
 * 테이블이 없거나 오류가 발생해도 조용히 실패합니다.
 */

export type ActivityAction =
  | 'project_created'
  | 'project_updated'
  | 'project_status_changed'
  | 'process_status_changed'
  | 'process_completed'
  | 'checklist_saved'
  | 'checklist_item_checked'
  | 'change_order_created'
  | 'change_order_approved'
  | 'report_generated'
  | 'ai_chat_message'
  | 'risk_score_saved'

export interface ActivityLogInput {
  userId: string
  projectId?: string
  action: ActivityAction
  targetType?: string
  targetId?: string
  meta?: Record<string, unknown>
}

/**
 * 활동 로그 기록 (fire-and-forget)
 * 실패해도 UI에 영향 없음
 */
export async function logActivity(
  supabaseClient: any,
  input: ActivityLogInput,
): Promise<void> {
  try {
    await supabaseClient.from('activity_logs').insert({
      user_id: input.userId,
      project_id: input.projectId ?? null,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      meta: input.meta ?? {},
    })
  } catch {
    // activity_logs 테이블이 없거나 오류 시 조용히 무시
  }
}

/**
 * 최근 활동 로그 조회
 */
export async function getRecentActivity(
  supabaseClient: any,
  userId: string,
  projectId?: string,
  limit = 20,
) {
  try {
    let query = supabaseClient
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data } = await query
    return data ?? []
  } catch {
    return []
  }
}
