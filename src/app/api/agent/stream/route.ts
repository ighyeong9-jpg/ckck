import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, projectId, history } = await req.json() as {
      message: string
      projectId?: string
      history?: Array<{ role: string; content: string }>
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지 필요' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    // 대화 히스토리 구성
    const chatHistory = (history ?? []).map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }))

    const systemPrompt = `당신은 인테리어/건설 현장 관리 전문 AI 비서 "체키"입니다.
현장 소장을 도와 법령 준수, 리스크 관리, 공정 관리를 지원합니다.
${projectId ? `현재 프로젝트 ID: ${projectId}` : ''}
친절하고 전문적인 한국어로 답변하세요.`

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: '안녕하세요! 체키입니다. 무엇을 도와드릴까요?' }] },
        ...chatHistory,
      ],
    })

    const result = await chat.sendMessageStream(message)

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              const data = JSON.stringify({ delta: text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          console.error('[stream] 오류:', err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '스트리밍 오류' })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[agent/stream]', err)
    return NextResponse.json({ error: '스트리밍 실패' }, { status: 500 })
  }
}
