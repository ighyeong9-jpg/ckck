/**
 * price_benchmarks 테이블 시딩 스크립트
 * 견적 검증 기능을 위한 초기 데이터 생성
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kilvdxrtmcxvycqevalv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbHZkeHJ0bWN4dnljcWV2YWx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTMyOTMwNSwiZXhwIjoyMDg2OTA1MzA1fQ.22-WPyK54fENtO-UhlpNFpLF2ysgk54KEnrdSiyetsU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const priceBenchmarks = [
  // 주거 - 아파트 올수리
  {
    category: 'residential',
    space_type: '아파트_올수리',
    size_min_pyeong: 20,
    size_max_pyeong: 29,
    price_per_pyeong_low: 175,
    price_per_pyeong_avg: 215,
    price_per_pyeong_high: 260,
    total_low: 3500,
    total_avg: 4500,
    total_high: 5500,
    region: 'seoul',
    source: '오늘의집_원가검수센터_393건_2024-2025',
    reference_year: 2025,
    is_active: true
  },
  {
    category: 'residential',
    space_type: '아파트_올수리',
    size_min_pyeong: 30,
    size_max_pyeong: 39,
    price_per_pyeong_low: 150,
    price_per_pyeong_avg: 190,
    price_per_pyeong_high: 240,
    total_low: 4500,
    total_avg: 5700,
    total_high: 7200,
    region: 'seoul',
    source: '오늘의집_원가검수센터_393건_2024-2025',
    reference_year: 2025,
    is_active: true
  },
  {
    category: 'residential',
    space_type: '아파트_올수리',
    size_min_pyeong: 40,
    size_max_pyeong: 49,
    price_per_pyeong_low: 135,
    price_per_pyeong_avg: 175,
    price_per_pyeong_high: 220,
    total_low: 5400,
    total_avg: 7000,
    total_high: 8800,
    region: 'seoul',
    source: '오늘의집_원가검수센터_393건_2024-2025',
    reference_year: 2025,
    is_active: true
  },
  // 구축 아파트
  {
    category: 'residential',
    space_type: '구축아파트_올수리',
    size_min_pyeong: 30,
    size_max_pyeong: 39,
    price_per_pyeong_low: 180,
    price_per_pyeong_avg: 230,
    price_per_pyeong_high: 290,
    total_low: 5400,
    total_avg: 6900,
    total_high: 8700,
    region: 'seoul',
    source: '오늘의집_원가검수센터_구축가산_2024-2025',
    reference_year: 2025,
    is_active: true
  },
  // 부분수리
  {
    category: 'residential',
    space_type: '부분수리',
    size_min_pyeong: 20,
    size_max_pyeong: 39,
    price_per_pyeong_low: 80,
    price_per_pyeong_avg: 120,
    price_per_pyeong_high: 180,
    total_low: 1600,
    total_avg: 2400,
    total_high: 3600,
    region: 'seoul',
    source: '오늘의집_2024-2025',
    reference_year: 2025,
    is_active: true
  },
  // 상업 - 카페
  {
    category: 'commercial',
    space_type: '카페',
    size_min_pyeong: 20,
    size_max_pyeong: 39,
    price_per_pyeong_low: 300,
    price_per_pyeong_avg: 400,
    price_per_pyeong_high: 550,
    total_low: 6000,
    total_avg: 8000,
    total_high: 11000,
    region: 'seoul',
    source: '인테리어젠틀맨+핀다_2023-2025',
    reference_year: 2025,
    is_active: true
  },
  // 음식점
  {
    category: 'commercial',
    space_type: '음식점_일반',
    size_min_pyeong: 20,
    size_max_pyeong: 39,
    price_per_pyeong_low: 320,
    price_per_pyeong_avg: 450,
    price_per_pyeong_high: 620,
    total_low: 6400,
    total_avg: 9000,
    total_high: 12400,
    region: 'seoul',
    source: '인테리어젠틀맨+핀다_2023-2025',
    reference_year: 2025,
    is_active: true
  },
  // 미용실
  {
    category: 'commercial',
    space_type: '미용실',
    size_min_pyeong: 20,
    size_max_pyeong: 39,
    price_per_pyeong_low: 280,
    price_per_pyeong_avg: 380,
    price_per_pyeong_high: 520,
    total_low: 5600,
    total_avg: 7600,
    total_high: 10400,
    region: 'seoul',
    source: '인테리어젠틀맨_2023-2025',
    reference_year: 2025,
    is_active: true
  },
  // 사무실
  {
    category: 'commercial',
    space_type: '사무실',
    size_min_pyeong: 30,
    size_max_pyeong: 99,
    price_per_pyeong_low: 200,
    price_per_pyeong_avg: 280,
    price_per_pyeong_high: 400,
    total_low: 6000,
    total_avg: 8400,
    total_high: 12000,
    region: 'seoul',
    source: '핀다+오픈업_2023-2025',
    reference_year: 2025,
    is_active: true
  },
  // 의료기관
  {
    category: 'commercial',
    space_type: '의료기관',
    size_min_pyeong: 30,
    size_max_pyeong: 99,
    price_per_pyeong_low: 400,
    price_per_pyeong_avg: 550,
    price_per_pyeong_high: 750,
    total_low: 12000,
    total_avg: 16500,
    total_high: 22500,
    region: 'seoul',
    source: '핀다_2023-2025',
    reference_year: 2025,
    is_active: true
  }
];

async function seedPriceBenchmarks() {
  try {
    console.log('🚀 시작: price_benchmarks 테이블 시딩...\n');

    // 기존 데이터 확인
    const { data: existing, error: checkError } = await supabase
      .from('price_benchmarks')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ 테이블 확인 실패:', checkError.message);
      throw checkError;
    }

    if (existing && existing.length > 0) {
      console.log('⚠️  기존 데이터가 존재합니다. 삭제 후 재시딩합니다...');
      const { error: deleteError } = await supabase
        .from('price_benchmarks')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('❌ 기존 데이터 삭제 실패:', deleteError.message);
      } else {
        console.log('✅ 기존 데이터 삭제 완료\n');
      }
    }

    // 데이터 삽입
    console.log(`📝 ${priceBenchmarks.length}개 벤치마크 데이터 삽입 중...\n`);

    const { data, error } = await supabase
      .from('price_benchmarks')
      .insert(priceBenchmarks)
      .select();

    if (error) {
      console.error('❌ 삽입 실패:', error.message);
      throw error;
    }

    console.log(`✅ ${data.length}개 데이터 삽입 완료!\n`);

    // 결과 확인
    console.log('📊 삽입된 데이터 확인:\n');
    data.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.category} > ${item.space_type} (${item.size_min_pyeong}~${item.size_max_pyeong}평): ${item.total_low}~${item.total_high}만원`);
    });

    console.log('\n✨ 시딩 완료!');
  } catch (error) {
    console.error('\n💥 시딩 실패:', error);
    process.exit(1);
  }
}

seedPriceBenchmarks();
