import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/share/demo
 * 데모용 공유 링크 생성 (테스트용)
 */
export async function POST() {
  const supabase = createClient()

  try {
    // 1. 데모 프로젝트 생성 또는 조회
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('name', '데모 카페 인테리어')
      .maybeSingle()

    let projectId = existingProject?.id

    if (!projectId) {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || '00000000-0000-0000-0000-000000000000'

      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: '데모 카페 인테리어',
          industry: 'cafe',
          client_name: '김고객',
          status: 'in_progress',
          progress: 65,
          risk_score: 25,
          start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        })
        .select('id')
        .single()

      if (projectError) throw projectError
      projectId = newProject.id

      // 데모 견적 항목 추가
      await supabase.from('quote_line_items').insert([
        { project_id: projectId, category: '철거', item_name: '기존 벽체 철거', quantity: 20, unit: 'm²', unit_price: 50000 },
        { project_id: projectId, category: '목공', item_name: '천장 마감', quantity: 50, unit: 'm²', unit_price: 80000 },
        { project_id: projectId, category: '전기', item_name: '조명 설치', quantity: 15, unit: '개', unit_price: 120000 },
      ])

      // 데모 공정 추가
      await supabase.from('processes').insert([
        { project_id: projectId, name: '철거', status: 'completed', progress: 100, order_index: 1 },
        { project_id: projectId, name: '목공', status: 'in_progress', progress: 70, order_index: 2 },
        { project_id: projectId, name: '전기', status: 'pending', progress: 0, order_index: 3 },
      ])

      // 데모 진단 응답 추가
      await supabase.from('diagnostic_responses').insert([
        { project_id: projectId, checklist_id: 'cafe_1', checked: true, notes: '확인 완료' },
        { project_id: projectId, checklist_id: 'cafe_2', checked: true, notes: '양호' },
        { project_id: projectId, checklist_id: 'cafe_3', checked: false, notes: '검토 필요' },
      ])
    }

    // 2. 공유 링크 생성 또는 조회
    const shareToken = 'demo123'
    const expiresAt = new Date(Date.now() + 90 * 86400000).toISOString() // 90일 후

    const { data: existingShare } = await supabase
      .from('shares')
      .select('*')
      .eq('share_token', shareToken)
      .maybeSingle()

    if (!existingShare) {
      const { error: shareError } = await supabase
        .from('shares')
        .insert({
          project_id: projectId,
          share_token: shareToken,
          expires_at: expiresAt,
          view_count: 0,
        })

      if (shareError) throw shareError
    }

    return NextResponse.json({
      success: true,
      shareUrl: `/share/${shareToken}`,
      shareToken,
      projectId,
      message: '데모 공유 링크가 생성되었습니다. /share/demo123 으로 접속하세요.',
    })
  } catch (error: any) {
    console.error('Demo share creation error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/share/demo
 * 데모 링크 정보 조회
 */
export async function GET() {
  return NextResponse.json({
    shareUrl: '/share/demo123',
    shareToken: 'demo123',
    instructions: 'POST /api/share/demo 를 호출하여 데모 프로젝트와 공유 링크를 생성하세요.',
  })
}
