/**
 * GET /api/ai/proactive
 * 체키 프로액티브 브리핑 — 사용자가 말하기 전에 먼저 감지
 *
 * 5가지 트리거를 병렬 체크:
 * 1. 하자담보 만료 임박 (D-30)
 * 2. 미확인 AI 판정
 * 3. 미해결 분쟁 징후
 * 4. 공정 완료 후 다음 단계 안내
 * 5. 오늘 일보 미작성
 *
 * Response: ProactiveSummary + briefingText
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runProactiveEngine, generateBriefingText } from '@/lib/ai/proactive-engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 사용자 이름 조회 (브리핑 인사에 사용)
    const { data: settings } = await supabase
      .from('user_settings')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    const userName = settings?.display_name || user.email?.split('@')[0] || '소장님'

    // 프로액티브 엔진 실행
    const summary = await runProactiveEngine(user.id)

    // 브리핑 텍스트 생성 (규칙 기반, AI 호출 없음)
    const briefingText = generateBriefingText(summary, userName)

    return NextResponse.json({
      ...summary,
      briefingText,
      userName,
      generatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[API /ai/proactive] 오류:', err)
    return NextResponse.json(
      { error: '프로액티브 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
