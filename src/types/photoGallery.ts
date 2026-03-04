// 공사 단계 (순서대로)
export type ConstructionStage =
  | 'before'      // 착공 전
  | 'demolition'  // 철거
  | 'framework'   // 골조/목공
  | 'electric'    // 전기/설비
  | 'plumbing'    // 배관
  | 'tile'        // 타일
  | 'wallpaper'   // 도배
  | 'painting'    // 도장
  | 'flooring'    // 바닥
  | 'fixture'     // 기구/가구
  | 'cleanup'     // 정리/청소
  | 'after'       // 완공
  | 'etc'         // 기타

export const CONSTRUCTION_STAGES: Record<ConstructionStage, { label: string; icon: string; order: number }> = {
  before:     { label: '시작 전',    icon: '📋', order: 0 },
  demolition: { label: '철거',       icon: '🔨', order: 1 },
  framework:  { label: '목공',       icon: '🪵', order: 2 },
  electric:   { label: '전기',       icon: '⚡', order: 3 },
  plumbing:   { label: '배관',       icon: '🚰', order: 4 },
  tile:       { label: '타일',       icon: '🔲', order: 5 },
  wallpaper:  { label: '벽지',       icon: '🎨', order: 6 },
  painting:   { label: '페인트',     icon: '🖌️', order: 7 },
  flooring:   { label: '바닥',       icon: '🟫', order: 8 },
  fixture:    { label: '설치',       icon: '🪑', order: 9 },
  cleanup:    { label: '청소',       icon: '🧹', order: 10 },
  after:      { label: '완료',       icon: '✨', order: 11 },
  etc:        { label: '기타',       icon: '📸', order: 99 },
}

// 메타데이터
export interface PhotoMetadata {
  gps?: {
    latitude: number
    longitude: number
    altitude?: number
  }
  exif?: {
    dateTime?: string
    make?: string  // 제조사
    model?: string // 기기명
    orientation?: number
  }
  uploader?: {
    userId: string
    userName: string
  }
}

export interface GalleryPhoto {
  id: string
  url: string
  file_name: string
  stage: ConstructionStage  // category → stage로 변경
  description: string | null
  uploaded_at: string
  hash_sha256?: string
  metadata?: PhotoMetadata
}

export interface DateGroup {
  date: string
  photos: GalleryPhoto[]
}

export interface StageGroup {
  stage: ConstructionStage
  label: string
  icon: string
  order: number
  photos: GalleryPhoto[]
}

// 전후 비교 쌍
export interface ComparisonPair {
  id: string
  project_id: string
  before_photo_id: string
  after_photo_id: string
  before_photo?: GalleryPhoto
  after_photo?: GalleryPhoto
  title: string  // "거실 벽 시공"
  change_note?: string  // "벽지 → 페인트 변경 합의 (고객 요청)"
  // 승인 정보
  client_approved?: boolean
  client_approved_at?: string
  client_signature?: string
  contractor_approved?: boolean
  contractor_approved_at?: string
  contractor_signature?: string
  supervisor_approved?: boolean
  supervisor_approved_at?: string
  // 주석 정보
  annotations?: PhotoAnnotation[]
  created_at: string
  updated_at?: string
}

// 사진 주석 (화살표, 텍스트 등)
export interface PhotoAnnotation {
  id: string
  type: 'arrow' | 'text' | 'circle' | 'rectangle'
  photo_side: 'before' | 'after'  // 어느 사진에 표시할지
  // 좌표 (%)
  x: number
  y: number
  width?: number
  height?: number
  // 내용
  text?: string
  color?: string
  created_by?: string
  created_at: string
}
