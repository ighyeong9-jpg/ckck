export interface QuoteLineItem {
  id: string
  project_id: string
  category: string
  item_name: string
  specification: string | null
  unit: string
  quantity: number
  unit_price: number
  amount: number
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateQuoteLineItemInput {
  project_id: string
  category: string
  item_name: string
  specification?: string
  unit: string
  quantity: number
  unit_price: number
  notes?: string
  sort_order?: number
}

export interface QuoteSummary {
  subtotal: number
  vat: number
  total: number
  itemCount: number
}

export const QUOTE_CATEGORIES = [
  { id: 'demolition', name: '철거공사' },
  { id: 'electrical', name: '전기공사' },
  { id: 'plumbing', name: '설비공사' },
  { id: 'carpentry', name: '목공사' },
  { id: 'tile', name: '타일공사' },
  { id: 'paint', name: '도장공사' },
  { id: 'wallpaper', name: '도배공사' },
  { id: 'flooring', name: '바닥공사' },
  { id: 'furniture', name: '가구공사' },
  { id: 'other', name: '기타' },
] as const

export const UNITS = [
  { id: 'set', name: '세트' },
  { id: 'ea', name: '개' },
  { id: 'm', name: 'm' },
  { id: 'm2', name: '㎡' },
  { id: 'roll', name: '롤' },
  { id: 'box', name: '박스' },
  { id: 'day', name: '일' },
  { id: 'job', name: '식' },
] as const
