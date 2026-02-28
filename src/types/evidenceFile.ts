export interface EvidenceFile {
  id: string
  project_id: string
  file_name: string
  file_size: number
  file_type: string | null
  storage_path: string
  sha256_hash: string | null
  merkle_root: string | null       // Merkle Tree 루트 해시
  ai_check_result: AiCheckResult | null  // AI 자동 체크 결과
  is_evidence: boolean             // 법정 증거 지정 여부
  category: string
  description: string | null
  uploaded_by: string | null
  created_at: string
}

export type AiCheckResultStatus = 'GO' | 'NO-GO' | 'CONDITIONAL'

export interface AiCheckResult {
  status: AiCheckResultStatus
  confidence: number               // 0~1
  analysis: string
  issues: string[]
  recommendations: string[]
  checked_at: string
}

export const FILE_CATEGORIES = [
  { id: 'contract', name: '계약서', icon: '📄' },
  { id: 'quote', name: '견적서', icon: '💰' },
  { id: 'drawing', name: '도면', icon: '📐' },
  { id: 'photo', name: '현장사진', icon: '📷' },
  { id: 'receipt', name: '영수증', icon: '🧾' },
  { id: 'report', name: '보고서', icon: '📊' },
  { id: 'other', name: '기타', icon: '📎' },
] as const
