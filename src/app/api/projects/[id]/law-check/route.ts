/**
 * POST /api/projects/:id/law-check
 * 12개 법령 전체 체크 실행 → law_checks 저장 → 리스크 재계산
 */
import { NextResponse } from 'next/server'
import { checkAllLaws } from '@/lib/engines/lawEngine'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const results = await checkAllLaws(params.id)

    const summary = {
      total: results.length,
      compliant: results.filter(r => r.status === 'compliant').length,
      violated: results.filter(r => r.status === 'violated').length,
      not_applicable: results.filter(r => r.status === 'not_applicable').length,
      pending: results.filter(r => r.status === 'pending').length,
      go_nogo: results.some(r => r.go_nogo === 'nogo') ? 'nogo' : 'go',
    }

    return NextResponse.json({ success: true, data: results, summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
