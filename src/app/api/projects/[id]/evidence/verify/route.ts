/**
 * GET /api/projects/:id/evidence/verify
 * 프로젝트 전체 증빙 Merkle Tree 무결성 검증
 *
 * is_evidence=true 파일들의 sha256_hash로 Merkle Root 재계산 후
 * 저장된 merkle_root와 비교.
 */
import { NextResponse } from 'next/server'
import { verifyMerkleTree } from '@/lib/engines/evidenceEngine'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await verifyMerkleTree(params.id)

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: result.valid ? 200 : 409 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
