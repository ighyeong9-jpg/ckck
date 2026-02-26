/**
 * POST /api/projects/:id/risk/calculate
 * 리스크 점수 수동 재계산
 */
import { NextResponse } from 'next/server'
import { calculateAndSaveRiskScore } from '@/lib/engines/riskEngine'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await calculateAndSaveRiskScore(params.id)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
