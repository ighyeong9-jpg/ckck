/**
 * POST /api/estimate/validate
 * 견적 단가 검증 API
 * API.md 명세 기반
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateEstimate, type EstimateValidateRequest } from '@/lib/estimate/validator';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.', code: 'AUTH_001' },
        { status: 401 }
      );
    }

    // 요청 파싱
    const body = await request.json();
    const req: EstimateValidateRequest = body;

    // 입력 검증
    if (!req.sizePyeong || req.sizePyeong < 1 || req.sizePyeong > 999) {
      return NextResponse.json(
        { error: '평수가 유효하지 않습니다 (1~999평)', code: 'ESTIMATE_001' },
        { status: 400 }
      );
    }

    if (!req.quotedTotal || req.quotedTotal <= 0) {
      return NextResponse.json(
        { error: '견적 총액이 0 이하입니다', code: 'ESTIMATE_003' },
        { status: 400 }
      );
    }

    if (!req.processes || req.processes.length === 0) {
      return NextResponse.json(
        { error: '공정 항목이 없습니다', code: 'ESTIMATE_004' },
        { status: 400 }
      );
    }

    // 견적 검증 실행
    const validationResult = await validateEstimate(req);

    // 버그 8 수정: project_id NULL 허용
    const projectId = (body as any).projectId ?? null;

    // DB 저장
    const { data: saved, error: saveError } = await supabase
      .from('estimate_validations')
      .insert({
        project_id: projectId, // NULL 허용
        user_id: user.id,
        quoted_total: validationResult.quotedTotal,
        benchmark_low: validationResult.benchmarkRange.low,
        benchmark_avg: validationResult.benchmarkRange.avg,
        benchmark_high: validationResult.benchmarkRange.high,
        deviation_percent: validationResult.deviationPercent,
        overall_status: validationResult.overallStatus,
        total_amount_status: validationResult.totalAmountStatus,
        process_items: validationResult.processAnalysis,
        missing_processes: validationResult.missingProcesses,
        risk_flags: validationResult.riskFlags,
        regional_multiplier: validationResult.regionalMultiplier,
        building_age_surcharge: validationResult.buildingAgeSurcharge,
        recommendation: validationResult.recommendation,
      })
      .select()
      .single();

    if (saveError) {
      console.error('[validate] Save error:', saveError);
      // 저장 실패해도 결과는 반환
    }

    // 성공 응답
    return NextResponse.json({
      data: {
        ...validationResult,
        validationId: saved?.id || null,
      },
      error: null,
    });
  } catch (error: any) {
    console.error('[validate] Error:', error);
    return NextResponse.json(
      {
        error: error.message || '서버 오류가 발생했습니다',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
