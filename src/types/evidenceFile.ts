export interface EvidenceFile {
  id: string
  project_id: string
  file_name: string
  file_size: number
  file_type: string | null
  storage_path: string
  sha256_hash: string | null
  category: string
  description: string | null
  uploaded_by: string | null
  created_at: string
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
