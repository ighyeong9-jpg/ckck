/**
 * AI Auto Checker — 사진 자동 체크 엔진
 *
 * 흐름:
 * 현장 사진 (base64 or URL)
 *   → Gemini Vision으로 공종 자동 인식
 *   → 해당 공종 체크리스트 항목 자동 체크
 *   → GO / NO-GO / CONDITIONAL 판정
 *   → 미흡 항목 + 법적 근거 텍스트 자동 생성
 *   → 사람은 [확인] 또는 [수정 후 확인] 버튼만 클릭
 *
 * ARCHITECTURE.md 규칙: brain.ts를 우회하여 직접 Gemini 호출 금지
 * → 단, Vision 분석은 gemini-provider.ts의 callGemini를 통해 처리
 */

import { callGemini, type ImageData } from '@/lib/ai/gemini-provider'

// ═══════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════

export type GoNoGo = 'GO' | 'NO-GO' | 'CONDITIONAL'

export interface CheckedItem {
  itemId: string
  itemName: string
  result: 'PASS' | 'FAIL' | 'UNCERTAIN'
  reason: string
  legalBasis?: string   // 관련 법조문/기준
}

export interface AutoCheckResult {
  detectedProcess: string        // 감지된 공종 (예: "타일 시공")
  confidence: number             // 공종 인식 신뢰도 0~1
  goNoGo: GoNoGo
  checkedItems: CheckedItem[]
  issues: string[]               // 발견된 문제 목록
  recommendations: string[]      // 권장 조치 목록
  requiresHumanReview: string[]  // 사람이 직접 확인해야 할 항목
  rawAnalysis: string            // Gemini 원문 분석
}

// ═══════════════════════════════════════════════════════════
// 공종별 체크포인트 (process.json 요약 버전 — 프롬프트 주입용)
// ═══════════════════════════════════════════════════════════

const PROCESS_CHECKPOINTS: Record<string, string[]> = {
  '철거': ['석면 의심 자재 여부', '내력벽 철거 여부', '안전 보호구 착용', '분진 억제 살수 조치', '폐기물 분리 배출'],
  '방수': ['방수층 두께 2mm 이상', '코너·관통부 보강재 설치', '핀홀 없음', '구배 확보', '프라이머 도포 상태'],
  '설비': ['배수 배관 기울기 확보(1/100)', '수압 테스트 완료', '배관 보온재 시공', '배관 고정 간격 1.5m 이내', '가스 누설 없음'],
  '전기': ['분전반 용량 적정', '누전차단기 설치(30mA)', '접지 시공', '배선관 사용', '절연저항 측정'],
  '목공': ['목재 함수율 18% 이하', '경량철골 간격 준수(455mm)', '수직·수평 공차 3mm 이내', '석고보드 나사 간격', '방수 석고보드 욕실 사용'],
  '타일': ['줄눈 간격 2mm 이상', '공극률 95% 이상(바닥)', '평탄도 2m/±2mm', '타일 구배 확보', '접착제 오픈 타임 준수'],
  '도장': ['퍼티 2회 이상', '도막 두께 80㎛ 이상', '작업 환경 온습도(5℃ 이상·85% 이하)', '도장 인터벌 준수', '마스킹 처리'],
  '필름': ['기포 제거 완료', '이음새 처리', '모서리 성형', '바탕면 이물질 제거', '내수 필름 사용(욕실·주방)'],
  '가구': ['수평 ±1mm 이내', '벽 고정 앙카볼트 3개 이상', '문 유격 균일(2mm 이내)', '배수 P트랩 연결', '실리콘 마감'],
  '바닥재': ['팽창 이격 10~15mm', '함수율 8~10% 이하', '평탄도 3mm/2m', '온돌 온도 40℃ 이하', '줄눈/이음 처리'],
}

// ═══════════════════════════════════════════════════════════
// Vision 분석 프롬프트 생성
// ═══════════════════════════════════════════════════════════

function buildVisionPrompt(): string {
  const processNames = Object.keys(PROCESS_CHECKPOINTS).join(', ')

  return `당신은 인테리어·건설 현장 품질 검사 AI입니다.
첨부된 현장 사진을 분석하여 아래 JSON 형식으로만 응답하세요.

## 분석 순서
1. 사진에서 진행 중인 공종을 식별하세요.
   지원 공종: ${processNames}
   식별 불가 시 "알 수 없음"으로 표기

2. 식별된 공종의 체크포인트를 기준으로 사진 내 각 항목을 판단하세요.

3. 전체 GO/NO-GO를 판정하세요.
   - GO: 모든 주요 항목 PASS
   - NO-GO: 주요 항목 1개 이상 FAIL (즉시 시정 필요)
   - CONDITIONAL: 일부 UNCERTAIN, 추가 확인 필요

## 응답 형식 (JSON만, 마크다운 코드블록 없이)
{
  "detectedProcess": "공종명",
  "confidence": 0.0~1.0,
  "goNoGo": "GO|NO-GO|CONDITIONAL",
  "checkedItems": [
    {
      "itemId": "고유ID(영문숫자)",
      "itemName": "체크항목명",
      "result": "PASS|FAIL|UNCERTAIN",
      "reason": "【공감】사진에서 보이는 상태를 먼저 인정하는 한 문장 → 【설명】구체적으로 어떤 기준에 비춰 어떤 상태인지 → 【제안】개선하거나 유지할 수 있는 실천 방법. 예: '시공면이 깔끔하게 마무리되어 있어요. 다만 줄눈 간격이 기준(2mm 이상)보다 좁아 보입니다. 간격 조정 후 재시공을 검토해 보시면 좋겠습니다.'",
      "legalBasis": "관련 법령/기준 (있을 경우, 없으면 생략)"
    }
  ],
  "issues": ["발견된 문제를 위협적이지 않은 말투로 한 문장씩. 예: '줄눈 간격이 기준보다 좁아 추후 탈락 위험이 있어요.'"],
  "recommendations": ["실천 가능한 조치를 긍정적·구체적으로. 예: '줄눈 폭을 2mm 이상으로 맞춰 재시공하시면 내구성이 크게 올라갑니다.'"],
  "requiresHumanReview": ["사진만으로는 확인이 어려워 현장에서 직접 봐야 할 항목. 예: '접착제 오픈 타임 준수 여부는 현장에서 직접 확인해 주세요.'"]
}

## 주의사항
- 사진에서 명확히 보이는 것만 판단 (추측 금지)
- 확인 불가 항목은 UNCERTAIN으로 표기
- 모든 FAIL 항목에는 반드시 법적 근거 또는 기술 기준 명시
- 모든 텍스트 필드는 친절한 상담가 말투로 작성 (존댓말 필수)
- reason 필드는 반드시 공감 → 설명 → 제안 순서로 작성
- 판정(result·goNoGo) 값 자체는 변경하지 않음 — 텍스트만 친절하게
- 한국어로 작성`
}

// ═══════════════════════════════════════════════════════════
// JSON 파싱 헬퍼
// ═══════════════════════════════════════════════════════════

function parseGeminiResponse(raw: string): Omit<AutoCheckResult, 'rawAnalysis'> {
  // 마크다운 코드블록 제거
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // JSON 추출 (중괄호 범위)
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('JSON을 찾을 수 없습니다')

  const parsed = JSON.parse(cleaned.slice(start, end + 1))

  return {
    detectedProcess: parsed.detectedProcess ?? '알 수 없음',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    goNoGo: (['GO', 'NO-GO', 'CONDITIONAL'].includes(parsed.goNoGo) ? parsed.goNoGo : 'CONDITIONAL') as GoNoGo,
    checkedItems: Array.isArray(parsed.checkedItems) ? parsed.checkedItems : [],
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    requiresHumanReview: Array.isArray(parsed.requiresHumanReview) ? parsed.requiresHumanReview : [],
  }
}

// ═══════════════════════════════════════════════════════════
// 메인 함수 — 사진으로 자동 체크
// ═══════════════════════════════════════════════════════════

export async function autoCheckFromPhoto(
  image: ImageData,
  projectId: string,
): Promise<AutoCheckResult> {
  const prompt = buildVisionPrompt()

  // Gemini Vision 호출 (gemini-provider.ts 경유)
  const result = await callGemini(
    prompt,
    null,  // projectCtx 불필요
    undefined,
    image,
  )

  const raw = result.message

  try {
    const parsed = parseGeminiResponse(raw)
    return { ...parsed, rawAnalysis: raw }
  } catch {
    // JSON 파싱 실패 시 텍스트 응답을 최소 구조로 래핑
    return {
      detectedProcess: '분석 완료',
      confidence: 0.5,
      goNoGo: 'CONDITIONAL',
      checkedItems: [],
      issues: [],
      recommendations: ['전문가의 현장 확인을 권장합니다.'],
      requiresHumanReview: ['전체 항목 육안 확인 필요'],
      rawAnalysis: raw,
    }
  }
}

// ═══════════════════════════════════════════════════════════
// DB 저장 (human_confirmed = false 상태로)
// ═══════════════════════════════════════════════════════════

export async function saveCheckResult(
  projectId: string,
  photoUrl: string,
  result: AutoCheckResult,
  supabaseClient: any,
): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient
      .from('ai_check_results')
      .insert([{
        project_id: projectId,
        photo_url: photoUrl,
        detected_process: result.detectedProcess,
        go_no_go: result.goNoGo,
        check_items: result.checkedItems,
        issues: result.issues,
        human_confirmed: false,
      }])
      .select('id')
      .single()

    if (error) throw error
    return data?.id ?? null
  } catch (err) {
    console.error('[AutoChecker] DB 저장 실패:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════
// 사람 확인 처리
// ═══════════════════════════════════════════════════════════

export async function confirmCheckResult(
  resultId: string,
  userId: string,
  supabaseClient: any,
): Promise<void> {
  await supabaseClient
    .from('ai_check_results')
    .update({
      human_confirmed: true,
      confirmed_by: userId,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', resultId)
}
