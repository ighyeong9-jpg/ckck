/**
 * POST /api/projects/:id/evidence/merkle
 * 프로젝트 증빙 파일 전체의 Merkle Root 생성/갱신
 *
 * is_evidence=true + sha256_hash 존재 파일들로 Merkle Tree 구성.
 * 각 파일의 merkle_root 컬럼에 루트 해시 저장.
 */
import { NextResponse } from 'next/server'
import { generateAndSaveMerkleRoot } from '@/lib/engines/evidenceEngine'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await generateAndSaveMerkleRoot(params.id)

    if (result.file_count === 0) {
      return NextResponse.json({
        success: true,
        data: result,
        message: 'is_evidence=true 파일이 없습니다. Merkle Tree 생성 불가.',
      })
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `${result.file_count}개 파일의 Merkle Root 생성 완료`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
