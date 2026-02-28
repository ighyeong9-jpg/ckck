# Check-In (체크인) — 데이터베이스 스키마

**Supabase (PostgreSQL)**  
**프로젝트 URL:** 환경변수 NEXT_PUBLIC_SUPABASE_URL 참조

---

## 테이블 목록 (총 24개)

---

### projects — 프로젝트 (현장)

```sql
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  client_name   TEXT NOT NULL,
  industry      TEXT NOT NULL DEFAULT 'apartment',
  status        TEXT NOT NULL DEFAULT 'planning'
                CHECK (status IN ('planning','in_progress','review','completed')),
  progress      INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  risk_score    NUMERIC DEFAULT 0,
  risk_grade    TEXT DEFAULT 'A',
  start_date    DATE,
  end_date      DATE,
  address       TEXT,
  area          NUMERIC,
  budget        NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### diagnostic_responses — 진단 체크리스트 응답

```sql
CREATE TABLE diagnostic_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL,
  category      TEXT NOT NULL,
  item_code     TEXT,
  checked       BOOLEAN NOT NULL DEFAULT false,
  status        TEXT DEFAULT 'unchecked',
  evidence_urls TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, question_id)              -- 반드시 있어야 함 (upsert용)
);
```

---

### custom_checklist_items — 사용자 추가 체크리스트 항목

```sql
CREATE TABLE custom_checklist_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,
  checked       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### evidence_files — 증빙 파일

```sql
CREATE TABLE evidence_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_size     INT,
  mime_type     TEXT,
  category      TEXT DEFAULT 'other',
  sha256_hash   TEXT,                           -- 위변조 방지 해시
  merkle_root   TEXT,                           -- Merkle Tree 루트
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### defects — 하자 기록

```sql
CREATE TABLE defects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  title         TEXT NOT NULL,
  description   TEXT,
  severity      TEXT NOT NULL DEFAULT 'medium'
                CHECK (severity IN ('low','medium','high','critical')),
  status        TEXT NOT NULL DEFAULT 'reported'
                CHECK (status IN ('reported','in_progress','resolved','closed')),
  location      TEXT,
  photos        TEXT[],
  sha256_hash   TEXT,
  reported_by   TEXT,
  assigned_to   TEXT,
  resolved_at   TIMESTAMPTZ,
  reported_at   TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### processes — 공정 관리

```sql
CREATE TABLE processes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','completed','delayed')),
  progress      INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date    DATE,
  end_date      DATE,
  sort_order    INT DEFAULT 0,
  order_index   INT DEFAULT 0,
  assigned_to   TEXT,
  notes         TEXT,
  workers       INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### workforce — 인력 관리

```sql
CREATE TABLE workforce (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worker_name   TEXT NOT NULL,
  role          TEXT NOT NULL,
  phone         TEXT,
  daily_wage    NUMERIC,
  work_hours    NUMERIC,
  work_status   TEXT DEFAULT 'present'
                CHECK (work_status IN ('present','absent','half_day')),
  work_date     DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### materials — 자재 관리

```sql
CREATE TABLE materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  category      TEXT DEFAULT 'other',
  specification TEXT,
  quantity      NUMERIC NOT NULL DEFAULT 0,
  unit          TEXT DEFAULT '개',
  unit_price    NUMERIC DEFAULT 0,
  amount        NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  status        TEXT DEFAULT 'pending'
                CHECK (status IN ('pending','ordered','shipped','delivered','returned')),
  supplier      TEXT,
  delivery_date DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### laws — 법규 목록

```sql
CREATE TABLE laws (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  risk_weight   NUMERIC DEFAULT 1.0,
  description   TEXT,
  article       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### law_checks — 법규 체크 결과

```sql
CREATE TABLE law_checks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  law_id        UUID REFERENCES laws(id),
  status        TEXT DEFAULT 'unchecked'
                CHECK (status IN ('pass','fail','unchecked')),
  note          TEXT,
  checked_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### risk_scores — 리스크 점수 이력

```sql
CREATE TABLE risk_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  score         NUMERIC NOT NULL,
  grade         TEXT NOT NULL,
  level         TEXT CHECK (level IN ('low','medium','high')),
  fp            NUMERIC,                        -- 재정 리스크
  oc            NUMERIC,                        -- 운영 복잡도
  ch            NUMERIC,                        -- 변경 리스크
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### verification_certificates — AI 인증서

```sql
CREATE TABLE verification_certificates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  code          TEXT UNIQUE NOT NULL,           -- CHK-YYYY-XXXXX
  overall_score NUMERIC NOT NULL,
  grade         TEXT NOT NULL CHECK (grade IN ('A','B','C','D','F')),
  cost_score    NUMERIC,
  process_score NUMERIC,
  contract_score NUMERIC,
  schedule_score NUMERIC,
  status        TEXT DEFAULT 'active'
                CHECK (status IN ('active','expired','revoked')),
  expires_at    TIMESTAMPTZ,
  issued_at     TIMESTAMPTZ DEFAULT now()
);
```

---

### change_orders — 변경 관리

```sql
CREATE TABLE change_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT DEFAULT 'other'
                CHECK (type IN ('scope','schedule','cost','design','material','other')),
  status        TEXT DEFAULT 'requested'
                CHECK (status IN ('requested','approved','rejected')),
  cost_impact   NUMERIC DEFAULT 0,
  time_impact   INT DEFAULT 0,
  requested_by  TEXT,
  approved_by   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### agreements — 3자 합의

```sql
CREATE TABLE agreements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT '현장 합의서',
  content       TEXT,
  status        TEXT DEFAULT 'pending'
                CHECK (status IN ('pending','partial','completed')),
  parties       JSONB,                          -- 서명 당사자 정보
  signatures    JSONB,                          -- 서명 데이터 (base64)
  hash          TEXT,                           -- 합의서 해시
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### reports — 리포트

```sql
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  type          TEXT NOT NULL DEFAULT 'daily',
  title         TEXT NOT NULL,
  content       JSONB,
  pdf_url       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### quote_line_items — 견적 항목

```sql
CREATE TABLE quote_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  item_name     TEXT NOT NULL,
  specification TEXT,
  unit          TEXT DEFAULT '식',
  quantity      NUMERIC NOT NULL DEFAULT 1,
  unit_price    NUMERIC NOT NULL DEFAULT 0,
  amount        NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes         TEXT,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### cost_analysis — 비용 분석

```sql
CREATE TABLE cost_analysis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  base_cost     NUMERIC NOT NULL DEFAULT 0,
  adjusted_cost NUMERIC,
  factors       JSONB,                          -- 7개 조정 요인
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### clients — 고객/업체 목록

```sql
CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  company       TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  type          TEXT DEFAULT 'client'
                CHECK (type IN ('client','contractor','supplier','other')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### user_settings — 사용자 설정

```sql
CREATE TABLE user_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name  TEXT,
  phone         TEXT,
  address       TEXT,
  bio           TEXT,
  role          TEXT DEFAULT 'site_manager',
  theme         TEXT DEFAULT 'light',
  notifications JSONB DEFAULT '{"email": true, "push": true}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### timeline_events — 타임라인 이벤트

```sql
CREATE TABLE timeline_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  event_type    TEXT NOT NULL,
  event_date    TIMESTAMPTZ DEFAULT now(),
  title         TEXT,
  description   TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### dispute_signals — 분쟁 징후 기록

```sql
CREATE TABLE dispute_signals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES auth.users(id),
  signal_type        TEXT NOT NULL,
  description        TEXT,
  detected_from      TEXT DEFAULT 'chat',
  source_text        TEXT,
  legal_basis        TEXT,
  recommended_action TEXT,
  resolved           BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT now()
);
```

---

### warranty_tracking — 하자담보 추적

```sql
CREATE TABLE warranty_tracking (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trade_name        TEXT NOT NULL,              -- 공종명
  trade_category    TEXT NOT NULL,              -- 구조체/방수/마감 등
  warranty_months   INT NOT NULL,               -- 담보기간 (개월)
  completed_date    DATE NOT NULL,              -- 공종 완료일
  expires_date      DATE,                       -- 담보 만료일 (트리거 자동 계산)
  status            TEXT DEFAULT 'active'
                    CHECK (status IN ('active','expiring_soon','expired')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 담보 만료일 자동 계산 트리거
CREATE OR REPLACE FUNCTION calc_warranty_expires()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_date := NEW.completed_date + (NEW.warranty_months || ' months')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_warranty_expires
BEFORE INSERT OR UPDATE ON warranty_tracking
FOR EACH ROW EXECUTE FUNCTION calc_warranty_expires();
```

---

### checkin_logs — 출역 로그 (QR 체크인)

```sql
CREATE TABLE checkin_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worker_id     UUID REFERENCES workforce(id),
  worker_name   TEXT,
  check_type    TEXT NOT NULL CHECK (check_type IN ('in','out')),
  method        TEXT DEFAULT 'qr' CHECK (method IN ('qr','manual','nfc')),
  location      TEXT,
  checked_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### shares — 공유 링크

```sql
CREATE TABLE shares (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES auth.users(id),
  share_token   TEXT UNIQUE NOT NULL,
  share_url     TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  view_count    INT DEFAULT 0,
  last_viewed   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### quote_analyses — 견적 AI 분석 결과

```sql
CREATE TABLE quote_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  overall_risk      TEXT,
  overcharge_items  JSONB,                      -- 과다청구 항목 목록
  undercharge_items JSONB,                      -- 과소청구 항목 목록
  ai_comment        TEXT,
  analyzed_at       TIMESTAMPTZ DEFAULT now()
);
```

---

## RLS (Row Level Security) 정책

모든 테이블에 아래 정책 적용 필요:

```sql
-- 예시: projects 테이블
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_projects"
ON projects FOR ALL
USING (auth.uid() = user_id);

-- shares 테이블은 토큰으로 공개 읽기 허용
CREATE POLICY "public_read_shares"
ON shares FOR SELECT
USING (expires_at > now());
```

---

## 인덱스 권장

```sql
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_diagnostic_project_id ON diagnostic_responses(project_id);
CREATE INDEX idx_processes_project_id ON processes(project_id);
CREATE INDEX idx_defects_project_id ON defects(project_id);
CREATE INDEX idx_evidence_project_id ON evidence_files(project_id);
CREATE INDEX idx_shares_token ON shares(share_token);
CREATE INDEX idx_warranty_expires ON warranty_tracking(expires_date);
```

---

## Storage 버킷

```
버킷명: evidence
공개:   false (서명된 URL 사용)
용도:   증빙 파일, 현장 사진, 하자 사진
```
