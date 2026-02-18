// 업종별 체크리스트 통합 내보내기
import cafeChecklist from './cafe.json'
import restaurantChecklist from './restaurant.json'
import barChecklist from './bar.json'
import bakeryChecklist from './bakery.json'
import beautyChecklist from './beauty.json'
import clinicChecklist from './clinic.json'
import fitnessChecklist from './fitness.json'
import retailChecklist from './retail.json'
import officeChecklist from './office.json'
import academyChecklist from './academy.json'
import apartmentChecklist from './apartment.json'
import villaChecklist from './villa.json'
import houseChecklist from './house.json'

// 체크리스트 타입 정의
export interface ChecklistItem {
  id: string
  category: string
  subcategory: string
  item: string
  priority: '필수' | '권장' | '조건부'
  method: '육안확인' | '작동확인' | '측정확인'
  evidence: '사진' | '점검표' | '측정기록'
}

export interface Checklist {
  id: string
  name: string
  icon: string
  description: string
  items: ChecklistItem[]
}

// 개별 체크리스트 내보내기
export {
  cafeChecklist,
  restaurantChecklist,
  barChecklist,
  bakeryChecklist,
  beautyChecklist,
  clinicChecklist,
  fitnessChecklist,
  retailChecklist,
  officeChecklist,
  academyChecklist,
  apartmentChecklist,
  villaChecklist,
  houseChecklist
}

// 전체 체크리스트 맵
export const checklistMap: Record<string, Checklist> = {
  cafe: cafeChecklist as Checklist,
  restaurant: restaurantChecklist as Checklist,
  bar: barChecklist as Checklist,
  bakery: bakeryChecklist as Checklist,
  beauty: beautyChecklist as Checklist,
  clinic: clinicChecklist as Checklist,
  fitness: fitnessChecklist as Checklist,
  retail: retailChecklist as Checklist,
  office: officeChecklist as Checklist,
  academy: academyChecklist as Checklist,
  apartment: apartmentChecklist as Checklist,
  villa: villaChecklist as Checklist,
  house: houseChecklist as Checklist
}

// 체크리스트 ID로 가져오기
export function getChecklistById(id: string): Checklist | undefined {
  return checklistMap[id]
}

// 전체 체크리스트 목록 (선택용)
export const checklistOptions = [
  { id: 'cafe', name: '카페', icon: '☕' },
  { id: 'restaurant', name: '음식점', icon: '🍽️' },
  { id: 'bar', name: '술집/바', icon: '🍺' },
  { id: 'bakery', name: '베이커리', icon: '🥐' },
  { id: 'beauty', name: '미용실/네일샵', icon: '💇' },
  { id: 'clinic', name: '병원/의원', icon: '🏥' },
  { id: 'fitness', name: '헬스장/피트니스', icon: '💪' },
  { id: 'retail', name: '소매점/편의점', icon: '🛒' },
  { id: 'office', name: '사무실', icon: '🏢' },
  { id: 'academy', name: '학원', icon: '📚' },
  { id: 'apartment', name: '아파트', icon: '🏠' },
  { id: 'villa', name: '빌라', icon: '🏡' },
  { id: 'house', name: '단독주택', icon: '🏘️' }
]

// 카테고리별 그룹화 함수
export function groupItemsByCategory(items: ChecklistItem[]): Record<string, ChecklistItem[]> {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ChecklistItem[]>)
}

// 우선순위별 필터링 함수
export function filterByPriority(items: ChecklistItem[], priority: string): ChecklistItem[] {
  return items.filter(item => item.priority === priority)
}

// 필수 항목만 가져오기
export function getRequiredItems(items: ChecklistItem[]): ChecklistItem[] {
  return filterByPriority(items, '필수')
}

export default checklistMap
