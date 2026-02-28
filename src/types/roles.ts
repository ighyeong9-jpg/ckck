export type UserRole =
  | 'site_manager'      // 현장소장
  | 'safety_officer'    // 안전관리자
  | 'team_leader'       // 작업반장
  | 'worker'            // 일반작업자
  | 'inspector'         // 감리
  | 'subcontractor'     // 하도급대표
  | 'specialist'        // 협력업체
  | 'client'            // 고객/건축주
  | 'building_manager'  // 건물관리자

export type FeatureSetId = 'process' | 'safety' | 'compliance' | 'materials' | 'workforce'

export interface RoleConfig {
  role: UserRole
  label: string
  allowedSets: FeatureSetId[]
  readOnly: boolean
  tradeTag?: string
}

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    role: 'site_manager',
    label: '현장소장',
    allowedSets: ['process', 'safety', 'compliance', 'materials', 'workforce'],
    readOnly: false,
  },
  {
    role: 'safety_officer',
    label: '안전관리자',
    allowedSets: ['safety', 'compliance', 'workforce'],
    readOnly: false,
  },
  {
    role: 'team_leader',
    label: '작업반장',
    allowedSets: ['process', 'workforce', 'safety'],
    readOnly: false,
  },
  {
    role: 'worker',
    label: '일반작업자',
    allowedSets: ['safety'],
    readOnly: false,
  },
  {
    role: 'inspector',
    label: '감리',
    allowedSets: ['compliance', 'process'],
    readOnly: true,
  },
  {
    role: 'subcontractor',
    label: '하도급대표',
    allowedSets: ['workforce', 'materials', 'process'],
    readOnly: false,
  },
  {
    role: 'specialist',
    label: '협력업체',
    allowedSets: ['safety', 'process', 'materials'],
    readOnly: false,
    tradeTag: '',
  },
  {
    role: 'client',
    label: '고객/건축주',
    allowedSets: ['process', 'safety', 'materials'],
    readOnly: true,
  },
  {
    role: 'building_manager',
    label: '건물관리자',
    allowedSets: ['compliance', 'process', 'workforce'],
    readOnly: false,
  },
]
