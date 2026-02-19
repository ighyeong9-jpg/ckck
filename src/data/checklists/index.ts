// 업종별 체크리스트 통합 내보내기

// 기존 13개
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

// 신규 상업 인테리어 (18개)
import hotelChecklist from './hotel.json'
import pensionChecklist from './pension.json'
import nailChecklist from './nail.json'
import spaChecklist from './spa.json'
import vetChecklist from './vet.json'
import pharmacyChecklist from './pharmacy.json'
import studioChecklist from './studio.json'
import studycafeChecklist from './studycafe.json'
import coworkingChecklist from './coworking.json'
import convstoreChecklist from './convstore.json'
import laundryChecklist from './laundry.json'
import flowerChecklist from './flower.json'
import billiardChecklist from './billiard.json'
import karaokeChecklist from './karaoke.json'
import pcroomChecklist from './pcroom.json'
import kidscafeChecklist from './kidscafe.json'
import franchiseChecklist from './franchise.json'
import buffetChecklist from './buffet.json'

// 신규 주거 (3개)
import townhouseChecklist from './townhouse.json'
import officetelChecklist from './officetel.json'
import oneroomChecklist from './oneroom.json'

// 신규 교육/복지 (4개)
import daycareChecklist from './daycare.json'
import nursingChecklist from './nursing.json'
import welfareChecklist from './welfare.json'
import libraryChecklist from './library.json'

// 신규 기타 (5개)
import factoryChecklist from './factory.json'
import warehouseChecklist from './warehouse.json'
import galleryChecklist from './gallery.json'
import religiousChecklist from './religious.json'
import weddingChecklist from './wedding.json'

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
  cafeChecklist, restaurantChecklist, barChecklist, bakeryChecklist,
  beautyChecklist, clinicChecklist, fitnessChecklist,
  retailChecklist, officeChecklist, academyChecklist,
  apartmentChecklist, villaChecklist, houseChecklist,
  hotelChecklist, pensionChecklist, nailChecklist, spaChecklist, vetChecklist,
  pharmacyChecklist, studioChecklist, studycafeChecklist, coworkingChecklist, convstoreChecklist,
  laundryChecklist, flowerChecklist, billiardChecklist, karaokeChecklist, pcroomChecklist,
  kidscafeChecklist, franchiseChecklist, buffetChecklist,
  townhouseChecklist, officetelChecklist, oneroomChecklist,
  daycareChecklist, nursingChecklist, welfareChecklist, libraryChecklist,
  factoryChecklist, warehouseChecklist, galleryChecklist, religiousChecklist, weddingChecklist
}

// 전체 체크리스트 맵
export const checklistMap: Record<string, Checklist> = {
  // 기존 13개
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
  house: houseChecklist as Checklist,
  // 신규 상업
  hotel: hotelChecklist as Checklist,
  pension: pensionChecklist as Checklist,
  nail: nailChecklist as Checklist,
  spa: spaChecklist as Checklist,
  vet: vetChecklist as Checklist,
  pharmacy: pharmacyChecklist as Checklist,
  studio: studioChecklist as Checklist,
  studycafe: studycafeChecklist as Checklist,
  coworking: coworkingChecklist as Checklist,
  convstore: convstoreChecklist as Checklist,
  laundry: laundryChecklist as Checklist,
  flower: flowerChecklist as Checklist,
  billiard: billiardChecklist as Checklist,
  karaoke: karaokeChecklist as Checklist,
  pcroom: pcroomChecklist as Checklist,
  kidscafe: kidscafeChecklist as Checklist,
  franchise: franchiseChecklist as Checklist,
  buffet: buffetChecklist as Checklist,
  // 신규 주거
  townhouse: townhouseChecklist as Checklist,
  officetel: officetelChecklist as Checklist,
  oneroom: oneroomChecklist as Checklist,
  // 신규 교육/복지
  daycare: daycareChecklist as Checklist,
  nursing: nursingChecklist as Checklist,
  welfare: welfareChecklist as Checklist,
  library: libraryChecklist as Checklist,
  // 신규 기타
  factory: factoryChecklist as Checklist,
  warehouse: warehouseChecklist as Checklist,
  gallery: galleryChecklist as Checklist,
  religious: religiousChecklist as Checklist,
  wedding: weddingChecklist as Checklist,
}

// 체크리스트 ID로 가져오기
export function getChecklistById(id: string): Checklist | undefined {
  return checklistMap[id]
}

// 전체 체크리스트 목록 (카테고리별 그룹핑)
export const checklistOptions = [
  // F&B
  { id: 'cafe', name: '카페', icon: '☕', group: 'fnb' },
  { id: 'restaurant', name: '음식점', icon: '🍽️', group: 'fnb' },
  { id: 'bar', name: '술집/바', icon: '🍺', group: 'fnb' },
  { id: 'bakery', name: '베이커리', icon: '🥐', group: 'fnb' },
  { id: 'franchise', name: '식당체인/프랜차이즈', icon: '🍔', group: 'fnb' },
  { id: 'buffet', name: '뷔페/연회장', icon: '🥂', group: 'fnb' },
  // 서비스
  { id: 'beauty', name: '미용실', icon: '💇', group: 'service' },
  { id: 'nail', name: '네일샵', icon: '💅', group: 'service' },
  { id: 'spa', name: '스파/마사지', icon: '🧖', group: 'service' },
  { id: 'clinic', name: '병원/의원', icon: '🏥', group: 'service' },
  { id: 'vet', name: '동물병원', icon: '🐾', group: 'service' },
  { id: 'pharmacy', name: '약국', icon: '💊', group: 'service' },
  { id: 'fitness', name: '헬스장/피트니스', icon: '💪', group: 'service' },
  { id: 'laundry', name: '세탁소/클리닝', icon: '🧺', group: 'service' },
  { id: 'flower', name: '꽃집/플라워샵', icon: '💐', group: 'service' },
  // 상업/사무
  { id: 'retail', name: '소매점', icon: '🛒', group: 'commercial' },
  { id: 'convstore', name: '편의점', icon: '🏪', group: 'commercial' },
  { id: 'office', name: '사무실', icon: '🏢', group: 'commercial' },
  { id: 'coworking', name: '코워킹스페이스', icon: '💼', group: 'commercial' },
  { id: 'studio', name: '스튜디오', icon: '📸', group: 'commercial' },
  { id: 'hotel', name: '호텔/모텔', icon: '🏨', group: 'commercial' },
  { id: 'pension', name: '펜션/게스트하우스', icon: '🏕️', group: 'commercial' },
  // 여가/엔터
  { id: 'academy', name: '학원', icon: '📚', group: 'leisure' },
  { id: 'studycafe', name: '독서실/스터디카페', icon: '📖', group: 'leisure' },
  { id: 'billiard', name: '당구장/오락실', icon: '🎱', group: 'leisure' },
  { id: 'karaoke', name: '노래방', icon: '🎤', group: 'leisure' },
  { id: 'pcroom', name: 'PC방', icon: '🖥️', group: 'leisure' },
  { id: 'kidscafe', name: '키즈카페', icon: '🧒', group: 'leisure' },
  { id: 'wedding', name: '웨딩홀', icon: '💒', group: 'leisure' },
  // 주거
  { id: 'apartment', name: '아파트', icon: '🏠', group: 'residential' },
  { id: 'villa', name: '빌라', icon: '🏡', group: 'residential' },
  { id: 'house', name: '단독주택', icon: '🏘️', group: 'residential' },
  { id: 'townhouse', name: '타운하우스', icon: '🏗️', group: 'residential' },
  { id: 'officetel', name: '오피스텔', icon: '🏙️', group: 'residential' },
  { id: 'oneroom', name: '원룸/투룸', icon: '🚪', group: 'residential' },
  // 교육/복지
  { id: 'daycare', name: '어린이집/유치원', icon: '👶', group: 'education' },
  { id: 'nursing', name: '요양원/요양병원', icon: '🏥', group: 'education' },
  { id: 'welfare', name: '복지관', icon: '🤝', group: 'education' },
  { id: 'library', name: '도서관', icon: '📕', group: 'education' },
  // 기타
  { id: 'factory', name: '공장/제조시설', icon: '🏭', group: 'etc' },
  { id: 'warehouse', name: '창고/물류센터', icon: '📦', group: 'etc' },
  { id: 'gallery', name: '전시장/갤러리', icon: '🖼️', group: 'etc' },
  { id: 'religious', name: '종교시설', icon: '⛪', group: 'etc' },
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
