/**
 * 오프라인 동기화 타입 (OFFLINE_MODE_SPEC.md 기반)
 */

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'
export type SyncAction = 'insert' | 'update' | 'delete'
export type SyncTable = 'checkin_logs' | 'diagnostic_responses' | 'evidence_files' | 'processes'

export interface PendingSyncItem {
  id: string
  table: SyncTable
  action: SyncAction
  data: Record<string, unknown>
  created_at: string        // ISO 8601 (오프라인 시점)
  retry_count: number       // 최대 5회
  status: SyncStatus
  error?: string
}

export interface OfflineSyncQueue {
  items: PendingSyncItem[]
  last_synced_at: string | null
  is_online: boolean
}

/** 오프라인 지원 기능 목록 */
export const OFFLINE_FEATURES = {
  tbm_checklist: { supported: true, syncMethod: '큐 → 자동 동기화' },
  qr_checkin: { supported: true, syncMethod: '큐 → 자동 동기화' },
  photo_capture: { supported: true, syncMethod: '백그라운드 업로드' },
  checklist_view: { supported: true, syncMethod: '캐시 사용' },
  ai_chat: { supported: false, syncMethod: '온라인 필수' },
  pdf_report: { supported: false, syncMethod: '온라인 필수' },
} as const

/** 오프라인 용량 제한 */
export const OFFLINE_LIMITS = {
  maxPhotos: 50,
  maxPhotoSizeMB: 5,
  cacheDays: 7,
  maxRetries: 5,
} as const
