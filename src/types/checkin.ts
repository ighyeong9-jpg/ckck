/**
 * QR/NFC 출역 체크인 타입 (QR_CHECKIN_SPEC.md 기반)
 */

export type CheckType = 'in' | 'out'
export type CheckMethod = 'qr' | 'nfc' | 'manual'

export interface CheckinLog {
  id: string
  project_id: string
  worker_id: string
  check_type: CheckType
  checked_at: string        // ISO 8601
  method: CheckMethod
  synced: boolean
}

export interface CheckinQRConfig {
  project_id: string
  token: string
  generated_at: string
  expires_at: string        // 일일 자동 갱신
  url: string               // /checkin/{projectId}/{token}
}

export interface CheckinSummary {
  project_id: string
  date: string
  total_in: number
  total_out: number
  currently_on_site: number
  workers: {
    worker_id: string
    worker_name: string
    check_in_time: string | null
    check_out_time: string | null
    method: CheckMethod
  }[]
}
