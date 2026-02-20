/**
 * GET  /api/ai/proactive  — 체키 프로액티브 브리핑 (사용자 요청)
 * POST /api/ai/proactive  — Vercel Cron 트리거 (CRON_SECRET 인증)
 *
 * 5가지 트리거를 병렬 체크:
 * 1. 하자담보 만료 임박 (D-30)
 * 2. 미확인 AI 판정
 * 3. 미해결 분쟁 징후
 * 4. 공정 완료 후 다음 단계 안내
 * 5. 오늘 일보 미작성
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  runProactiveEngine,
  generateBriefingText,
  saveNotificationsToDb,
  type ProactiveSummary,
} from '@/lib/ai/proactive-engine'

export const dynamic = 'force-dynamic'

// ═══════════════════════════════════════════════════════════
// Gemini AI 브리핑 생성 (폴백: 규칙 기반)
// ═══════════════════════════════════════════════════════════

async function generateAIBriefing(
  summary: ProactiveSummary,
  userName: string,
): Promise<string> {
  if (!process.env.GEMINI_API_KEY || summary.totalCount === 0) {
    return generateBriefingText(summary, userName)
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const notifSummary = summary.notifications
      .slice(0, 5)
      .map(n => `[${n.severity}] ${n.projectName}: ${n.title} — ${n.message}`)
      .join('\n')

    const prompt = `당신은 체키, 인테리어/건설 현장 AI 비서입니다.
${userName}님에게 오늘 아침 브리핑을 한국어로 3~5문장으로 작성하세요.
친근하고 전문적인 어조로, 구체적인 행동을 제안하세요.

오늘 감지된 알림:
${notifSummary}

브리핑만 출력 (제목 없이, 마크다운 없이):`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (geminiError: any) {
    // Gemini 실패 시 Claude로 폴백
    const claudeKey = process.env.ANTHROPIC_API_KEY
    if (claudeKey) {
      try {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 512,
            messages: [{ role: 'user', content: prompt }],
          }),
        })
        if (claudeRes.ok) {
          const data = await claudeRes.json()
          return data.content?.[0]?.text?.trim() ?? generateBriefingText(summary, userName)
        }
      } catch {
        // Claude도 실패 시 규칙 기반 폴백
      }
    }
    console.warn('[proactive] AI 브리핑 실패, 규칙 기반 폴백:', geminiError?.message?.substring(0, 100))
    return generateBriefingText(summary, userName)
  }
}

// ═══════════════════════════════════════════════════════════
// GET — 사용자 브리핑 (대시보드에서 호출)
// ═══════════════════════════════════════════════════════════

export async function GET() {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    const userName = settings?.display_name || user.email?.split('@')[0] || '소장님'

    const summary = await runProactiveEngine(user.id)
    const briefingText = await generateAIBriefing(summary, userName)

    return NextResponse.json({
      ...summary,
      briefingText,
      userName,
      generatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[API /ai/proactive GET] 오류:', err)
    return NextResponse.json(
      { error: '프로액티브 분석 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}

// ═══════════════════════════════════════════════════════════
// POST — Vercel Cron (매일 08:00 KST = 23:00 UTC)
// ═══════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  // Cron 인증
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase 환경변수 누락' }, { status: 500 })
  }

  const supabase = createServiceClient(url, key)

  // 활성 사용자 조회 (user_settings에 등록된 사용자)
  const { data: users } = await supabase
    .from('user_settings')
    .select('user_id')
    .limit(100)

  let processed = 0
  for (const { user_id } of (users ?? [])) {
    try {
      const summary = await runProactiveEngine(user_id)
      if (summary.totalCount > 0) {
        await saveNotificationsToDb(user_id, summary.notifications, supabase)
        processed++
      }
    } catch (err) {
      console.error(`[Cron] user ${user_id} 처리 실패:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    total: (users ?? []).length,
    runAt: new Date().toISOString(),
  })
}
