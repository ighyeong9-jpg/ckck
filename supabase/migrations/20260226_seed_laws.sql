-- ============================================================
-- Check-In 12개 법령 마스터 데이터 시딩
-- Migration: 20260226_seed_laws.sql
-- 반드시 20260226_add_law_engine_tables.sql 실행 후 실행
-- ============================================================

-- 중복 방지: 기존 데이터 삭제 후 재삽입
TRUNCATE TABLE laws RESTART IDENTITY CASCADE;

INSERT INTO laws (code, name, article, title, description, check_conditions, violation_action, risk_weight, category, sort_order)
VALUES

-- 01. 건설산업기본법 제28조
(
  'CONST_BASIC_28',
  '건설산업기본법',
  '제28조',
  '하자담보책임',
  '건설공사의 수급인은 발주자에 대해 공종별 하자담보기간 동안 하자보수 책임을 진다. 발주자는 하자발생 시 하자보수를 청구할 수 있으며, 수급인이 이에 응하지 않으면 손해배상을 청구할 수 있다.',
  '{"type":"CONST_BASIC_28","condition":"공종별 하자담보기간이 warranties 테이블에 등록되어 있는가","requires":["warranties"],"auto_checkable":true,"check_query":"SELECT COUNT(*) FROM warranties WHERE project_id = $1"}',
  '하자담보기간을 즉시 등록하고, 공종별 담보책임 체계를 수립하세요. warranties 테이블에 각 공종의 시작일과 종료일을 입력하세요.',
  1.2,
  'warranty',
  1
),

-- 02. 민법 제667조
(
  'CIVIL_667',
  '민법',
  '제667조',
  '수급인의 담보책임',
  '수급인은 완성된 목적물 또는 완성 전 성취한 부분에 하자가 있는 때에는 도급인은 수급인에 대해 상당한 기간을 정해 그 하자의 보수를 청구할 수 있다.',
  '{"type":"CIVIL_667","condition":"시공 하자 발견 시 보수 청구 절차가 문서화되어 있는가","requires":["diagnostic_responses","evidence_files"],"auto_checkable":true,"check_query":"SELECT COUNT(*) FROM diagnostic_responses WHERE project_id = $1"}',
  '체크리스트를 통해 시공 상태를 지속 점검하고, 하자 발견 시 즉시 기록하여 보수 청구 근거를 확보하세요.',
  1.0,
  'warranty',
  2
),

-- 03. 건산법 시행령 별표4
(
  'CONST_REG_SCH4',
  '건설산업기본법 시행령',
  '별표4',
  '공종별 하자담보기간',
  '공종별 하자담보기간: 철근콘크리트/철골공사 5년, 방수공사 3년, 전기/통신/설비공사 2년, 수장/도장/석/창호공사 1년 등 건산법 시행령 별표4 기준.',
  '{"type":"CONST_REG_SCH4","condition":"공종별 하자담보기간이 별표4 최소 기간 이상인가","requires":["warranties"],"auto_checkable":true,"min_periods":{"철근콘크리트공사":5,"철골공사":5,"방수공사":3,"전기공사":2,"통신공사":2,"설비공사":2,"수장공사":1,"도장공사":1,"석공사":1,"창호공사":1,"대지조성공사":2,"조경공사":2}}',
  '각 공종의 하자담보기간이 별표4 기준 이상인지 확인하세요. 기간이 미달하면 법적 분쟁 시 불리합니다.',
  1.1,
  'warranty',
  3
),

-- 04. 공정거래법
(
  'FTC_SUBCONTRACT',
  '공정거래법',
  '하도급법 제4조',
  '하도급대금 부당감액 금지',
  '원사업자는 수급사업자에게 제조 등의 위탁을 하는 경우 부당하게 대금을 결정하거나 감액할 수 없다. 원계약 대비 10% 초과 감액은 경고, 20% 초과는 위반으로 판정한다.',
  '{"type":"FTC_SUBCONTRACT","condition":"하도급 대금이 원계약 대비 부당하게 감액되지 않았는가","requires":["change_orders","quote_line_items"],"auto_checkable":true,"warning_threshold":0.10,"violation_threshold":0.20}',
  '하도급 계약서와 변경 내역을 확인하여 부당 감액이 없는지 점검하세요. 변경관리 모듈에서 비용 영향을 추적하세요.',
  0.8,
  'contract',
  4
),

-- 05. 민법 제580조
(
  'CIVIL_580',
  '민법',
  '제580조',
  '매도인의 하자담보책임',
  '매매의 목적물에 하자가 있는 때에는 매수인은 계약을 해제하거나 손해배상을 청구할 수 있다. 자재 납품 계약에서 자재 하자 발견 시 매도인 책임 추적이 필요하다.',
  '{"type":"CIVIL_580","condition":"자재 하자 발견 시 매도인 책임 추적 가능한 증거가 있는가","requires":["evidence_files","materials"],"auto_checkable":true,"check_category":"자재","min_evidence_count":1}',
  '자재 입고 시 검수 사진을 촬영하고 증빙패키지에 등록하세요. evidence_files에 category=자재로 저장하세요.',
  0.7,
  'quality',
  5
),

-- 06. 건설분쟁조정
(
  'CONST_DISPUTE',
  '건설산업기본법',
  '제69조',
  '건설분쟁조정위원회 절차',
  '건설공사에 관한 분쟁이 발생한 경우 국토교통부 건설분쟁조정위원회에 조정을 신청할 수 있다. 분쟁 조정 신청 시 증거 확보가 필수적이다.',
  '{"type":"CONST_DISPUTE","condition":"분쟁 발생 시 조정 신청 가능한 증거가 확보되어 있는가","requires":["evidence_files"],"auto_checkable":true,"applies_when":{"min_risk_score":50},"min_evidence_count":3}',
  '리스크 점수 50점 이상이면 증거 확보를 강화하세요. 증빙패키지에 is_evidence=true 파일 3개 이상 등록을 권고합니다.',
  0.9,
  'dispute',
  6
),

-- 07. 소비자기본법
(
  'CONSUMER_BASIC',
  '소비자기본법',
  '제16조',
  '소비자 분쟁해결기준',
  '소비자분쟁해결기준에 따라 사업자는 소비자에게 물품 또는 서비스를 제공함에 있어 발생한 분쟁을 해결하기 위한 기준을 마련해야 한다. 개인 발주자(소비자) 대상 공사에 적용.',
  '{"type":"CONSUMER_BASIC","condition":"소비자 분쟁해결기준에 따른 보상 기준이 계약에 포함되어 있는가","requires":["agreements"],"auto_checkable":true,"applies_to":["residential","apartment","villa","house","oneroom","officetel"]}',
  '주거용 프로젝트는 합의서에 소비자 분쟁해결기준 관련 조항을 포함하세요. agreement 모듈에서 계약 내용을 확인하세요.',
  0.8,
  'dispute',
  7
),

-- 08. 전자서명법
(
  'E_SIGN',
  '전자서명법',
  '제3조',
  '전자문서 및 전자서명의 법적 효력',
  '전자문서 및 전자서명은 다른 법률에 특별한 규정이 없는 한 전자적 형태로 되어 있다는 이유로 효력이 부인되지 않는다. SHA-256 해시는 문서 무결성의 증거로 활용 가능.',
  '{"type":"E_SIGN","condition":"체크리스트/사진에 전자서명(SHA-256 해시)이 적용되었는가","requires":["evidence_files"],"auto_checkable":true,"check_null_hash":true}',
  '모든 증빙 파일 업로드 시 SHA-256 해시가 자동 생성되는지 확인하세요. evidence_files.sha256_hash가 null인 파일이 없어야 합니다.',
  1.0,
  'quality',
  8
),

-- 09. 근로기준법
(
  'LABOR_STD',
  '근로기준법',
  '제43조',
  '임금 지급 의무',
  '사용자는 임금을 매월 1회 이상 일정한 날짜를 정하여 지급해야 한다. 건설 현장에서 근로자 임금 지급 기록이 없는 경우 분쟁 시 불리하게 작용할 수 있다.',
  '{"type":"LABOR_STD","condition":"근로자 임금 지급 기록이 있는가","requires":["workforce"],"auto_checkable":true,"check_query":"SELECT COUNT(*) FROM workforce WHERE project_id = $1"}',
  '인력관리 모듈에서 근로자 출근 기록과 임금 지급 내역을 관리하세요. 기록이 없으면 분쟁 시 책임 소재 확인이 어렵습니다.',
  0.9,
  'safety',
  9
),

-- 10. 산업안전보건법
(
  'ISAFETY',
  '산업안전보건법',
  '제38조',
  '안전조치 의무',
  '사업주는 사업을 할 때 추락, 붕괴, 감전 등으로 인한 위험을 예방하기 위해 필요한 조치를 해야 한다. 건설 현장 안전 체크리스트 완료 및 안전 교육이 핵심.',
  '{"type":"ISAFETY","condition":"안전 체크리스트 완료율이 80% 이상인가","requires":["diagnostic_responses"],"auto_checkable":true,"safety_categories":["안전"],"min_completion_rate":0.80}',
  '안전 카테고리 체크리스트를 즉시 점검하세요. 완료율이 80% 미만이면 작업 중단 및 안전 조치를 우선 시행해야 합니다.',
  1.3,
  'safety',
  10
),

-- 11. 건축법
(
  'BUILDING_ACT',
  '건축법',
  '제22조',
  '건축물 사용승인',
  '건축물의 건축주는 공사를 완료한 후 그 건축물을 사용하려면 허가권자에게 사용승인을 신청해야 한다. 사용승인 전 관련 서류 준비가 필요하다.',
  '{"type":"BUILDING_ACT","condition":"사용승인 필요 서류/검사가 준비되어 있는가","requires":["diagnostic_responses"],"auto_checkable":true,"applies_when":{"status":["completed","inspection"]},"check_categories":["법규"]}',
  '준공 전 법규 카테고리 체크리스트를 완료하세요. 사용승인 관련 항목(사용검사 신청, 소방검사 등)이 모두 체크되어야 합니다.',
  1.0,
  'quality',
  11
),

-- 12. 민사소송법
(
  'CIV_PROC',
  '민사소송법',
  '제374조',
  '증거보전 절차',
  '소 제기 전에도 증거를 수집하거나 보전할 필요가 있는 경우 증거보전 신청이 가능하다. SHA-256 해시와 Merkle Tree로 보장된 증거는 법정에서 무결성 입증에 유리하다.',
  '{"type":"CIV_PROC","condition":"증거(사진, 문서)의 무결성이 SHA-256으로 보장되는가","requires":["evidence_files"],"auto_checkable":true,"check_null_hash":true,"check_merkle_root":true}',
  '모든 증빙 파일의 SHA-256 해시 생성을 확인하고, Merkle Tree를 생성하여 전체 증거 패키지의 무결성을 보장하세요.',
  1.1,
  'dispute',
  12
);

-- ============================================================
-- 완료 확인 쿼리
-- ============================================================
-- SELECT sort_order, code, name, article, title, risk_weight, category
-- FROM laws
-- ORDER BY sort_order;
