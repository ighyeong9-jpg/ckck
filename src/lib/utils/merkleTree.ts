/**
 * Check-In Merkle Tree 검증 시스템
 * 증빙 파일의 무결성 검증을 위한 Merkle Tree 구현
 */

export interface MerkleNode {
  hash: string
  left?: MerkleNode
  right?: MerkleNode
  data?: string  // 리프 노드의 경우 원본 데이터
}

export interface MerkleProof {
  hash: string
  direction: 'left' | 'right'
}

export interface MerkleTreeResult {
  root: string
  leaves: string[]
  tree: MerkleNode
  proofs: Map<string, MerkleProof[]>
}

/**
 * SHA-256 해시 생성 (브라우저 환경)
 */
export async function sha256(data: string | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer

  if (typeof data === 'string') {
    const encoder = new TextEncoder()
    buffer = encoder.encode(data)
  } else {
    buffer = data
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 파일에서 SHA-256 해시 생성
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  return sha256(buffer)
}

/**
 * 두 해시를 결합하여 새 해시 생성
 */
export async function combineHashes(left: string, right: string): Promise<string> {
  return sha256(left + right)
}

/**
 * Merkle Tree 생성
 */
export async function buildMerkleTree(hashes: string[]): Promise<MerkleTreeResult> {
  if (hashes.length === 0) {
    return {
      root: '',
      leaves: [],
      tree: { hash: '' },
      proofs: new Map(),
    }
  }

  // 리프 노드 생성
  let level: MerkleNode[] = hashes.map(hash => ({ hash, data: hash }))
  const leaves = [...hashes]
  const proofMap = new Map<string, MerkleProof[]>()

  // 각 리프에 대한 확인 경로 초기화
  hashes.forEach(hash => proofMap.set(hash, []))

  // 트리 구축 (상향식)
  while (level.length > 1) {
    const nextLevel: MerkleNode[] = []

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]
      const right = level[i + 1] || left  // 홀수인 경우 마지막 노드 복제

      const parentHash = await combineHashes(left.hash, right.hash)
      const parent: MerkleNode = {
        hash: parentHash,
        left,
        right: level[i + 1] ? right : undefined,
      }

      nextLevel.push(parent)

      // 확인 경로 업데이트
      updateProofs(proofMap, left.hash, right.hash, 'right')
      if (level[i + 1]) {
        updateProofs(proofMap, right.hash, left.hash, 'left')
      }
    }

    level = nextLevel
  }

  return {
    root: level[0].hash,
    leaves,
    tree: level[0],
    proofs: proofMap,
  }
}

/**
 * 확인 경로 업데이트
 */
function updateProofs(
  proofMap: Map<string, MerkleProof[]>,
  targetHash: string,
  siblingHash: string,
  direction: 'left' | 'right'
): void {
  // 리프 노드의 모든 확인 경로 업데이트
  proofMap.forEach((proofs, leafHash) => {
    // 현재 레벨에서 이 리프와 관련된 해시 찾기
    const lastProof = proofs[proofs.length - 1]
    const currentHash = lastProof
      ? lastProof.hash // 이전 레벨의 해시 사용
      : leafHash

    if (currentHash === targetHash || includesHash(proofs, targetHash)) {
      proofs.push({ hash: siblingHash, direction })
    }
  })
}

function includesHash(proofs: MerkleProof[], hash: string): boolean {
  return proofs.some(p => p.hash === hash)
}

/**
 * Merkle Proof 검증
 */
export async function verifyMerkleProof(
  leafHash: string,
  proof: MerkleProof[],
  root: string
): Promise<boolean> {
  let currentHash = leafHash

  for (const step of proof) {
    if (step.direction === 'left') {
      currentHash = await combineHashes(step.hash, currentHash)
    } else {
      currentHash = await combineHashes(currentHash, step.hash)
    }
  }

  return currentHash === root
}

/**
 * 단일 파일 해시 검증
 */
export async function verifyFileHash(
  file: File,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await hashFile(file)
  return actualHash === expectedHash
}

/**
 * 증빙 패키지 전체 검증
 */
export interface VerificationResult {
  isValid: boolean
  rootHash: string
  verifiedFiles: number
  totalFiles: number
  failedFiles: string[]
  timestamp: string
}

export async function verifyEvidencePackage(
  files: Array<{ name: string; hash: string }>,
  expectedRoot: string
): Promise<VerificationResult> {
  const hashes = files.map(f => f.hash)
  const tree = await buildMerkleTree(hashes)

  const failedFiles: string[] = []
  files.forEach((file, index) => {
    if (file.hash !== hashes[index]) {
      failedFiles.push(file.name)
    }
  })

  return {
    isValid: tree.root === expectedRoot && failedFiles.length === 0,
    rootHash: tree.root,
    verifiedFiles: files.length - failedFiles.length,
    totalFiles: files.length,
    failedFiles,
    timestamp: new Date().toISOString(),
  }
}

/**
 * 간단한 Merkle Root 생성 (해시 배열로부터)
 */
export async function getMerkleRoot(hashes: string[]): Promise<string> {
  if (hashes.length === 0) return ''
  if (hashes.length === 1) return hashes[0]

  const tree = await buildMerkleTree(hashes)
  return tree.root
}
