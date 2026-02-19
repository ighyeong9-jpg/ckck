/**
 * POST /api/ai/notebook
 * 문서/이미지 분석 엔드포인트 (NotebookLM)
 *
 * Body (multipart/form-data OR application/json):
 *   - file: File (이미지/PDF/텍스트)
 *   - userNote?: string
 *   - projectId?: string
 *
 * 또는 JSON:
 *   - fileName: string
 *   - mimeType: string
 *   - base64Data?: string
 *   - textContent?: string
 *   - userNote?: string
 *   - projectId?: string
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeDocument } from '@/lib/ai/notebook-lm'

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') ?? ''

    let fileName = 'document'
    let mimeType = 'text/plain'
    let base64Data: string | undefined
    let textContent: string | undefined
    let userNote: string | undefined
    let projectId: string | undefined

    if (contentType.includes('multipart/form-data')) {
      // FormData 처리
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      userNote = (formData.get('userNote') as string) || undefined
      projectId = (formData.get('projectId') as string) || undefined

      if (!file) {
        return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
      }

      fileName = file.name
      mimeType = file.type || 'application/octet-stream'

      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        // 이미지/PDF: base64 인코딩
        const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
        base64Data = btoa(binary)
      } else {
        // 텍스트 파일: UTF-8 디코딩
        textContent = new TextDecoder('utf-8').decode(bytes)
      }
    } else {
      // JSON 처리
      const body = await req.json()
      fileName = body.fileName ?? 'document'
      mimeType = body.mimeType ?? 'text/plain'
      base64Data = body.base64Data
      textContent = body.textContent
      userNote = body.userNote
      projectId = body.projectId
    }

    // 파일 크기 제한: base64는 약 10MB 원본 기준
    if (base64Data && base64Data.length > 14_000_000) {
      return NextResponse.json(
        { error: '파일 크기가 너무 큽니다. 10MB 이하의 파일을 업로드해주세요.' },
        { status: 413 },
      )
    }

    // 분석 실행
    const insight = await analyzeDocument({
      fileName,
      mimeType,
      base64Data,
      textContent,
      userNote,
      projectId,
    })

    return NextResponse.json(insight)
  } catch (err: any) {
    console.error('[API /ai/notebook] 오류:', err)
    return NextResponse.json(
      { error: err?.message || '문서 분석 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
