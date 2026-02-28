-- ============================================================
-- 소방 안전 법령 5개 추가 (12개 → 17개)
-- 소방은 분쟁 예방이 아닌 생명 보호 영역 — risk_weight 최고값
-- ============================================================

INSERT INTO laws (code, name, article, title, description, check_conditions, violation_action, risk_weight, category, is_active, sort_order)
VALUES

-- 13. 소방시설법
(
  'FIRE_FACILITY',
  '소방시설법',
  '전체',
  '소방시설 설치 및 관리',
  '소방시설 설치 및 관리에 관한 법률. 건축물의 용도, 규모에 따라 소방시설 설치 의무. 스프링클러, 소화기, 자동화재탐지설비, 옥내소화전 등.',
  '{"type":"fire_checklist_check","condition":"소방시설 체크리스트가 존재하고 70% 이상 완료되었는지","target_category":"fire_facility","min_completion":70}',
  '소방시설 설치 체크리스트를 점검해주세요. 미설치 시 과태료 및 영업정지 대상입니다.',
  1.5,
  'fire_safety',
  true,
  13
),

-- 14. 화재예방법
(
  'FIRE_PREVENTION',
  '화재예방법',
  '전체',
  '화재 예방 및 안전관리',
  '화재의 예방 및 안전관리에 관한 법률. 공사 중 화기 사용 제한, 소방 안전관리자 선임, 소방 훈련 및 교육 의무.',
  '{"type":"fire_checklist_check","condition":"화재예방 체크리스트가 존재하고 60% 이상 완료되었는지","target_category":"fire_prevention","min_completion":60}',
  '화재예방 조치를 확인해주세요. 공사 중 화기 사용 시 소방 안전조치가 필수입니다.',
  1.4,
  'fire_safety',
  true,
  14
),

-- 15. 중대재해처벌법
(
  'SERIOUS_ACCIDENT',
  '중대재해처벌법',
  '제4조',
  '사업주의 안전보건 확보 의무',
  '사업주 또는 경영책임자의 안전 및 보건 확보 의무. 소방/안전 미비로 중대재해 발생 시 1년 이상 징역 또는 10억 이하 벌금. 2022년 시행.',
  '{"type":"compound_check","condition":"소방시설 + 안전 체크리스트 모두 충족되었는지","required_categories":["fire_facility","fire_prevention","safety"],"min_completion":80}',
  '중대재해처벌법 적용 대상입니다. 소방 및 안전 체크리스트를 즉시 완료해주세요.',
  1.5,
  'fire_safety',
  true,
  15
),

-- 16. 건축법 방화
(
  'BUILDING_FIRE',
  '건축법',
  '제49~53조',
  '방화구획 및 피난시설',
  '건축물의 방화구획, 피난계단, 비상구, 방화문 설치 기준. 인테리어 공사 시 방화구획 변경/훼손 금지.',
  '{"type":"fire_checklist_check","condition":"방화구획/피난시설 체크리스트가 존재하고 80% 이상 완료되었는지","target_category":"fire_escape","min_completion":80}',
  '방화구획 및 피난시설을 확인해주세요. 변경 시 소방서 사전 협의가 필요합니다.',
  1.3,
  'fire_safety',
  true,
  16
),

-- 17. 다중이용업소법
(
  'MULTI_USE',
  '다중이용업소법',
  '전체',
  '다중이용업소 안전관리',
  '다중이용업소의 안전관리에 관한 특별법. 카페, 식당, PC방, 노래방 등 다중이용업소는 소방완비증명서 필수. 영업장 내부 구조 변경 시 소방서 신고.',
  '{"type":"multi_use_check","condition":"다중이용업소 해당 프로젝트에서 소방완비증명 관련 체크리스트가 완료되었는지","applicable_types":["cafe","restaurant","commercial","entertainment"],"target_category":"fire_certificate","min_completion":90}',
  '다중이용업소는 소방완비증명서가 없으면 영업이 불가합니다. 소방 점검 체크리스트를 완료해주세요.',
  1.4,
  'fire_safety',
  true,
  17
);
