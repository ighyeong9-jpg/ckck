import { brain } from '@/lib/ai/brain'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { projectId, files } = await req.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId가 필요합니다.' },
        { status: 400 }
      )
    }

    const result = await brain({
      task: 'vision-check',
      context: {
        projectId,
        userMessage: files ? `${files.length}개 파일 자동 체크` : '증빙 파일 검증',
        imageData: files?.[0]?.base64 ? { base64: files[0].base64, mimeType: 'image/jpeg' } : undefined,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI check error:', error)
    return NextResponse.json(
      { error: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
