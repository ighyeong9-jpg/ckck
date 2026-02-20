/**
 * POST /api/ai/check
 * 현장 사진 → AI 자동 체크 엔드포인트
 *
 * Body: { projectId: string, imageBase64: string, mimeType: string, photoUrl?: string }
 * Response: AutoCheckResult + resultId (DB에 저장된 경우)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { autoCheckFromPhoto, saveCheckResult } from '@/lib/ai/auto-checker'
import type { ImageData } from '@/lib/ai/gemini-provider'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, imageBase64, mimeType, photoUrl } = body as {
      projectId: string
      imageBase64: string
      mimeType: string
      photoUrl?: string
    }

    if (!projectId || !imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: 'projectId, imageBase64, mimeType 필드가 필요합니다.' },
        { status: 400 }
      )
    }

    // 이미지 크기 검증 (base64 약 5MB → 원본 ~3.75MB)
    if (imageBase64.length > 7 * 1024 * 1024) {
      return NextResponse.json(
        { error: '이미지가 너무 큽니다. 5MB 이하로 압축 후 다시 시도해주세요.' },
        { status: 413 }
      )
    }

    // 이미지 형식 검증
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
    if (!allowedMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: '지원하지 않는 이미지 형식입니다. (JPEG, PNG, WebP, GIF 지원)' },
        { status: 400 }
      )
    }

    // 인증된 사용자 확인
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 프로젝트 접근 권한 확인
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없거나 접근 권한이 없습니다.' }, { status: 404 })
    }

    // AI 자동 체크 실행
    const imageData: ImageData = { base64: imageBase64, mimeType }
    const result = await autoCheckFromPhoto(imageData, projectId)

    // DB 저장 (photoUrl이 있을 때만)
    let resultId: string | null = null
    if (photoUrl) {
      resultId = await saveCheckResult(projectId, photoUrl, result, supabase)
    }

    return NextResponse.json({ ...result, resultId })
  } catch (err: any) {
    console.error('[API /ai/check] 오류:', err)
    return NextResponse.json(
      { error: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
