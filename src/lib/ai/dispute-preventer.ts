/**
 * dispute-preventer.ts — 분쟁 징후 자동 감지 엔진
 *
 * 사용자 메시지에서 인테리어 7대 분쟁 징후 키워드를 감지하고
 * 관련 법적 근거 + 권장 조치를 자동으로 반환한다.
 *
 * 사용: brain.ts chat 케이스에서 callWithFallback 전에 호출
 */

// ═══════════════════════════════════════════════════════════
// 분쟁 유형 정의
// ═══════════════════════════════════════════════════════════

export type DisputeType =
  | 'verbal_agreement'     // 구두 합의
  | 'additional_cost'      // 추가 공사비
  | 'abandonment_risk'     // 먹튀 위험
  | 'quality_issue'        // 품질 불량
  | 'delay'                // 공사 지연
  | 'subcontractor_wage'   // 하도급 임금 체불
  | 'no_contract'          // 계약서 없음

export interface DisputeAlert {
  detected: boolean
  types: DisputeSignal[]
}

export interface DisputeSignal {
  type: DisputeType
  matchedKeywords: string[]
  severity: 'warning' | 'danger'   // warning: 주의, danger: 즉각 대응 필요
  legalBasis: string                // 관련 법조문
  recommendedAction: string         // 권장 조치
  warningMessage: string            // 체키 경고 메시지
}

// ═══════════════════════════════════════════════════════════
// 분쟁 징후 키워드 매핑
// ═══════════════════════════════════════════════════════════

interface SignalRule {
  type: DisputeType
  keywords: string[]
  severity: 'warning' | 'danger'
  legalBasis: string
  recommendedAction: string
  warningMessage: string
}

const SIGNAL_RULES: SignalRule[] = [
  {
    type: 'verbal_agreement',
    keywords: [
      '구두로', '말로 했', '말했잖', '그렇게 하기로', '그렇게 하자고',
      '나중에 정산', '나중에 계약', '알아서 해', '알아서 하기로',
      '말로만', '구두 합의', '말로 합의',
    ],
    severity: 'danger',
    legalBasis: '민법 제666조(도급계약) — 구두 계약도 효력 있으나 입증 책임은 주장하는 자에게 있음',
    recommendedAction: '지금 바로 합의 내용을 카톡·문자로 재확인하고, 변경계약서에 서명하세요.',
    warningMessage: '⚠️ 분쟁 위험: 구두 합의는 나중에 "그런 말 한 적 없다"는 분쟁의 80% 원인입니다. 모든 합의는 서면(카톡 포함)으로 남기세요.',
  },
  {
    type: 'additional_cost',
    keywords: [
      '추가로', '추가 비용', '추가 공사', '더 달라', '더 내라',
      '이것도 해야', '이것도 포함', '원래 계획에 없던', '계약에 없는',
      '변경 비용', '올랐어', '자재비 올라서',
    ],
    severity: 'warning',
    legalBasis: '민법 제665조(도급인의 보수지급의무) — 계약서에 없는 추가 공사는 서면 합의 없이 지급 의무 없음',
    recommendedAction: '추가 공사 내용·금액을 서면으로 확인하고, 변경계약서(사진+금액+서명)를 작성하세요.',
    warningMessage: '⚠️ 추가 비용 분쟁 위험: 계약서에 없는 추가 공사는 서면 변경계약서 없이는 지급 거부가 가능합니다.',
  },
  {
    type: 'abandonment_risk',
    keywords: [
      '잠수', '잠적', '연락두절', '연락이 안', '폐업', '사라졌',
      '먹튀', '돈만 받고', '계약금만 받고', '선금만 받고',
      '나중에 계약서', '일단 시작하고',
    ],
    severity: 'danger',
    legalBasis: '건설산업기본법 제9조 — 1,500만 원 이상 공사는 실내건축공사업 등록 업체만 시공 가능',
    recommendedAction: '키스콘(www.kiscon.net)에서 업체 면허 확인, 계약금은 10% 이하로 제한, 기성 분할 지급하세요.',
    warningMessage: '🚨 먹튀 위험: 계약금을 많이 지급하기 전에 반드시 키스콘에서 면허를 확인하세요. 1,500만 원 이상 무면허 시공은 불법입니다.',
  },
  {
    type: 'quality_issue',
    keywords: [
      '원래 이래', '원래 이렇게', '우리 잘못 아니야', '우리 책임 아니야',
      '별거 아니야', '그냥 두면 돼', '다른 데 문제', '자재 탓',
      '시공 품질', '마감이 이상', '수평이 안', '평형이 안',
    ],
    severity: 'warning',
    legalBasis: '민법 제667조(수급인의 담보책임) — 하자 발생 시 시공 후 1년 이내 보수 청구 가능',
    recommendedAction: '하자 부위 사진·동영상 촬영 후 내용증명으로 보수 요청(2주 기한 부여)하세요.',
    warningMessage: '⚠️ 하자 분쟁 위험: "원래 이렇다"는 주장에 대응하려면 시공 전후 사진이 필수입니다. 지금 바로 현장 사진을 촬영하세요.',
  },
  {
    type: 'delay',
    keywords: [
      '언제 끝나', '아직도 안 끝', '이렇게 늦어', '지연',
      '다른 현장 가서', '다른 현장 때문', '자재가 늦게', '자재 때문에',
      '곧 할게요', '다음 주에', '다음 주부터', '잠깐만 기다려',
    ],
    severity: 'warning',
    legalBasis: '표준계약서 지체보상금 조항 — 준공 기한 초과 시 1일당 공사대금의 0.1% 청구 가능',
    recommendedAction: '준공일 초과 일수를 기록하고, 지체보상금 계산(공사대금 × 0.001 × 지연일수) 후 내용증명을 발송하세요.',
    warningMessage: '⚠️ 공사 지연 감지: 계약서에 준공일과 지체보상금 조항이 있다면 지연일수만큼 청구할 수 있습니다.',
  },
  {
    type: 'subcontractor_wage',
    keywords: [
      '돈 못 받', '기성 못 받', '임금 못 받', '돈을 안 줘',
      '기성금 안 줘', '원도급이 안 줘', '원청이 안 줘',
      '직불 청구', '발주자한테 바로',
    ],
    severity: 'danger',
    legalBasis: '하도급거래공정화법 제13조·제14조 — 60일 이내 미지급 시 발주자에게 직접 청구 가능, 지연이자 연 15.5%',
    recommendedAction: '내용증명으로 지급 최고 → 원도급 60일 초과 미지급 시 발주자 직접 청구(하도급법 제14조) → 공정위 신고(1380)',
    warningMessage: '⚠️ 임금 체불 감지: 원도급이 안 줘도 발주자에게 직접 청구할 수 있습니다(하도급법 제14조). 지연이자 연 15.5%도 청구 가능합니다.',
  },
  {
    type: 'no_contract',
    keywords: [
      '계약서 없이', '계약서 안 쓰고', '계약서 없는', '계약서 미작성',
      '사인 안 했는데', '도장 안 찍었는데', '계약 안 했는데',
    ],
    severity: 'danger',
    legalBasis: '건설산업기본법 제16조 — 건설공사 도급계약은 서면으로 체결 의무',
    recommendedAction: '즉시 서면 계약서 작성하세요. 공정위 인테리어 표준계약서 양식 사용 권장.',
    warningMessage: '🚨 계약서 없음: 계약서 없이 공사를 진행하면 분쟁 발생 시 아무것도 증명할 수 없습니다. 지금 당장 서면 계약서를 요청하세요.',
  },
]

// ═══════════════════════════════════════════════════════════
// 분쟁 징후 감지 메인 함수
// ═══════════════════════════════════════════════════════════

/**
 * 텍스트에서 분쟁 징후 키워드를 감지한다.
 * brain.ts의 chat 케이스에서 사용.
 */
export function detectDisputeSignals(text: string): DisputeAlert {
  const normalized = text.toLowerCase()
  const signals: DisputeSignal[] = []

  for (const rule of SIGNAL_RULES) {
    const matched = rule.keywords.filter(kw => normalized.includes(kw.toLowerCase()))
    if (matched.length > 0) {
      signals.push({
        type: rule.type,
        matchedKeywords: matched,
        severity: rule.severity,
        legalBasis: rule.legalBasis,
        recommendedAction: rule.recommendedAction,
        warningMessage: rule.warningMessage,
      })
    }
  }

  return {
    detected: signals.length > 0,
    types: signals,
  }
}

/**
 * 감지된 분쟁 징후를 AI 프롬프트에 주입할 컨텍스트 문자열로 변환한다.
 * 가장 심각한 경고 1~2개만 포함하여 프롬프트 오염 방지.
 */
export function buildDisputeContext(alert: DisputeAlert): string {
  if (!alert.detected) return ''

  // danger를 먼저, 중복 제거
  const sorted = [...alert.types].sort((a, b) =>
    a.severity === 'danger' && b.severity !== 'danger' ? -1 : 1
  )
  const top = sorted.slice(0, 2) // 최대 2개

  const lines: string[] = ['\n\n[체키 분쟁 감지 컨텍스트 — 아래 내용을 답변에 반드시 포함]']
  for (const sig of top) {
    lines.push(`${sig.warningMessage}`)
    lines.push(`📌 법적 근거: ${sig.legalBasis}`)
    lines.push(`✅ 권장 조치: ${sig.recommendedAction}`)
  }

  return lines.join('\n')
}
