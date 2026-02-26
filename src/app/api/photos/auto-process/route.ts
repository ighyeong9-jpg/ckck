import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { autoCheckFromPhoto, saveCheckResult } from '@/lib/ai/auto-checker'
import { eventBus } from '@/lib/events/event-bus'
import '@/lib/events/handlers'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId, photoUrls } = await req.json() as { projectId: string; photoUrls: string[] }
    if (!projectId || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json({ error: 'projectId, photoUrls 필수' }, { status: 400 })
    }

    // 프로젝트 소유권 확인
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, user_id')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 최대 5개로 제한
    const urls = photoUrls.slice(0, 5)

    // 병렬 처리
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        // URL → base64 변환
        const fetchRes = await fetch(url)
        const blob = await fetchRes.blob()
        const mimeType = blob.type || 'image/jpeg'
        const arrayBuffer = await blob.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

        const checkResult = await autoCheckFromPhoto({ base64, mimeType }, projectId)
        await saveCheckResult(projectId, url, checkResult, supabase)

        return { url, ...checkResult }
      })
    )

    const processed = results.map((r, i) =>
      r.status === 'fulfilled'
        ? { url: urls[i], success: true, result: r.value }
        : { url: urls[i], success: false, error: (r.reason as Error)?.message }
    )

    // NO-GO 감지 시 이벤트 발행
    const hasNogo = processed.some(p => p.success && (p.result as any)?.goNoGo === 'NO-GO')
    if (hasNogo) {
      eventBus.emitSync('RISK_HIGH_DETECTED', {
        projectId,
        userId: user.id,
        data: { projectName: project.name, riskScore: 75, source: 'auto-process' },
      })
    }

    return NextResponse.json({ success: true, processed, hasNogo })
  } catch (err) {
    console.error('[photos/auto-process]', err)
    return NextResponse.json({ error: '처리 중 오류' }, { status: 500 })
  }
}
