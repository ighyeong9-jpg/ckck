/**
 * POST /api/projects/:id/photos
 * 증빙 파일 업로드 + SHA-256 해시 자동 생성
 *
 * Content-Type: multipart/form-data
 * Body:
 *   file        (File, required)
 *   category    (string, 기본: 'other')
 *   description (string, 선택)
 *   is_evidence (boolean, 선택: Merkle Tree 포함 여부)
 */
import { NextResponse } from 'next/server'
import { uploadEvidenceFile } from '@/lib/engines/evidenceEngine'
import { calculateAndSaveRiskScore } from '@/lib/engines/riskEngine'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    const category = (formData.get('category') as string) || 'other'
    const description = (formData.get('description') as string) || null
    const isEvidence = formData.get('is_evidence') === 'true'

    const result = await uploadEvidenceFile(params.id, file, {
      category,
      description: description ?? undefined,
      isEvidence,
    })

    // 업로드 후 리스크 점수 재계산 (비동기, 실패해도 업로드 응답은 성공)
    calculateAndSaveRiskScore(params.id).catch(() => {})

    return NextResponse.json({
      success: true,
      data: result,
      hash_generated: true,
      sha256_hash: result.sha256_hash,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
