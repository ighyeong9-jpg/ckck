/**
 * 증거 무결성 엔진 (서버 사이드)
 * SHA-256 해시 생성 + Merkle Tree 관리 + 무결성 검증
 *
 * 기존 src/lib/utils/merkleTree.ts는 브라우저 전용(Web Crypto API).
 * 이 파일은 서버 API 라우트에서 사용하는 Node.js crypto 기반 구현.
 */
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

// ─── 핵심 해시 함수 ────────────────────────────────────────

/**
 * Buffer → SHA-256 hex string (Node.js crypto, 동기)
 */
export function generateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * 문자열 두 개를 결합해 SHA-256 생성 (Merkle 내부 노드용)
 */
function hashPair(left: string, right: string): string {
  return crypto.createHash('sha256').update(left + right).digest('hex')
}

// ─── Merkle Tree ─────────────────────────────────────────

/**
 * 해시 배열 → Merkle Root 계산 (재귀, 동기)
 * 홀수 개면 마지막 노드 복제하여 쌍 맞춤
 */
export function buildMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return ''
  if (hashes.length === 1) return hashes[0]

  const nextLevel: string[] = []
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i]
    const right = hashes[i + 1] ?? left  // 홀수 → 마지막 복제
    nextLevel.push(hashPair(left, right))
  }

  return buildMerkleRoot(nextLevel)
}

// ─── DB 연동: Merkle Root 생성 + 저장 ────────────────────

export interface MerkleGenerateResult {
  root: string
  file_count: number
  updated_at: string
}

/**
 * 프로젝트의 is_evidence=true 파일 전체의 Merkle Root 생성 후
 * 각 파일의 merkle_root 컬럼에 UPDATE
 */
export async function generateAndSaveMerkleRoot(
  projectId: string
): Promise<MerkleGenerateResult> {
  const supabase = createClient()

  // is_evidence=true + sha256_hash 존재 파일만 포함 (생성 순 정렬 → 결정론적)
  const { data: files, error } = await supabase
    .from('evidence_files')
    .select('id, sha256_hash')
    .eq('project_id', projectId)
    .eq('is_evidence', true)
    .not('sha256_hash', 'is', null)
    .order('created_at', { ascending: true })

  if (error) throw new Error('증빙 파일 조회 실패: ' + error.message)

  if (!files || files.length === 0) {
    return { root: '', file_count: 0, updated_at: new Date().toISOString() }
  }

  const hashes = files.map(f => f.sha256_hash as string)
  const merkleRoot = buildMerkleRoot(hashes)
  const updatedAt = new Date().toISOString()

  // 전체 파일에 동일한 merkle_root 기록
  const { error: updateError } = await supabase
    .from('evidence_files')
    .update({ merkle_root: merkleRoot })
    .eq('project_id', projectId)
    .eq('is_evidence', true)

  if (updateError) throw new Error('merkle_root 저장 실패: ' + updateError.message)

  return { root: merkleRoot, file_count: files.length, updated_at: updatedAt }
}

// ─── 개별 파일 무결성 검증 ────────────────────────────────

export interface FileVerifyResult {
  file_id: string
  file_name: string
  valid: boolean
  stored_hash: string
  computed_hash: string
  detail: string
}

/**
 * Supabase Storage에서 파일을 다운로드하여 SHA-256 재계산 후
 * DB에 저장된 sha256_hash와 비교
 */
export async function verifyFileIntegrity(fileId: string): Promise<FileVerifyResult> {
  const supabase = createClient()

  const { data: file, error } = await supabase
    .from('evidence_files')
    .select('id, file_name, sha256_hash, storage_path')
    .eq('id', fileId)
    .single()

  if (error || !file) throw new Error('파일을 찾을 수 없습니다.')
  if (!file.sha256_hash) throw new Error('저장된 SHA-256 해시가 없습니다.')

  const { data: blob, error: dlError } = await supabase.storage
    .from('evidence')
    .download(file.storage_path)

  if (dlError || !blob) {
    throw new Error('파일 다운로드 실패: ' + (dlError?.message ?? '알 수 없는 오류'))
  }

  const buffer = Buffer.from(await blob.arrayBuffer())
  const computedHash = generateSHA256(buffer)
  const valid = computedHash === file.sha256_hash

  return {
    file_id: file.id,
    file_name: file.file_name,
    valid,
    stored_hash: file.sha256_hash,
    computed_hash: computedHash,
    detail: valid ? '무결성 확인' : '변조 의심 — 해시 불일치',
  }
}

// ─── 전체 Merkle Tree 검증 ────────────────────────────────

export interface MerkleVerifyResult {
  project_id: string
  valid: boolean
  stored_root: string | null
  computed_root: string
  file_count: number
  files_without_hash: number
  detail: string
  verified_at: string
}

/**
 * DB의 sha256_hash로 Merkle Root 재계산 후
 * 저장된 merkle_root와 비교
 */
export async function verifyMerkleTree(projectId: string): Promise<MerkleVerifyResult> {
  const supabase = createClient()

  const { data: files, error } = await supabase
    .from('evidence_files')
    .select('id, file_name, sha256_hash, merkle_root')
    .eq('project_id', projectId)
    .eq('is_evidence', true)
    .order('created_at', { ascending: true })

  if (error) throw new Error('파일 조회 실패: ' + error.message)

  if (!files || files.length === 0) {
    return {
      project_id: projectId,
      valid: true,
      stored_root: null,
      computed_root: '',
      file_count: 0,
      files_without_hash: 0,
      detail: '증빙 파일 없음',
      verified_at: new Date().toISOString(),
    }
  }

  const filesWithHash = files.filter(f => !!f.sha256_hash)
  const filesWithoutHash = files.length - filesWithHash.length

  const hashes = filesWithHash.map(f => f.sha256_hash as string)
  const computedRoot = buildMerkleRoot(hashes)

  // 저장된 루트: is_evidence 파일들이 가진 merkle_root (동일해야 함)
  const storedRoot = filesWithHash.find(f => f.merkle_root)?.merkle_root ?? null

  const valid =
    filesWithoutHash === 0 &&
    storedRoot !== null &&
    storedRoot === computedRoot

  let detail: string
  if (filesWithoutHash > 0) {
    detail = `SHA-256 해시 미생성 파일 ${filesWithoutHash}개 존재`
  } else if (!storedRoot) {
    detail = 'Merkle Root가 아직 생성되지 않음 (POST /evidence/merkle 실행 필요)'
  } else if (storedRoot !== computedRoot) {
    detail = '변조 의심 — Merkle Root 불일치'
  } else {
    detail = `무결성 확인 — 파일 ${filesWithHash.length}개 Merkle Root 일치`
  }

  return {
    project_id: projectId,
    valid,
    stored_root: storedRoot,
    computed_root: computedRoot,
    file_count: files.length,
    files_without_hash: filesWithoutHash,
    detail,
    verified_at: new Date().toISOString(),
  }
}

// ─── 파일 업로드 (서버 사이드) ────────────────────────────

export interface UploadResult {
  id: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  sha256_hash: string
  category: string
  description: string | null
  is_evidence: boolean
  created_at: string
}

/**
 * 파일 업로드 + SHA-256 해시 자동 생성
 * FormData: file (File), category (string), description (string?), is_evidence (boolean?)
 */
export async function uploadEvidenceFile(
  projectId: string,
  file: File,
  options: { category?: string; description?: string; isEvidence?: boolean } = {}
): Promise<UploadResult> {
  const supabase = createClient()

  const { category = 'other', description = null, isEvidence = false } = options

  // 1. 파일 바이너리 읽기
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 2. SHA-256 해시 생성 (Node.js crypto)
  const sha256Hash = generateSHA256(buffer)

  // 3. 스토리지 경로 생성 (중복 방지)
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const storagePath = `${projectId}/${timestamp}_${safeName}`

  // 4. Supabase Storage 업로드
  const { error: uploadError } = await supabase.storage
    .from('evidence')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) throw new Error('스토리지 업로드 실패: ' + uploadError.message)

  // 5. evidence_files DB 저장
  const { data, error: dbError } = await supabase
    .from('evidence_files')
    .insert({
      project_id: projectId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      storage_path: storagePath,
      sha256_hash: sha256Hash,
      category,
      description,
      is_evidence: isEvidence,
    })
    .select()
    .single()

  if (dbError || !data) throw new Error('DB 저장 실패: ' + (dbError?.message ?? ''))

  return data as UploadResult
}
