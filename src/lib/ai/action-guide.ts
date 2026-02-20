/**
 * action-guide.ts — 상황별 자동 행동 안내
 *
 * 어떤 상황이 감지되면 체키가 다음 행동을 자동으로 안내한다.
 * 복잡한 AI 호출 없이 규칙 기반으로 즉시 응답.
 *
 * 사용 예:
 * - 공정 완료 감지 → 다음 공정 안내
 * - 분쟁 감지 → 법적 대응 순서 안내
 * - 하자 발생 → 보수 요청 절차 안내
 * - 견적 검토 → 시세 확인 체크리스트
 */

// ═══════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════

export type ActionGuideSituation =
  | 'waterproofing_done'      // 방수 완료
  | 'concrete_done'           // 콘크리트 양생
  | 'demolition_done'         // 철거 완료
  | 'electrical_done'         // 전기 완료
  | 'plumbing_done'           // 배관 완료
  | 'tiling_done'             // 타일 완료
  | 'dispute_detected'        // 분쟁 징후 감지
  | 'defect_occurred'         // 하자 발생
  | 'quote_review'            // 견적 검토
  | 'contract_missing'        // 계약서 없음
  | 'verbal_agreement'        // 구두 합의
  | 'additional_cost'         // 추가 비용 발생
  | 'deadline_approaching'    // 마감 임박
  | 'warranty_expiring'       // 하자담보 만료
  | 'payment_overdue'         // 대금 미지급

export interface ActionStep {
  order: number
  title: string
  description: string
  urgent: boolean
  legalBasis?: string        // 법적 근거
}

export interface ActionGuide {
  situation: ActionGuideSituation
  title: string
  summary: string
  steps: ActionStep[]
  warningMessage?: string
  relatedLaw?: string
}

// ═══════════════════════════════════════════════════════════
// 상황별 행동 가이드 데이터
// ═══════════════════════════════════════════════════════════

const ACTION_GUIDES: Record<ActionGuideSituation, ActionGuide> = {
  waterproofing_done: {
    situation: 'waterproofing_done',
    title: '방수 완료 후 다음 단계',
    summary: '방수 공사 완료 직후 반드시 이 순서로 진행하세요.',
    steps: [
      {
        order: 1,
        title: '24시간 양생 대기',
        description: '방수재가 완전히 경화될 때까지 절대 발을 들여놓지 않습니다.',
        urgent: true,
      },
      {
        order: 2,
        title: '핀홀 테스트 실시',
        description: '스펀지와 전극을 이용한 핀홀 테스트로 방수 품질을 확인합니다. 미흡 시 보수 후 재테스트.',
        urgent: true,
        legalBasis: 'KCS 41 40 01',
      },
      {
        order: 3,
        title: '완료 사진 촬영',
        description: '방수층 전체, 코너 부위, 핀홀 테스트 결과를 사진으로 기록합니다.',
        urgent: false,
      },
      {
        order: 4,
        title: '타일 시공 진행',
        description: '테스트 통과 후 타일 시공 가능. 하자담보 3년 자동 시작.',
        urgent: false,
        legalBasis: '건설산업기본법 시행령 별표4',
      },
    ],
    warningMessage: '핀홀 테스트 없이 타일 시공 시 누수 책임은 시공사에 있습니다.',
    relatedLaw: '건설산업기본법 제28조 (하자담보책임)',
  },

  concrete_done: {
    situation: 'concrete_done',
    title: '콘크리트 타설 후 다음 단계',
    summary: '콘크리트 타설 완료 후 양생 관리가 핵심입니다.',
    steps: [
      {
        order: 1,
        title: '양생 기간 확보 (최소 28일)',
        description: '설계 강도의 70% 달성까지 28일이 필요합니다. 조기 하중 절대 금지.',
        urgent: true,
        legalBasis: 'KCS 14 20 10',
      },
      {
        order: 2,
        title: '양생 중 보양 조치',
        description: '직사광선, 급격한 건조, 동결 방지를 위한 보양포 설치.',
        urgent: true,
      },
      {
        order: 3,
        title: '압축강도 테스트',
        description: '7일, 28일 테스트를 실시하고 결과를 기록합니다.',
        urgent: false,
        legalBasis: 'KCS 14 20 10 5.5',
      },
    ],
    relatedLaw: 'KCS 14 20 10 (콘크리트 표준시방서)',
  },

  demolition_done: {
    situation: 'demolition_done',
    title: '철거 완료 후 다음 단계',
    summary: '철거 후 즉시 확인해야 할 사항들입니다.',
    steps: [
      {
        order: 1,
        title: '잔재물 반출 확인',
        description: '모든 폐기물이 허가된 업체에 의해 처리되었는지 확인합니다.',
        urgent: true,
        legalBasis: '건설폐기물의 재활용촉진에 관한 법률',
      },
      {
        order: 2,
        title: '구조체 이상 유무 점검',
        description: '내력벽, 기둥, 보 등 구조체에 균열이나 손상이 없는지 확인합니다.',
        urgent: true,
      },
      {
        order: 3,
        title: '방수·방습 확인',
        description: '철거 과정에서 기존 방수층이 손상되지 않았는지 확인합니다.',
        urgent: false,
      },
    ],
    warningMessage: '내력벽 철거는 건축사 사전 확인 필수입니다.',
  },

  electrical_done: {
    situation: 'electrical_done',
    title: '전기 배선 완료 후 다음 단계',
    summary: '전기 공사 완료 후 안전 점검 순서입니다.',
    steps: [
      {
        order: 1,
        title: '절연 저항 테스트',
        description: '각 회로별 절연 저항을 측정합니다. 규정값 미달 시 재시공.',
        urgent: true,
        legalBasis: '전기설비기술기준',
      },
      {
        order: 2,
        title: '분전반 결선 확인',
        description: '차단기 용량, 회로 분리가 설계도면과 일치하는지 확인합니다.',
        urgent: true,
      },
      {
        order: 3,
        title: '마감 전 사진 기록',
        description: '배선 경로, 접속함 위치를 사진으로 기록합니다. 추후 하자 대응에 필수.',
        urgent: false,
      },
    ],
    relatedLaw: '전기설비기술기준 (산업통상자원부고시)',
  },

  plumbing_done: {
    situation: 'plumbing_done',
    title: '배관 완료 후 다음 단계',
    summary: '배관 매립 전 반드시 이 확인을 거쳐야 합니다.',
    steps: [
      {
        order: 1,
        title: '수압 테스트 (1.5배 압력, 30분)',
        description: '설계 최고 사용압력의 1.5배로 30분간 가압합니다. 누수 없어야 합니다.',
        urgent: true,
        legalBasis: 'KCS 31 20 10',
      },
      {
        order: 2,
        title: '테스트 결과 사진/영상 기록',
        description: '압력 게이지, 배관 전체를 영상으로 기록합니다.',
        urgent: true,
      },
      {
        order: 3,
        title: '매립 후 마감 진행',
        description: '테스트 통과 후 매립. 매립 후에는 수정 불가.',
        urgent: false,
      },
    ],
    relatedLaw: 'KCS 31 20 10 (기계설비공사 표준시방서)',
  },

  tiling_done: {
    situation: 'tiling_done',
    title: '타일 시공 완료 후 다음 단계',
    summary: '타일 시공 완료 후 확인 사항입니다.',
    steps: [
      {
        order: 1,
        title: '공동음(Hollow) 검사',
        description: '고무 망치로 두드려 들뜬 타일이 없는지 확인합니다.',
        urgent: true,
      },
      {
        order: 2,
        title: '줄눈 균일성 확인',
        description: '줄눈 폭, 색상이 균일한지 확인합니다.',
        urgent: false,
      },
      {
        order: 3,
        title: '코너·문지방 마감 확인',
        description: '코너비드, 문지방 마감이 깔끔하게 처리되었는지 확인합니다.',
        urgent: false,
      },
    ],
  },

  dispute_detected: {
    situation: 'dispute_detected',
    title: '분쟁 징후 감지 — 즉시 행동',
    summary: '분쟁으로 번지기 전에 지금 바로 이 순서대로 행동하세요.',
    steps: [
      {
        order: 1,
        title: '모든 대화 캡처 보관',
        description: '카카오톡, 문자, 이메일 등 모든 커뮤니케이션을 즉시 캡처합니다.',
        urgent: true,
      },
      {
        order: 2,
        title: '현장 상태 사진/영상 기록',
        description: '현재 시공 상태를 날짜 스탬프가 포함된 사진/영상으로 기록합니다.',
        urgent: true,
      },
      {
        order: 3,
        title: '서면으로 입장 전달',
        description: '구두 합의는 효력이 없습니다. 모든 합의는 서면(카카오톡 문자도 인정됨)으로 남깁니다.',
        urgent: true,
        legalBasis: '민법 제665조',
      },
      {
        order: 4,
        title: '내용증명 발송 검토',
        description: '상황이 심각하다면 내용증명으로 공식 입장을 전달합니다.',
        urgent: false,
        legalBasis: '우편법 제15조',
      },
    ],
    warningMessage: '구두합의는 법적 효력이 없어요. 반드시 서면으로 남기세요!',
    relatedLaw: '민법 제665조 (도급 보수청구권)',
  },

  defect_occurred: {
    situation: 'defect_occurred',
    title: '하자 발생 — 대응 순서',
    summary: '하자담보기간 내에 반드시 이 순서로 대응하세요.',
    steps: [
      {
        order: 1,
        title: '즉시 사진/영상 촬영',
        description: '하자 발생 즉시 날짜 스탬프 포함 사진/영상을 촬영합니다. 지체하면 증거 무효.',
        urgent: true,
      },
      {
        order: 2,
        title: '서면으로 하자 보수 요청',
        description: '문자, 이메일, 내용증명으로 하자 내용과 보수 요청을 서면 발송합니다.',
        urgent: true,
        legalBasis: '민법 제667조',
      },
      {
        order: 3,
        title: '하자담보기간 확인',
        description: '공종별 담보기간 내인지 확인합니다. (방수 3년, 마감 1년, 구조체 10년)',
        urgent: true,
        legalBasis: '건설산업기본법 시행령 별표4',
      },
      {
        order: 4,
        title: '미보수 시 손해배상 청구',
        description: '상당한 기간 내 보수 안 할 경우 손해배상 청구 가능합니다.',
        urgent: false,
        legalBasis: '민법 제667조 제2항',
      },
    ],
    warningMessage: '하자담보기간이 지나면 청구권이 소멸합니다. 지금 바로 서면 발송!',
    relatedLaw: '민법 제667조 (수급인의 담보책임)',
  },

  quote_review: {
    situation: 'quote_review',
    title: '견적서 검토 체크리스트',
    summary: '견적서를 받으면 이 항목들을 반드시 확인하세요.',
    steps: [
      {
        order: 1,
        title: '공종별 단가 시세 비교',
        description: '평단가 기준으로 시세와 비교합니다. 20% 이상 차이 나면 근거를 요청하세요.',
        urgent: true,
      },
      {
        order: 2,
        title: '빠진 항목 확인',
        description: '도배, 조명, 철거, 폐기물 처리, 이사/이전 비용이 포함됐는지 확인합니다.',
        urgent: true,
      },
      {
        order: 3,
        title: '계약금 비율 확인',
        description: '계약금이 전체의 10%를 초과하지 않아야 합니다.',
        urgent: true,
        legalBasis: '인테리어 공사 표준계약서 (공정거래위원회)',
      },
      {
        order: 4,
        title: '추가 공사 범위 명확화',
        description: '"추가 발생 시 별도" 항목의 범위를 구체적으로 명시하도록 요청합니다.',
        urgent: false,
      },
    ],
    warningMessage: '계약금이 10% 초과라면 다시 협의하세요.',
  },

  contract_missing: {
    situation: 'contract_missing',
    title: '계약서 없는 공사 — 즉시 작성',
    summary: '공사 시작 전 반드시 서면 계약서를 작성해야 합니다.',
    steps: [
      {
        order: 1,
        title: '공정거래위원회 표준계약서 사용',
        description: '공정위 표준 인테리어 공사 계약서를 기반으로 작성합니다.',
        urgent: true,
        legalBasis: '공정거래위원회 고시 표준약관',
      },
      {
        order: 2,
        title: '공사 범위 명확히 기재',
        description: '어디서 어디까지가 공사 범위인지 평면도 기준으로 기재합니다.',
        urgent: true,
      },
      {
        order: 3,
        title: '단가, 총액, 지급 조건 명기',
        description: '항목별 단가, 총액, 중도금/잔금 조건을 명확히 기재합니다.',
        urgent: true,
      },
      {
        order: 4,
        title: '하자담보 조항 포함',
        description: '공종별 하자담보기간을 명시합니다.',
        urgent: false,
        legalBasis: '건설산업기본법 제28조',
      },
    ],
    warningMessage: '계약서 없이 공사 진행 시 분쟁 시 100% 불리합니다.',
    relatedLaw: '건설산업기본법 제22조 (건설공사 시공자)',
  },

  verbal_agreement: {
    situation: 'verbal_agreement',
    title: '구두합의 위험 — 서면화 필수',
    summary: '구두합의는 법적 효력이 없습니다. 지금 바로 서면으로 전환하세요.',
    steps: [
      {
        order: 1,
        title: '합의 내용 문자/카카오톡으로 정리',
        description: '"오늘 합의한 내용: ..."으로 시작하는 메시지를 상대방에게 보냅니다. 답장이 없어도 기록이 남습니다.',
        urgent: true,
        legalBasis: '민법 제527조',
      },
      {
        order: 2,
        title: '상대방 확인 회신 요청',
        description: '"확인 부탁드립니다"로 끝내고 확인 회신을 보관합니다.',
        urgent: true,
      },
      {
        order: 3,
        title: '중요 사항은 계약서 추가',
        description: '금액 변경, 공사 범위 변경은 계약서 변경 합의서를 작성합니다.',
        urgent: false,
      },
    ],
    warningMessage: '구두합의는 법적 효력 없음. 민법 제665조 기준으로 서면이 원칙.',
    relatedLaw: '민법 제665조 (보수의 지급시기)',
  },

  additional_cost: {
    situation: 'additional_cost',
    title: '추가 비용 발생 — 서면 합의 먼저',
    summary: '추가 공사 비용은 반드시 사전 서면 합의 후 진행해야 합니다.',
    steps: [
      {
        order: 1,
        title: '공사 일시 중단',
        description: '서면 합의 없이 추가 공사 절대 진행하지 않습니다.',
        urgent: true,
      },
      {
        order: 2,
        title: '추가 비용 근거 서면 제시',
        description: '추가 발생 이유, 항목, 금액을 항목별로 서면으로 제시합니다.',
        urgent: true,
        legalBasis: '민법 제665조',
      },
      {
        order: 3,
        title: '고객 서면 승인 후 진행',
        description: '문자, 이메일 등 서면으로 승인 받은 후에만 공사를 진행합니다.',
        urgent: true,
      },
    ],
    warningMessage: '서면 합의 없이 진행 시 추가 비용 청구 불가능합니다.',
    relatedLaw: '민법 제665조',
  },

  deadline_approaching: {
    situation: 'deadline_approaching',
    title: '마감 임박 — 우선순위 정리',
    summary: '마감이 임박했을 때 집중해야 할 것들입니다.',
    steps: [
      {
        order: 1,
        title: '미완료 공정 리스트업',
        description: '완료 안 된 공정을 모두 리스트업하고 우선순위를 정합니다.',
        urgent: true,
      },
      {
        order: 2,
        title: '지연 불가피 시 고객 즉시 통보',
        description: '지연이 예상되면 지금 바로 고객에게 알리고 새 마감일을 합의합니다.',
        urgent: true,
        legalBasis: '민법 제390조 (채무불이행)',
      },
      {
        order: 3,
        title: '지연 합의서 작성',
        description: '합의된 새 마감일을 서면으로 남깁니다.',
        urgent: false,
      },
    ],
    warningMessage: '마감 초과 시 지체상금이 발생할 수 있습니다.',
    relatedLaw: '민법 제398조 (손해배상액의 예정)',
  },

  warranty_expiring: {
    situation: 'warranty_expiring',
    title: '하자담보 만료 임박 — 최종 점검',
    summary: '만료 전 반드시 현장을 재점검하고 하자를 청구하세요.',
    steps: [
      {
        order: 1,
        title: '전체 시공 부위 재점검',
        description: '만료 예정 공종의 모든 시공 부위를 육안으로 점검합니다.',
        urgent: true,
      },
      {
        order: 2,
        title: '하자 발견 시 즉시 서면 통보',
        description: '하자가 있으면 만료 전에 반드시 서면으로 보수를 요청합니다.',
        urgent: true,
        legalBasis: '민법 제667조',
      },
      {
        order: 3,
        title: '보수 완료 확인서 수령',
        description: '보수 완료 시 확인서를 서면으로 수령합니다.',
        urgent: false,
      },
    ],
    warningMessage: '만료 후에는 하자담보 청구권이 소멸됩니다!',
    relatedLaw: '건설산업기본법 시행령 별표4 (하자담보책임 기간)',
  },

  payment_overdue: {
    situation: 'payment_overdue',
    title: '대금 미지급 — 법적 대응 순서',
    summary: '대금 미지급 시 이 순서로 대응하세요.',
    steps: [
      {
        order: 1,
        title: '내용증명 발송',
        description: '지급 기한을 명시한 내용증명을 발송합니다. 법적 대응의 시작점.',
        urgent: true,
        legalBasis: '민법 제544조 (이행의 최고)',
      },
      {
        order: 2,
        title: '지급 기한 경과 후 유치권 행사',
        description: '공사 완료된 건물에 유치권을 행사할 수 있습니다.',
        urgent: false,
        legalBasis: '민법 제320조 (유치권의 내용)',
      },
      {
        order: 3,
        title: '지급명령 신청',
        description: '법원에 지급명령을 신청합니다. 비용 저렴, 빠른 절차.',
        urgent: false,
        legalBasis: '민사소송법 제462조',
      },
    ],
    relatedLaw: '민법 제665조, 제320조',
  },
}

// ═══════════════════════════════════════════════════════════
// 공개 함수
// ═══════════════════════════════════════════════════════════

/**
 * 상황 코드로 행동 가이드를 반환한다.
 */
export function getActionGuide(situation: ActionGuideSituation): ActionGuide {
  return ACTION_GUIDES[situation]
}

/**
 * 키워드로 관련 행동 가이드를 검색한다.
 */
export function searchActionGuide(keyword: string): ActionGuide[] {
  const lower = keyword.toLowerCase()
  return Object.values(ACTION_GUIDES).filter(guide =>
    guide.title.includes(keyword) ||
    guide.summary.includes(keyword) ||
    guide.steps.some(s => s.title.includes(keyword) || s.description.includes(keyword)) ||
    guide.warningMessage?.includes(keyword)
  )
}

/**
 * 공정 이름으로 관련 완료 가이드를 반환한다.
 */
export function getProcessCompletionGuide(processName: string): ActionGuide | null {
  const name = processName.toLowerCase()

  if (name.includes('방수')) return ACTION_GUIDES.waterproofing_done
  if (name.includes('콘크리트') || name.includes('레미콘')) return ACTION_GUIDES.concrete_done
  if (name.includes('철거')) return ACTION_GUIDES.demolition_done
  if (name.includes('전기') || name.includes('배선')) return ACTION_GUIDES.electrical_done
  if (name.includes('배관') || name.includes('급수') || name.includes('급탕')) return ACTION_GUIDES.plumbing_done
  if (name.includes('타일')) return ACTION_GUIDES.tiling_done

  return null
}

/**
 * 모든 가이드 목록을 반환한다.
 */
export function getAllActionGuides(): ActionGuide[] {
  return Object.values(ACTION_GUIDES)
}
