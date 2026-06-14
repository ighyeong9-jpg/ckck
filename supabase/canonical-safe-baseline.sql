-- ============================================================
-- CANONICAL SAFE SQL BASELINE — Check-In Stable
-- ============================================================
-- Version: 2.0
-- Date: 2026-06-14
-- Author: Claude Code (Phase 1S-E Step 8T)
-- Baseline: Phase 1S-E Step 7 (d90abda)
-- Correction Plan: Phase 1S-E Step 8S (0638c98)
-- Target: New Supabase project lgdzhrdhawnafqbzptoa
-- Status: PENDING CODEX REVIEW — DO NOT APPLY UNTIL PASS
--
-- Source files (REFERENCE ONLY — not applied directly):
--   supabase/all-in-one.sql (core schema)
--   supabase/migrations/20240220..20260227 (extensions)
--   docs/security/CHECKIN_STABLE_RLS_STORAGE_PATCH_PLAN.md (safe policies)
--
-- SAFETY GUARANTEES:
--   [x] NO  DISABLE ROW LEVEL SECURITY
--   [x] NO  USING(true) on user data tables
--   [x] NO  WITH CHECK(true) on user data tables
--   [x] NO  DROP TABLE / DELETE FROM / TRUNCATE
--   [x] NO  authenticated-only storage policies (project_members based instead)
--   [x] NO  anon public SELECT on shares or data tables (7 tables protected)
--   [x] YES USING(true) on public reference data (laws, knowledge_chunks, benchmarks) SELECT only
--   [x] YES All tables have ENABLE ROW LEVEL SECURITY
--   [x] YES All tables have at least one RLS policy
--   [x] YES Public share access via API route + service role only (not base table RLS)
--
-- DB execution: 0 (pending Codex review)
-- ============================================================


-- ============================================================
-- PART 1: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";


-- ============================================================
-- PART 2: HELPER FUNCTIONS
-- ============================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit log trigger function
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Risk score recalculation function (patent algorithm)
CREATE OR REPLACE FUNCTION recalculate_risk_score(p_id UUID)
RETURNS VOID AS $$
DECLARE
  fp_count INTEGER;
  oc_count INTEGER;
  ch_count INTEGER;
  wf DECIMAL := 0.4;
  wo DECIMAL := 0.3;
  wc DECIMAL := 0.3;
  v_risk_score DECIMAL;
  v_risk_grade TEXT;
BEGIN
  SELECT COUNT(*) INTO fp_count
  FROM mandatory_processes
  WHERE project_id = p_id AND is_completed = FALSE;

  SELECT COALESCE(SUM(risk_weight), 0) INTO oc_count
  FROM operational_constraints
  WHERE project_id = p_id;

  SELECT COUNT(*) INTO ch_count
  FROM change_orders
  WHERE project_id = p_id AND status = 'approved';

  v_risk_score := (fp_count * wf) + (oc_count * wo) + (ch_count * wc);

  IF v_risk_score >= 8 THEN v_risk_grade := 'F';
  ELSIF v_risk_score >= 6 THEN v_risk_grade := 'D';
  ELSIF v_risk_score >= 4 THEN v_risk_grade := 'C';
  ELSIF v_risk_score >= 2 THEN v_risk_grade := 'B';
  ELSE v_risk_grade := 'A';
  END IF;

  UPDATE projects
  SET risk_score = v_risk_score, risk_grade = v_risk_grade, updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-add project owner to project_members
-- Step 8T: owner_id → user_id
CREATE OR REPLACE FUNCTION add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, status, joined_at, invited_by)
  VALUES (NEW.id, NEW.user_id, 'OWNER', 'ACTIVE', NOW(), NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing projects to project_members (one-time utility)
-- Step 8T: owner_id → user_id
CREATE OR REPLACE FUNCTION migrate_existing_projects_to_members()
RETURNS void AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, status, joined_at)
  SELECT id, user_id, 'OWNER', 'ACTIVE', created_at
  FROM projects
  WHERE user_id IS NOT NULL
  ON CONFLICT (project_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PART 3A: CORE TABLES (from all-in-one.sql + v2 columns)
-- Creation order respects foreign key dependencies.
-- ============================================================

-- 1. profiles (FK: auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'contractor' CHECK (role IN ('admin', 'contractor', 'client')),
  -- v2 columns
  company_name VARCHAR(200),
  description TEXT,
  specialty_tags JSONB DEFAULT '[]',
  address TEXT,
  logo_url TEXT,
  portfolio_images JSONB DEFAULT '[]',
  avg_verification_score FLOAT DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  avg_duration_days INTEGER DEFAULT 0,
  profile_token VARCHAR(32) UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. projects (FK: auth.users)
-- Step 8T corrections: owner_id→user_id, title→name, +progress, status CHECK +review
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'general',
  address TEXT,
  client_name TEXT,
  client_phone TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  progress INTEGER DEFAULT 0,
  risk_score DECIMAL(5,2) DEFAULT 0,
  risk_grade TEXT CHECK (risk_grade IN ('A', 'B', 'C', 'D', 'F')),
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'diagnosis', 'in_progress', 'review', 'completed', 'disputed')),
  -- 20260227 columns
  description TEXT,
  actual_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. project_members (v2 schema — FK: projects, auth.users)
-- NOTE: Uses UPPERCASE roles from collaboration v2 migration.
-- auto_add_project_owner trigger ensures owner is always 'OWNER' in this table.
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'DESIGNER', 'TECHNICIAN', 'CLIENT')),
  invited_email TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, user_id)
);

-- 4. diagnostic_responses (FK: projects, profiles)
CREATE TABLE diagnostic_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('need_check', 'recommend_fix', 'confirmed')),
  note TEXT,
  evidence_urls TEXT[],
  recorded_by UUID REFERENCES profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  -- 20240220 columns
  item_id TEXT,
  subcategory TEXT
);

-- 5. mandatory_processes (FK: projects)
CREATE TABLE mandatory_processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  process_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  evidence_urls TEXT[]
);

-- 6. operational_constraints (FK: projects)
CREATE TABLE operational_constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  constraint_type TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_weight DECIMAL(3,2) DEFAULT 1.0
);

-- 7. change_orders (FK: projects, profiles)
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  change_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT NOT NULL,
  cost_impact DECIMAL(12,2),
  schedule_impact_days INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 8. scope_items (FK: projects)
CREATE TABLE scope_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity DECIMAL(10,2),
  unit TEXT,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  notes TEXT
);

-- 9. quotes (FK: projects)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL UNIQUE,
  total_amount DECIMAL(12,2) NOT NULL,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. quote_line_items (FK: quotes + projects)
-- Step 8T-R: project_id added (src uses .eq('project_id', ...) in 15+ calls).
-- src INSERT: project_id, category, item_name, specification, unit, quantity, unit_price, total_price, notes, sort_order.
-- quote_id kept for FK backward compatibility (quotes table exists in baseline).
CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  specification TEXT,
  quantity DECIMAL(10,2),
  unit TEXT,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  amount NUMERIC, -- Step 8T-R3: src compatibility column (scoreEngine.ts selects 'id, category, amount'). Synced with total_price by trg_quote_line_items_amount_sync trigger. NULL allowed, no DEFAULT 0 to prevent silent zero when total_price is inserted without amount.
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. payments (FK: projects)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_stage TEXT NOT NULL CHECK (payment_stage IN ('contract', 'mid1', 'mid2', 'final')),
  percentage INTEGER NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. compliance_checks (FK: projects, profiles)
CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL,
  item_code TEXT NOT NULL,
  is_compliant BOOLEAN,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES profiles(id)
);

-- 13. compliance_evidence (FK: compliance_checks)
CREATE TABLE compliance_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compliance_check_id UUID NOT NULL REFERENCES compliance_checks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. defects (FK: projects, profiles + v2 columns)
CREATE TABLE defects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved', 'closed')),
  location TEXT,
  reported_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  -- v2 columns
  photos JSONB DEFAULT '[]',
  sha256_hash VARCHAR(64),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. defect_updates (FK: defects, profiles)
CREATE TABLE defect_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. files (FK: projects, profiles)
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),
  timestamp TIMESTAMPTZ NOT NULL,
  hash_sha256 TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. audit_logs (FK: profiles)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. reports (FK: projects, profiles)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('pre_contract', 'progress', 'completion', 'dispute')),
  file_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id)
);

-- 19. shares (FK: projects, profiles + v2 columns)
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  share_url TEXT NOT NULL,
  masked_fields TEXT[],
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- v2 columns
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. special_terms (FK: projects)
CREATE TABLE special_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  term_text TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. timeline_events (FK: projects, profiles)
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. notifications (FK: profiles, projects + v2 column)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- v2 column
  link VARCHAR(500)
);

-- 23. service_payments (FK: profiles)
CREATE TABLE service_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. read_receipts (FK: projects, profiles)
CREATE TABLE read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  reader_id UUID NOT NULL REFERENCES profiles(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_type, document_id, reader_id)
);


-- ============================================================
-- PART 3B: MIGRATION TABLES (additional tables from migrations)
-- ============================================================

-- 25. custom_checklist_items (from 20240220)
CREATE TABLE custom_checklist_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  item TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('required', 'recommended', 'conditional')),
  -- priority: required=필수, recommended=권장, conditional=조건부
  method TEXT NOT NULL CHECK (method IN ('visual', 'functional', 'measurement')),
  -- method: visual=육안확인, functional=작동확인, measurement=측정확인
  evidence TEXT NOT NULL CHECK (evidence IN ('photo', 'checklist', 'measurement_record')),
  -- evidence: photo=사진, checklist=점검표, measurement_record=측정기록
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. evidence_files (from 006 + v2 columns)
CREATE TABLE evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  sha256_hash TEXT,
  category TEXT DEFAULT 'other',
  description TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- v2 columns (20240305)
  shared_to_client BOOLEAN DEFAULT FALSE,
  -- v2 columns (20260226)
  merkle_root VARCHAR(64),
  ai_check_result JSONB DEFAULT '{}',
  is_evidence BOOLEAN NOT NULL DEFAULT false
);

-- 27. cost_analysis (from 004)
CREATE TABLE cost_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  base_cost INTEGER NOT NULL DEFAULT 0,
  complexity_weight DECIMAL(3,2) DEFAULT 0.15,
  complexity_factor DECIMAL(3,2) DEFAULT 0,
  timeline_weight DECIMAL(3,2) DEFAULT 0.10,
  timeline_factor DECIMAL(3,2) DEFAULT 0,
  material_weight DECIMAL(3,2) DEFAULT 0.12,
  material_factor DECIMAL(3,2) DEFAULT 0,
  labor_weight DECIMAL(3,2) DEFAULT 0.08,
  labor_factor DECIMAL(3,2) DEFAULT 0,
  risk_weight DECIMAL(3,2) DEFAULT 0.10,
  risk_factor DECIMAL(3,2) DEFAULT 0,
  adjustment_rate DECIMAL(5,4) DEFAULT 0,
  adjusted_cost INTEGER DEFAULT 0,
  cost_difference INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. agreements (from 007)
CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  client_agreed BOOLEAN DEFAULT FALSE,
  client_name TEXT,
  client_signed_at TIMESTAMPTZ,
  client_signature TEXT,
  contractor_agreed BOOLEAN DEFAULT FALSE,
  contractor_name TEXT,
  contractor_signed_at TIMESTAMPTZ,
  contractor_signature TEXT,
  manager_agreed BOOLEAN DEFAULT FALSE,
  manager_name TEXT,
  manager_signed_at TIMESTAMPTZ,
  manager_signature TEXT,
  agreement_content TEXT,
  total_amount INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. clients (from 009)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  client_type TEXT DEFAULT 'client',
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. processes (from 009)
CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  sort_order INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 31. workforce (from 009)
CREATE TABLE workforce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  daily_wage INTEGER DEFAULT 0,
  work_date DATE NOT NULL,
  hours_worked DECIMAL(4,2) DEFAULT 8,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 32. materials (from 009)
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  unit TEXT DEFAULT 'ea',
  quantity INTEGER DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  supplier TEXT,
  status TEXT DEFAULT 'ordered',
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 33. user_settings (from 009 + v2 columns)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  company TEXT,
  notify_email BOOLEAN DEFAULT TRUE,
  notify_push BOOLEAN DEFAULT TRUE,
  notify_sms BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'ko',
  subscription_plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 34. comparison_pairs (from 20240304 — FK: evidence_files)
CREATE TABLE comparison_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  before_photo_id UUID NOT NULL REFERENCES evidence_files(id) ON DELETE CASCADE,
  after_photo_id UUID NOT NULL REFERENCES evidence_files(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  change_note TEXT,
  client_approved BOOLEAN DEFAULT FALSE,
  client_approved_at TIMESTAMPTZ,
  client_signature TEXT,
  contractor_approved BOOLEAN DEFAULT FALSE,
  contractor_approved_at TIMESTAMPTZ,
  contractor_signature TEXT,
  supervisor_approved BOOLEAN DEFAULT FALSE,
  supervisor_approved_at TIMESTAMPTZ,
  annotations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 35. issues (from 20240305 v2)
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  issue_type TEXT DEFAULT 'OTHER' CHECK (issue_type IN ('DESIGN_CHANGE', 'DIMENSION_MISMATCH', 'MATERIAL_ISSUE', 'SAFETY', 'OTHER')),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  notify_roles TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 36. change_requests (from 20240305 v2)
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('COST', 'SCHEDULE', 'DESIGN', 'OTHER')),
  title TEXT NOT NULL,
  description TEXT,
  amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 37. issue_comments (from 20240305 v2 + 20240306 column)
CREATE TABLE issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 38. activity_logs (from 20260219 — enhanced version with FK + meta)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 39. notebooks (from 20260219)
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size INTEGER,
  doc_type TEXT NOT NULL DEFAULT 'other',
  user_note TEXT,
  summary TEXT,
  key_findings JSONB DEFAULT '[]',
  risk_flags JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  confidence REAL DEFAULT 0,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 40. knowledge_chunks (from 20260219 — 3072 dimension)
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(3072),
  source TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('law', 'process', 'defect', 'material', 'contract', 'safety')
  ),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 41. ai_check_results (from 20260219)
CREATE TABLE ai_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  photo_url TEXT,
  detected_process TEXT,
  go_no_go TEXT CHECK (go_no_go IN ('GO', 'NO-GO', 'CONDITIONAL')),
  check_items JSONB DEFAULT '[]',
  issues JSONB DEFAULT '[]',
  human_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 42. laws (from 20260226 — public reference data)
CREATE TABLE laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  article VARCHAR(100) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  check_conditions JSONB NOT NULL DEFAULT '{}',
  violation_action TEXT NOT NULL DEFAULT '',
  risk_weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  category VARCHAR(50) NOT NULL
    CHECK (category IN ('safety', 'quality', 'contract', 'dispute', 'warranty', 'fire_safety')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 43. law_checks (from 20260226 — FK: projects, laws)
CREATE TABLE law_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  law_id UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('compliant', 'violated', 'not_applicable', 'pending')),
  go_nogo VARCHAR(10) NOT NULL DEFAULT 'pending'
    CHECK (go_nogo IN ('go', 'nogo', 'pending')),
  details JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_by VARCHAR(20) NOT NULL DEFAULT 'system'
    CHECK (checked_by IN ('system', 'ai', 'manual'))
);

-- 44. risk_scores (from 20260226)
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade VARCHAR(10) NOT NULL
    CHECK (grade IN ('safe', 'caution', 'warning', 'danger')),
  fp_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  fp_weight DECIMAL(4,2) NOT NULL DEFAULT 0.45,
  oc_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  oc_weight DECIMAL(4,2) NOT NULL DEFAULT 0.25,
  ch_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  ch_weight DECIMAL(4,2) NOT NULL DEFAULT 0.30,
  details JSONB,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 45. warranties (from 20260226 — more complete version)
CREATE TABLE warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  law_id UUID REFERENCES laws(id),
  category VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_years INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expiring_soon', 'expired', 'claimed')),
  alert_30d_sent BOOLEAN NOT NULL DEFAULT false,
  alert_7d_sent BOOLEAN NOT NULL DEFAULT false,
  alert_expired_sent BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- PART 3C: MISSING TABLES (Step 8T — from 8R/8S correction plan)
-- 12 tables referenced in src .from() but absent from baseline.
-- Field maps reverse-engineered from src Supabase calls.
-- ============================================================

-- 46. dispute_signals (P0 — 7 src refs: Sidebar, MobileTabBar, TodayStatusBar, brain.ts, etc.)
CREATE TABLE dispute_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  description TEXT NOT NULL,
  detected_from TEXT,
  source_text TEXT,
  legal_basis TEXT,
  recommended_action TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 47. warranty_tracking (P0 — 10 src refs: Sidebar, warranty/page, warranty-tracker.ts, etc.)
-- warranty_expires_date is auto-calculated by trg_warranty_expires trigger (see PART 5).
-- Step 8T-R2: user_id NULL allowed (src does not insert user_id).
-- warranty/page.tsx inserts with project_id: null (standalone), no user_id.
-- warranty-tracker.ts inserts with project_id: NOT NULL (service_role), no user_id.
-- auto_fill_warranty_user_id trigger fills user_id from auth.uid() when NULL (see PART 5).
CREATE TABLE warranty_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  process_name TEXT NOT NULL,
  completed_date DATE NOT NULL,
  warranty_period_months INTEGER NOT NULL,
  warranty_expires_date DATE NOT NULL,
  reminder_sent_30d BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_7d BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 48. site_issues (P1 — 6 src refs: issues/page, projects/page, autoWorkflow, classify-issue)
-- Step 8T-R: src insert 필드 전수 반영 (autoWorkflow + classify-issue/route.ts)
CREATE TABLE site_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  photo_url TEXT,
  ai_classification JSONB,
  issue_text TEXT,
  reporter_note TEXT,
  summary TEXT,
  recommended_actions JSONB,
  legal_basis TEXT,
  cost_impact NUMERIC DEFAULT 0,
  schedule_impact INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT false,
  urgency_hours INTEGER,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 49. verification_certificates (P1 — 12 src refs: certificate/page, certificateService, etc.)
-- total_score = primary persisted column (TypeScript type + INSERT + display).
-- overall_score = generated column for src compatibility (profile/page, share/page SELECT).
-- SECURITY: anon public SELECT is PROHIBITED. Public share uses API route projection.
CREATE TABLE verification_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  total_score NUMERIC NOT NULL,
  overall_score NUMERIC GENERATED ALWAYS AS (total_score) STORED,
  grade TEXT NOT NULL,
  cost_score NUMERIC NOT NULL,
  process_score NUMERIC NOT NULL,
  contract_score NUMERIC NOT NULL,
  schedule_score NUMERIC NOT NULL,
  project_name TEXT NOT NULL,
  industry TEXT,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  badge_eligible BOOLEAN NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 50. proactive_notifications (P1 — 9 src refs: NotificationCenter, proactive-engine, handlers)
-- trigger_type: TEXT without CHECK (9 observed values, service_role INSERT only, extensible).
-- Observed values: WARRANTY_EXPIRING, AI_CHECK_PENDING, DISPUTE_UNRESOLVED,
--   PROCESS_NEXT_STEP, DAILY_REPORT_MISSING, RISK_HIGH, DISPUTE_SIGNAL,
--   WARRANTY_REGISTER, DEADLINE_OVERDUE.
-- severity: 3-value CHECK (CRITICAL, WARNING, INFO).
-- INSERT: service_role path only (proactive-engine cron + handlers eventBus).
-- Client: SELECT/UPDATE only (NotificationCenter).
-- Public access: PROHIBITED.
CREATE TABLE proactive_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 51. quote_analyses (P2 — 4 src refs: quotes/page, quote-analyzer, budget-guide)
CREATE TABLE quote_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  total_amount NUMERIC,
  overcharge_items JSONB,
  undercharge_items JSONB,
  overall_risk TEXT,
  ai_comment TEXT,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 52. daily_reports (P2 — 3 src refs: autoWorkflow, tools-extended)
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  auto_check_count INTEGER DEFAULT 0,
  go_count INTEGER DEFAULT 0,
  nogo_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 53. contractor_badges (P2 — 1 src ref: ContractorBadge)
CREATE TABLE contractor_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_level TEXT,
  usage_months INTEGER DEFAULT 0,
  pass_rate NUMERIC,
  dispute_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 54. price_benchmarks (P3 — 1 src ref: benchmarks.ts — public reference data)
CREATE TABLE price_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  space_type TEXT,
  region TEXT,
  size_min_pyeong NUMERIC,
  size_max_pyeong NUMERIC,
  price_per_pyeong NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 55. labor_rates (P3 — 1 src ref: benchmarks.ts — public reference data)
CREATE TABLE labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_name TEXT NOT NULL,
  daily_rate NUMERIC,
  reference_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 56. process_benchmarks (P3 — 2 src refs: benchmarks.ts — public reference data)
CREATE TABLE process_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_key TEXT NOT NULL,
  avg_duration_days NUMERIC,
  avg_cost_per_pyeong NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 57. estimate_validations (P3 — 1 src ref: estimate/validate/route)
-- Step 8T-R: project_id NULL 허용 (버그8 수정), 누락 컬럼 추가
CREATE TABLE estimate_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quoted_total NUMERIC,
  benchmark_low NUMERIC,
  benchmark_avg NUMERIC,
  benchmark_high NUMERIC,
  deviation_percent NUMERIC,
  overall_status TEXT,
  total_amount_status TEXT,
  process_items JSONB DEFAULT '[]',
  missing_processes JSONB DEFAULT '[]',
  risk_flags JSONB DEFAULT '[]',
  regional_multiplier NUMERIC,
  building_age_surcharge NUMERIC,
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- PART 4: INDEXES
-- ============================================================

-- profiles
CREATE INDEX idx_profiles_token ON profiles(profile_token);

-- projects (Step 8T: owner_id → user_id)
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_industry ON projects(industry);
CREATE INDEX idx_projects_risk_score ON projects(risk_score);

-- project_members
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- diagnostic_responses
CREATE INDEX idx_diagnostic_responses_project ON diagnostic_responses(project_id);

-- change_orders
CREATE INDEX idx_change_orders_project ON change_orders(project_id);

-- defects
CREATE INDEX idx_defects_project ON defects(project_id);
CREATE INDEX idx_defects_status ON defects(status);

-- files
CREATE INDEX idx_files_project ON files(project_id);

-- audit_logs
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- read_receipts
CREATE INDEX idx_read_receipts_project ON read_receipts(project_id, reader_id);

-- quote_line_items (Step 8T-R: project_id index added)
CREATE INDEX idx_quote_line_items_project ON quote_line_items(project_id);

-- shares
CREATE INDEX idx_shares_token ON shares(share_token);

-- custom_checklist_items
CREATE INDEX idx_custom_checklist_items_project_id ON custom_checklist_items(project_id);

-- evidence_files
CREATE INDEX idx_evidence_files_project ON evidence_files(project_id);
CREATE INDEX idx_evidence_files_category ON evidence_files(category);
CREATE INDEX idx_evidence_files_hash ON evidence_files(sha256_hash);
CREATE INDEX idx_evidence_files_is_evidence ON evidence_files(is_evidence);

-- cost_analysis
CREATE INDEX idx_cost_analysis_project ON cost_analysis(project_id);

-- agreements
CREATE INDEX idx_agreements_project ON agreements(project_id);
CREATE INDEX idx_agreements_status ON agreements(status);

-- clients
CREATE INDEX idx_clients_user ON clients(user_id);

-- processes
CREATE INDEX idx_processes_project ON processes(project_id);

-- workforce
CREATE INDEX idx_workforce_project ON workforce(project_id);
CREATE INDEX idx_workforce_date ON workforce(work_date);

-- materials
CREATE INDEX idx_materials_project ON materials(project_id);

-- user_settings
CREATE INDEX idx_user_settings_user ON user_settings(user_id);

-- comparison_pairs
CREATE INDEX idx_comparison_pairs_project ON comparison_pairs(project_id);
CREATE INDEX idx_comparison_pairs_created ON comparison_pairs(created_at DESC);

-- issues
CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_created_by ON issues(created_by);

-- change_requests
CREATE INDEX idx_change_requests_project ON change_requests(project_id);
CREATE INDEX idx_change_requests_status ON change_requests(status);

-- issue_comments
CREATE INDEX idx_issue_comments_issue ON issue_comments(issue_id);
CREATE INDEX idx_issue_comments_user ON issue_comments(user_id);

-- activity_logs
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_project ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- notebooks
CREATE INDEX idx_notebooks_user ON notebooks(user_id);
CREATE INDEX idx_notebooks_project ON notebooks(project_id);
CREATE INDEX idx_notebooks_created ON notebooks(created_at DESC);

-- knowledge_chunks
-- Step 8Y-R2: HNSW index skipped — Supabase pgvector rejects HNSW on vector dimensions > 2000.
-- knowledge_chunks.embedding is vector(3072) (gemini-embedding-001).
-- The embedding column and match_knowledge_chunks RPC remain intact; only the performance index is skipped.
-- To enable later: CREATE INDEX knowledge_chunks_embedding_idx ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX knowledge_chunks_category_idx ON knowledge_chunks(category);

-- Vector search RPC (3072 dimension — gemini-embedding-001)
-- Step 8Y: moved after knowledge_chunks table creation to avoid 42P01 error.
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding  vector(3072),
  match_threshold  float    DEFAULT 0.65,
  match_count      int      DEFAULT 5,
  filter_category  text     DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  content     text,
  source      text,
  category    text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.source,
    kc.category,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    (filter_category IS NULL OR kc.category = filter_category)
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ai_check_results
CREATE INDEX ai_check_results_project_idx ON ai_check_results(project_id);
CREATE INDEX ai_check_results_unconfirmed_idx
  ON ai_check_results(project_id, human_confirmed)
  WHERE human_confirmed = FALSE;

-- laws
CREATE INDEX idx_laws_code ON laws(code);
CREATE INDEX idx_laws_category ON laws(category);
CREATE INDEX idx_laws_active ON laws(is_active);

-- law_checks
CREATE INDEX idx_law_checks_project ON law_checks(project_id);
CREATE INDEX idx_law_checks_law ON law_checks(law_id);
CREATE INDEX idx_law_checks_status ON law_checks(status);
CREATE INDEX idx_law_checks_project_law ON law_checks(project_id, law_id);

-- risk_scores
CREATE INDEX idx_risk_scores_project ON risk_scores(project_id);
CREATE INDEX idx_risk_scores_calc_at ON risk_scores(calculated_at DESC);
CREATE INDEX idx_risk_scores_grade ON risk_scores(grade);

-- warranties
CREATE INDEX idx_warranties_project ON warranties(project_id);
CREATE INDEX idx_warranties_end_date ON warranties(end_date);
CREATE INDEX idx_warranties_status ON warranties(status);

-- dispute_signals (Step 8T)
CREATE INDEX idx_dispute_signals_project ON dispute_signals(project_id);
CREATE INDEX idx_dispute_signals_user ON dispute_signals(user_id);
CREATE INDEX idx_dispute_signals_resolved ON dispute_signals(resolved);

-- warranty_tracking (Step 8T + 8T-R: user_id index added)
CREATE INDEX idx_warranty_tracking_project ON warranty_tracking(project_id);
CREATE INDEX idx_warranty_tracking_user ON warranty_tracking(user_id);
CREATE INDEX idx_warranty_tracking_expires ON warranty_tracking(warranty_expires_date);

-- site_issues (Step 8T)
CREATE INDEX idx_site_issues_project ON site_issues(project_id);
CREATE INDEX idx_site_issues_status ON site_issues(status);

-- verification_certificates (Step 8T)
CREATE INDEX idx_verification_certificates_project ON verification_certificates(project_id);
CREATE INDEX idx_verification_certificates_user ON verification_certificates(user_id);
CREATE INDEX idx_verification_certificates_code ON verification_certificates(code);
CREATE INDEX idx_verification_certificates_status ON verification_certificates(status);

-- proactive_notifications (Step 8T)
CREATE INDEX idx_proactive_notifications_user ON proactive_notifications(user_id);
CREATE INDEX idx_proactive_notifications_read ON proactive_notifications(user_id, read);
CREATE INDEX idx_proactive_notifications_created ON proactive_notifications(created_at DESC);

-- quote_analyses (Step 8T)
CREATE INDEX idx_quote_analyses_project ON quote_analyses(project_id);

-- daily_reports (Step 8T)
CREATE INDEX idx_daily_reports_project ON daily_reports(project_id);
CREATE INDEX idx_daily_reports_user ON daily_reports(user_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(date);

-- contractor_badges (Step 8T)
CREATE INDEX idx_contractor_badges_user ON contractor_badges(user_id);

-- price_benchmarks (Step 8T)
CREATE INDEX idx_price_benchmarks_category ON price_benchmarks(category);
CREATE INDEX idx_price_benchmarks_active ON price_benchmarks(is_active);

-- labor_rates (Step 8T)
CREATE INDEX idx_labor_rates_trade ON labor_rates(trade_name);

-- process_benchmarks (Step 8T)
CREATE INDEX idx_process_benchmarks_key ON process_benchmarks(process_key);

-- estimate_validations (Step 8T)
CREATE INDEX idx_estimate_validations_project ON estimate_validations(project_id);
CREATE INDEX idx_estimate_validations_user ON estimate_validations(user_id);


-- ============================================================
-- PART 5: TRIGGERS
-- ============================================================

-- Audit triggers (core tables)
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_diagnostic_responses AFTER INSERT OR UPDATE OR DELETE ON diagnostic_responses
  FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_change_orders AFTER INSERT OR UPDATE OR DELETE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_defects AFTER INSERT OR UPDATE OR DELETE ON defects
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Auto-add project owner
CREATE TRIGGER auto_add_project_owner
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION add_project_owner();

-- warranty_tracking: auto-calculate warranty_expires_date (Step 8T)
-- Source: warranty-tracker.ts:5 — "warranty_expires_date는 DB 트리거(trg_warranty_expires)가 자동 계산한다."
CREATE OR REPLACE FUNCTION calculate_warranty_expires()
RETURNS TRIGGER AS $$
BEGIN
  NEW.warranty_expires_date := NEW.completed_date + (NEW.warranty_period_months * INTERVAL '1 month');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_warranty_expires
  BEFORE INSERT OR UPDATE ON warranty_tracking
  FOR EACH ROW EXECUTE FUNCTION calculate_warranty_expires();

-- warranty_tracking: auto-fill user_id from auth.uid() when NULL (Step 8T-R2)
-- Source: warranty/page.tsx and warranty-tracker.ts do not insert user_id.
-- Session client (warranty/page.tsx) → auth.uid() available.
-- Service_role client (warranty-tracker.ts) → auth.uid() is NULL, user_id stays NULL (acceptable).
CREATE OR REPLACE FUNCTION auto_fill_warranty_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_warranty_auto_user_id
  BEFORE INSERT ON warranty_tracking
  FOR EACH ROW EXECUTE FUNCTION auto_fill_warranty_user_id();

-- quote_line_items: sync amount ↔ total_price (Step 8T-R3)
-- src INSERT paths write total_price only (tools-auto.ts:181, tools-extended.ts:886).
-- src SELECT paths read amount only (scoreEngine.ts:44).
-- This trigger ensures both columns stay in sync regardless of which is provided.
-- INSERT rules:
--   amount NULL + total_price NOT NULL → amount = total_price
--   total_price NULL + amount NOT NULL → total_price = amount
--   both NULL → both stay NULL (no silent zero injection)
--   both provided → user values respected
-- UPDATE rules:
--   total_price changed + amount unchanged → amount = NEW.total_price
--   amount changed + total_price unchanged → total_price = NEW.amount
--   both changed → user values respected
CREATE OR REPLACE FUNCTION sync_quote_line_item_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.amount IS NULL AND NEW.total_price IS NOT NULL THEN
      NEW.amount := NEW.total_price;
    ELSIF NEW.total_price IS NULL AND NEW.amount IS NOT NULL THEN
      NEW.total_price := NEW.amount;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.total_price IS DISTINCT FROM OLD.total_price AND NEW.amount IS NOT DISTINCT FROM OLD.amount THEN
      NEW.amount := NEW.total_price;
    ELSIF NEW.amount IS DISTINCT FROM OLD.amount AND NEW.total_price IS NOT DISTINCT FROM OLD.total_price THEN
      NEW.total_price := NEW.amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quote_line_items_amount_sync
  BEFORE INSERT OR UPDATE ON quote_line_items
  FOR EACH ROW EXECUTE FUNCTION sync_quote_line_item_amount();

-- updated_at triggers
CREATE TRIGGER update_comparison_pairs_updated_at
  BEFORE UPDATE ON comparison_pairs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_issue_comments_updated_at
  BEFORE UPDATE ON issue_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- PART 6: RLS ENABLE (all 45 tables)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandatory_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

-- Step 8T: 12 missing tables
ALTER TABLE dispute_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE proactive_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_validations ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PART 7: RLS POLICIES (safe policies only)
-- ============================================================
-- Pattern: project_members based for project-scoped tables
-- Pattern: auth.uid() based for user-scoped tables
-- Pattern: USING(true) SELECT only for public reference data
-- NO USING(true) on user data tables.
-- NO WITH CHECK(true) anywhere.
-- ============================================================

-- ----- profiles -----
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles are readable" ON profiles
  FOR SELECT USING (is_public = true);

-- ----- projects (Step 8T: owner_id → user_id) -----
CREATE POLICY "Project members can view" ON projects
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
  );
CREATE POLICY "Project owner can update" ON projects
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ----- project_members (Step 8T: owner_id → user_id) -----
CREATE POLICY "Project members can view members" ON project_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND user_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "Project owner can manage members" ON project_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND user_id = auth.uid())
  );

-- ----- diagnostic_responses -----
CREATE POLICY "Project members can view diagnostics" ON diagnostic_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = diagnostic_responses.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage diagnostics" ON diagnostic_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = diagnostic_responses.project_id AND user_id = auth.uid())
  );

-- ----- mandatory_processes -----
CREATE POLICY "Project members can view mandatory_processes" ON mandatory_processes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = mandatory_processes.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage mandatory_processes" ON mandatory_processes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = mandatory_processes.project_id AND user_id = auth.uid())
  );

-- ----- operational_constraints -----
CREATE POLICY "Project members can view operational_constraints" ON operational_constraints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = operational_constraints.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage operational_constraints" ON operational_constraints
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = operational_constraints.project_id AND user_id = auth.uid())
  );

-- ----- change_orders -----
CREATE POLICY "Project members can view changes" ON change_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = change_orders.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can create changes" ON change_orders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = change_orders.project_id AND user_id = auth.uid())
  );

-- ----- scope_items -----
CREATE POLICY "Project members can view scope_items" ON scope_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = scope_items.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage scope_items" ON scope_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = scope_items.project_id AND user_id = auth.uid())
  );

-- ----- quotes -----
CREATE POLICY "Project members can view quotes" ON quotes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = quotes.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage quotes" ON quotes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = quotes.project_id AND user_id = auth.uid())
  );

-- ----- quote_line_items (project_id direct + quote_id FK fallback) -----
-- Step 8T-R: src uses .eq('project_id', ...) in 15+ calls. project_id-based RLS added.
-- quote_id path kept for backward compatibility.
CREATE POLICY "Project members can view quote_line_items via project" ON quote_line_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = quote_line_items.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage quote_line_items via project" ON quote_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = quote_line_items.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can view quote_line_items via quote" ON quote_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes q
      JOIN project_members pm ON pm.project_id = q.project_id
      WHERE q.id = quote_line_items.quote_id AND pm.user_id = auth.uid()
    )
  );

-- ----- payments -----
CREATE POLICY "Project members can view payments" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = payments.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage payments" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = payments.project_id AND user_id = auth.uid())
  );

-- ----- compliance_checks -----
CREATE POLICY "Project members can view compliance_checks" ON compliance_checks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = compliance_checks.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage compliance_checks" ON compliance_checks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = compliance_checks.project_id AND user_id = auth.uid())
  );

-- ----- compliance_evidence (via compliance_checks → projects) -----
CREATE POLICY "Project members can view compliance_evidence" ON compliance_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM compliance_checks cc
      JOIN project_members pm ON pm.project_id = cc.project_id
      WHERE cc.id = compliance_evidence.compliance_check_id AND pm.user_id = auth.uid()
    )
  );
CREATE POLICY "Project members can manage compliance_evidence" ON compliance_evidence
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM compliance_checks cc
      JOIN project_members pm ON pm.project_id = cc.project_id
      WHERE cc.id = compliance_evidence.compliance_check_id AND pm.user_id = auth.uid()
    )
  );

-- ----- defects -----
CREATE POLICY "Project members can view defects" ON defects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = defects.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage defects" ON defects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = defects.project_id AND user_id = auth.uid())
  );

-- ----- defect_updates (via defects → projects) -----
CREATE POLICY "Project members can view defect_updates" ON defect_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM defects d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = defect_updates.defect_id AND pm.user_id = auth.uid()
    )
  );
CREATE POLICY "Project members can manage defect_updates" ON defect_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM defects d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = defect_updates.defect_id AND pm.user_id = auth.uid()
    )
  );

-- ----- files -----
CREATE POLICY "Project members can view files" ON files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = files.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can upload files" ON files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = files.project_id AND user_id = auth.uid())
  );

-- ----- audit_logs (user can view own audit entries) -----
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (changed_by = auth.uid());

-- ----- reports -----
CREATE POLICY "Project members can view reports" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = reports.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage reports" ON reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = reports.project_id AND user_id = auth.uid())
  );

-- ----- shares (Step 8T: public policy 삭제, owner_id → user_id) -----
-- SECURITY NOTE: anon public SELECT on shares is PROHIBITED.
-- Public share page does NOT query shares directly.
-- /api/share/[shareId] API route uses service_role to validate share_token internally.
-- API route verifies: token/shareId match, is_active = true, expires_at > NOW().
-- API route returns allowlisted projection only. select * is never exposed.
--
-- Project owner can view all shares (including inactive)
CREATE POLICY "Project owner can view all shares" ON shares
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = shares.project_id AND user_id = auth.uid())
  );
-- Project members can view active shares
CREATE POLICY "Project members can view shares" ON shares
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = shares.project_id AND user_id = auth.uid())
  );
-- Project owner can create shares
CREATE POLICY "Project owner can create shares" ON shares
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = shares.project_id AND user_id = auth.uid())
  );
-- Project owner can update shares (deactivate, etc.)
CREATE POLICY "Project owner can update shares" ON shares
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = shares.project_id AND user_id = auth.uid())
  );

-- ----- special_terms -----
CREATE POLICY "Project members can view special_terms" ON special_terms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = special_terms.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage special_terms" ON special_terms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = special_terms.project_id AND user_id = auth.uid())
  );

-- ----- timeline_events -----
CREATE POLICY "Project members can view timeline_events" ON timeline_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = timeline_events.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage timeline_events" ON timeline_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = timeline_events.project_id AND user_id = auth.uid())
  );

-- ----- notifications -----
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ----- service_payments -----
CREATE POLICY "Users can view own payments" ON service_payments
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own payments" ON service_payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ----- read_receipts -----
CREATE POLICY "Project members can view receipts" ON read_receipts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = read_receipts.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can create receipts" ON read_receipts
  FOR INSERT WITH CHECK (reader_id = auth.uid());

-- ----- custom_checklist_items (Phase 1S-B safe design) -----
CREATE POLICY "Project members can view checklist items" ON custom_checklist_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = custom_checklist_items.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can create checklist items" ON custom_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = custom_checklist_items.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can update checklist items" ON custom_checklist_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = custom_checklist_items.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project owner can delete checklist items" ON custom_checklist_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE id = custom_checklist_items.project_id AND user_id = auth.uid())
  );

-- ----- evidence_files -----
CREATE POLICY "Project members can view evidence files" ON evidence_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = evidence_files.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can upload evidence files" ON evidence_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = evidence_files.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can update evidence files" ON evidence_files
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = evidence_files.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can delete evidence files" ON evidence_files
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = evidence_files.project_id AND user_id = auth.uid())
  );

-- ----- cost_analysis -----
CREATE POLICY "Project members can view cost_analysis" ON cost_analysis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = cost_analysis.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage cost_analysis" ON cost_analysis
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = cost_analysis.project_id AND user_id = auth.uid())
  );

-- ----- agreements -----
CREATE POLICY "Project members can view agreements" ON agreements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = agreements.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage agreements" ON agreements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = agreements.project_id AND user_id = auth.uid())
  );

-- ----- clients (user-scoped) -----
CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own clients" ON clients
  FOR ALL USING (user_id = auth.uid());

-- ----- processes -----
CREATE POLICY "Project members can view processes" ON processes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = processes.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage processes" ON processes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = processes.project_id AND user_id = auth.uid())
  );

-- ----- workforce -----
CREATE POLICY "Project members can view workforce" ON workforce
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = workforce.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage workforce" ON workforce
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = workforce.project_id AND user_id = auth.uid())
  );

-- ----- materials -----
CREATE POLICY "Project members can view materials" ON materials
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = materials.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage materials" ON materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = materials.project_id AND user_id = auth.uid())
  );

-- ----- user_settings -----
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (user_id = auth.uid());

-- ----- comparison_pairs -----
CREATE POLICY "Project members can view comparison_pairs" ON comparison_pairs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = comparison_pairs.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage comparison_pairs" ON comparison_pairs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = comparison_pairs.project_id AND user_id = auth.uid())
  );

-- ----- issues -----
CREATE POLICY "Project members can view issues" ON issues
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = issues.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage issues" ON issues
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = issues.project_id AND user_id = auth.uid())
  );

-- ----- change_requests -----
CREATE POLICY "Project members can view change_requests" ON change_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = change_requests.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage change_requests" ON change_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = change_requests.project_id AND user_id = auth.uid())
  );

-- ----- issue_comments (via issues → projects) -----
CREATE POLICY "Project members can view comments" ON issue_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM issues i
      JOIN project_members pm ON pm.project_id = i.project_id
      WHERE i.id = issue_comments.issue_id AND pm.user_id = auth.uid()
    )
  );
CREATE POLICY "Project members can manage comments" ON issue_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM issues i
      JOIN project_members pm ON pm.project_id = i.project_id
      WHERE i.id = issue_comments.issue_id AND pm.user_id = auth.uid()
    )
  );

-- ----- activity_logs (user-scoped) -----
CREATE POLICY "Users can view own activity logs" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----- notebooks (user-scoped) -----
CREATE POLICY "Users can view own notebooks" ON notebooks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notebooks" ON notebooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notebooks" ON notebooks
  FOR DELETE USING (auth.uid() = user_id);

-- ----- knowledge_chunks (public reference data — SELECT only) -----
-- NOTE: USING(true) is intentional for public reference data (law/process knowledge).
-- No INSERT/UPDATE/DELETE policies = only service_role can modify.
CREATE POLICY "Anyone can read knowledge chunks" ON knowledge_chunks
  FOR SELECT USING (true);

-- ----- ai_check_results -----
CREATE POLICY "Project members can view ai_check_results" ON ai_check_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = ai_check_results.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage ai_check_results" ON ai_check_results
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = ai_check_results.project_id AND user_id = auth.uid())
  );

-- ----- laws (public reference data — SELECT only) -----
-- NOTE: USING(true) is intentional for public law reference data.
-- No INSERT/UPDATE/DELETE policies = only service_role can modify.
CREATE POLICY "Anyone can read laws" ON laws
  FOR SELECT USING (true);

-- ----- law_checks -----
CREATE POLICY "Project members can view law_checks" ON law_checks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = law_checks.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage law_checks" ON law_checks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = law_checks.project_id AND user_id = auth.uid())
  );

-- ----- risk_scores -----
CREATE POLICY "Project members can view risk_scores" ON risk_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = risk_scores.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage risk_scores" ON risk_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = risk_scores.project_id AND user_id = auth.uid())
  );

-- ----- warranties -----
CREATE POLICY "Project members can view warranties" ON warranties
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = warranties.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage warranties" ON warranties
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = warranties.project_id AND user_id = auth.uid())
  );

-- ============================================================
-- PART 7B: RLS POLICIES for Step 8T missing tables
-- ============================================================
-- SECURITY NOTE for 7 tables with NO anon public SELECT:
--   shares, projects, processes, quote_line_items, change_orders,
--   diagnostic_responses, verification_certificates.
-- Public share page does NOT query base tables directly.
-- /api/share/[shareId] API route uses service_role for internal queries.
-- API route validates share_token, is_active, expires_at.
-- API route returns allowlisted projection only.
-- ============================================================

-- ----- dispute_signals (project_members scoped, service_role INSERT) -----
CREATE POLICY "Project members can view dispute_signals" ON dispute_signals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = dispute_signals.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage dispute_signals" ON dispute_signals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = dispute_signals.project_id AND user_id = auth.uid())
  );

-- ----- warranty_tracking (project_members + user fallback for standalone) -----
-- Step 8T-R2: user_id NULL allowed. trg_warranty_auto_user_id auto-fills from auth.uid().
-- Session client INSERT: trigger fills user_id → INSERT WITH CHECK passes.
-- Service_role INSERT: RLS bypassed entirely → user_id stays NULL (acceptable).
-- project_id IS NOT NULL → project_members scoped.
-- project_id IS NULL → user_id = auth.uid() scoped.
CREATE POLICY "Project members can view warranty_tracking" ON warranty_tracking
  FOR SELECT USING (
    (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM project_members WHERE project_id = warranty_tracking.project_id AND user_id = auth.uid()))
    OR (project_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage warranty_tracking" ON warranty_tracking
  FOR ALL USING (
    (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM project_members WHERE project_id = warranty_tracking.project_id AND user_id = auth.uid()))
    OR (project_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert own warranty_tracking" ON warranty_tracking
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ----- site_issues (project_members + user fallback) -----
-- Step 8T-R: project_id can be NULL (classify-issue/route.ts: projectId ?? null).
-- project_id IS NOT NULL → project_members scoped.
-- project_id IS NULL → user_id = auth.uid() scoped.
CREATE POLICY "Project members can view site_issues" ON site_issues
  FOR SELECT USING (
    (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM project_members WHERE project_id = site_issues.project_id AND user_id = auth.uid()))
    OR (project_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage site_issues" ON site_issues
  FOR ALL USING (
    (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM project_members WHERE project_id = site_issues.project_id AND user_id = auth.uid()))
    OR (project_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert own site_issues" ON site_issues
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ----- verification_certificates (project_members SELECT, service_role INSERT) -----
-- SECURITY: anon public SELECT is PROHIBITED. Public share uses API route projection.
-- INSERT/UPDATE: service_role only (certificateService uses createAdminClient).
CREATE POLICY "Project members can view verification_certificates" ON verification_certificates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = verification_certificates.project_id AND user_id = auth.uid())
  );

-- ----- proactive_notifications (user scoped, public access PROHIBITED) -----
-- INSERT paths:
--   1. proactive-engine.ts: Vercel Cron → service_role key (bypasses RLS)
--   2. handlers.ts: eventBus → createClient(@/lib/supabase/server) = anon+session client (needs RLS INSERT)
-- Step 8T-R: authenticated INSERT policy added for handlers.ts path.
-- Client: SELECT/UPDATE only (NotificationCenter).
-- anon/public unrestricted INSERT: PROHIBITED.
CREATE POLICY "Users can view own notifications" ON proactive_notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON proactive_notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Authenticated users can insert own notifications" ON proactive_notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ----- quote_analyses (project_members scoped) -----
CREATE POLICY "Project members can view quote_analyses" ON quote_analyses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = quote_analyses.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage quote_analyses" ON quote_analyses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = quote_analyses.project_id AND user_id = auth.uid())
  );

-- ----- daily_reports (project_members scoped) -----
CREATE POLICY "Project members can view daily_reports" ON daily_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = daily_reports.project_id AND user_id = auth.uid())
  );
CREATE POLICY "Project members can manage daily_reports" ON daily_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = daily_reports.project_id AND user_id = auth.uid())
  );

-- ----- contractor_badges (user scoped) -----
CREATE POLICY "Users can view own contractor_badges" ON contractor_badges
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own contractor_badges" ON contractor_badges
  FOR ALL USING (user_id = auth.uid());

-- ----- price_benchmarks (public reference data — SELECT only) -----
-- NOTE: USING(true) is intentional for public benchmark reference data.
-- No INSERT/UPDATE/DELETE policies = only service_role can modify.
CREATE POLICY "Anyone can read price_benchmarks" ON price_benchmarks
  FOR SELECT USING (true);

-- ----- labor_rates (public reference data — SELECT only) -----
CREATE POLICY "Anyone can read labor_rates" ON labor_rates
  FOR SELECT USING (true);

-- ----- process_benchmarks (public reference data — SELECT only) -----
CREATE POLICY "Anyone can read process_benchmarks" ON process_benchmarks
  FOR SELECT USING (true);

-- ----- estimate_validations (user scoped — project_id NULL allowed) -----
-- Step 8T-R: project_id can be NULL (버그8). RLS uses user_id as primary scope.
CREATE POLICY "Users can view own estimate_validations" ON estimate_validations
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own estimate_validations" ON estimate_validations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can manage own estimate_validations" ON estimate_validations
  FOR UPDATE USING (user_id = auth.uid());


-- ============================================================
-- PART 8: STORAGE BUCKETS + POLICIES
-- ============================================================

-- 1. project-files (private)
-- NOTE: Uses user folder prefix ({user_id}/...) as path structure.
-- If frontend uses a different path structure, these policies need adjustment.
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false);

CREATE POLICY "Users can upload to own folder in project-files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users can view own folder in project-files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users can delete own files in project-files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2. avatars (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. evidence (private — new bucket, used by frontend in 6+ locations)
-- Path structure: {project_id}/{timestamp}_{filename}
-- Policy: project_members based access
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false);

CREATE POLICY "Project members can upload evidence" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = (storage.foldername(name))[1]::uuid
      AND user_id = auth.uid()
    )
  );
CREATE POLICY "Project members can view evidence" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = (storage.foldername(name))[1]::uuid
      AND user_id = auth.uid()
    )
  );
CREATE POLICY "Project members can delete evidence" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = (storage.foldername(name))[1]::uuid
      AND user_id = auth.uid()
    )
  );


-- ============================================================
-- PART 9: VERIFICATION QUERIES (run after application)
-- ============================================================
-- After applying this baseline, run these to verify:
--
-- 1. Check all tables exist:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public' ORDER BY table_name;
--
-- 2. Check RLS enabled on all tables:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public' ORDER BY tablename;
--
-- 3. Check all policies:
--    SELECT tablename, policyname, cmd, qual
--    FROM pg_policies WHERE schemaname = 'public'
--    ORDER BY tablename, policyname;
--
-- 4. Check storage buckets:
--    SELECT id, name, public FROM storage.buckets ORDER BY name;
--
-- 5. Check NO USING(true) on user data tables:
--    SELECT tablename, policyname, qual FROM pg_policies
--    WHERE schemaname = 'public' AND qual = 'true'
--    AND tablename NOT IN ('laws', 'knowledge_chunks', 'price_benchmarks', 'labor_rates', 'process_benchmarks');
--    -- Expected: 0 rows (only laws, knowledge_chunks, and benchmark tables should have USING(true))
--
-- 6. Check NO DISABLE RLS:
--    SELECT tablename FROM pg_tables
--    WHERE schemaname = 'public' AND rowsecurity = false;
--    -- Expected: 0 rows
--
-- ============================================================
-- END OF CANONICAL SAFE SQL BASELINE
-- Total tables: 57 (45 original + 12 Step 8T additions)
-- Total RLS ENABLE: 57
-- Total policies: ~130
-- Storage buckets: 3
-- DISABLE RLS: 0
-- USING(true) on user data: 0
-- USING(true) on public reference: laws, knowledge_chunks, price_benchmarks, labor_rates, process_benchmarks
-- anon public SELECT on shares: 0 (PROHIBITED)
-- anon public SELECT on data tables: 0 (7 tables protected)
-- ============================================================
