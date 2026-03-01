/**
 * 시장 기준 단가 조회 모듈
 * DATABASE.md price_benchmarks 테이블 기반
 */

import { createClient } from '@/lib/supabase/server';

export interface PriceBenchmark {
  id: string;
  category: 'residential' | 'commercial';
  space_type: string;
  size_min_pyeong: number | null;
  size_max_pyeong: number | null;
  price_per_pyeong_low: number;
  price_per_pyeong_avg: number;
  price_per_pyeong_high: number;
  total_low: number;
  total_avg: number;
  total_high: number;
  region: string;
  distribution_json: any;
  source: string;
  reference_year: number;
  is_active: boolean;
}

export interface LaborRate {
  id: string;
  trade_name: string;
  daily_rate: number;
  trade_category: string;
  is_new_trade: boolean;
  source: string;
  effective_date: string;
  reference_year: number;
}

export interface ProcessBenchmark {
  id: string;
  process_name: string;
  process_key: string;
  ref_size_pyeong: number;
  price_low: number;
  price_avg_low: number;
  price_avg_high: number;
  price_high: number;
  inclusion_rate: number;
  is_mandatory: boolean;
  note: string | null;
  source: string;
}

/**
 * 시장 기준 단가 조회
 * 버그 1 수정: size_max_pyeong NULL 처리
 */
export async function getBenchmark(params: {
  category: 'residential' | 'commercial';
  spaceType: string;
  sizePyeong: number;
  region?: string;
}): Promise<PriceBenchmark | null> {
  const { category, spaceType, sizePyeong, region = 'seoul' } = params;

  try {
    const supabase = createClient();

    // 버그 1 수정: size_max_pyeong NULL 처리 (999평 이상 대응)
    const { data, error } = await supabase
      .from('price_benchmarks')
      .select('*')
      .eq('category', category)
      .eq('space_type', spaceType)
      .lte('size_min_pyeong', sizePyeong)
      .or(`size_max_pyeong.gte.${sizePyeong},size_max_pyeong.is.null`)
      .eq('is_active', true)
      .eq('region', region)
      .order('size_min_pyeong', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[getBenchmark] Supabase error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[getBenchmark] Error:', err);
    return null;
  }
}

/**
 * 노임단가 조회
 */
export async function getLaborRate(tradeName: string): Promise<LaborRate | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('labor_rates')
      .select('*')
      .eq('trade_name', tradeName)
      .order('reference_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[getLaborRate] Supabase error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[getLaborRate] Error:', err);
    return null;
  }
}

/**
 * 공정별 단가 기준 조회
 */
export async function getProcessBenchmark(processKey: string): Promise<ProcessBenchmark | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('process_benchmarks')
      .select('*')
      .eq('process_key', processKey)
      .maybeSingle();

    if (error) {
      console.error('[getProcessBenchmark] Supabase error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[getProcessBenchmark] Error:', err);
    return null;
  }
}

/**
 * 전체 공정 기준 조회 (필수 공정 체크용)
 */
export async function getAllProcessBenchmarks(): Promise<ProcessBenchmark[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('process_benchmarks')
      .select('*')
      .order('inclusion_rate', { ascending: false });

    if (error) {
      console.error('[getAllProcessBenchmarks] Supabase error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getAllProcessBenchmarks] Error:', err);
    return [];
  }
}
