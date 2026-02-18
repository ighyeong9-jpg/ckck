/**
 * AI 검증 인증서 타입 정의
 */

export type CertificateStatus = 'active' | 'expired' | 'revoked'
export type CertificateGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface VerificationCertificate {
  id: string
  project_id: string
  user_id: string
  code: string                    // CHK-2026-XXXXX
  total_score: number             // 0-100
  grade: CertificateGrade
  cost_score: number              // 0-25
  process_score: number           // 0-25
  contract_score: number          // 0-25
  schedule_score: number          // 0-25
  project_name: string
  industry: string | null
  client_name: string | null
  status: CertificateStatus
  badge_eligible: boolean         // total_score >= 70
  issued_at: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface ScoreBreakdown {
  cost: {
    score: number                 // 0-25
    details: CostScoreDetail
  }
  process: {
    score: number                 // 0-25
    details: ProcessScoreDetail
  }
  contract: {
    score: number                 // 0-25
    details: ContractScoreDetail
  }
  schedule: {
    score: number                 // 0-25
    details: ScheduleScoreDetail
  }
  total: number                   // 0-100
  grade: CertificateGrade
}

export interface CostScoreDetail {
  hasQuoteItems: boolean
  hasCostAnalysis: boolean
  quoteItemCount: number
  costVarianceRate: number | null  // 비용 차이율 (%)
  categoryCount: number            // 견적 카테고리 수
}

export interface ProcessScoreDetail {
  totalProcesses: number
  completedProcesses: number
  inProgressProcesses: number
  delayedProcesses: number
  completionRate: number           // 완료율 (%)
  hasAllDates: boolean             // 모든 공정에 날짜가 설정됨
}

export interface ContractScoreDetail {
  hasAgreement: boolean
  hasEvidenceFiles: boolean
  agreementCount: number
  evidenceFileCount: number
  changeOrderCount: number
  resolvedChangeCount: number
}

export interface ScheduleScoreDetail {
  isWithinSchedule: boolean        // 프로젝트 기한 내
  daysRemaining: number | null
  totalDuration: number | null     // 총 공사기간 (일)
  delayedProcessCount: number
  processesWithDates: number
  totalProcesses: number
}

export interface CertificateIssueRequest {
  projectId: string
}

export interface CertificateIssueResponse {
  success: boolean
  certificate?: VerificationCertificate
  score?: ScoreBreakdown
  error?: string
}

export interface CertificateVerifyResponse {
  valid: boolean
  certificate?: VerificationCertificate
  error?: string
}

// 등급 기준
export const GRADE_THRESHOLDS = {
  A: 90,   // 90-100
  B: 75,   // 75-89
  C: 60,   // 60-74
  D: 40,   // 40-59
  F: 0,    // 0-39
} as const

export const GRADE_LABELS: Record<CertificateGrade, string> = {
  A: '최우수',
  B: '우수',
  C: '양호',
  D: '보통',
  F: '미흡',
}

export const GRADE_COLORS: Record<CertificateGrade, string> = {
  A: '#10b981',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
}

export const BADGE_THRESHOLD = 70  // 배지 자격 기준 점수

export const CERTIFICATE_VALIDITY_DAYS = 365  // 인증서 유효기간 (일)
