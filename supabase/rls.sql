-- ========================================
-- Check-In Production Row Level Security
-- 실행 순서: 2번 (rls.sql)
-- ========================================

-- Enable RLS on all tables
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

-- Profiles: 본인만 조회/수정
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects: 소유자 + 멤버만 접근
CREATE POLICY "Project members can view" ON projects FOR SELECT 
  USING (
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
  );
CREATE POLICY "Project owner can update" ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Project Members: 프로젝트 소유자만 관리
CREATE POLICY "Project members can view members" ON project_members FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()) OR
    user_id = auth.uid()
  );
CREATE POLICY "Project owner can manage members" ON project_members FOR ALL 
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()));

-- Diagnostic Responses: 프로젝트 멤버만
CREATE POLICY "Project members can view diagnostics" ON diagnostic_responses FOR SELECT 
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = diagnostic_responses.project_id AND user_id = auth.uid()));
CREATE POLICY "Project members can manage diagnostics" ON diagnostic_responses FOR ALL 
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = diagnostic_responses.project_id AND user_id = auth.uid()));

-- Change Orders: 프로젝트 멤버만
CREATE POLICY "Project members can view changes" ON change_orders FOR SELECT 
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = change_orders.project_id AND user_id = auth.uid()));
CREATE POLICY "Project members can create changes" ON change_orders FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM project_members WHERE project_id = change_orders.project_id AND user_id = auth.uid()));

-- Defects: 프로젝트 멤버만
CREATE POLICY "Project members can view defects" ON defects FOR SELECT 
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = defects.project_id AND user_id = auth.uid()));
CREATE POLICY "Project members can manage defects" ON defects FOR ALL 
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = defects.project_id AND user_id = auth.uid()));

-- Files: 프로젝트 멤버만
CREATE POLICY "Project members can view files" ON files FOR SELECT 
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = files.project_id AND user_id = auth.uid()));
CREATE POLICY "Project members can upload files" ON files FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM project_members WHERE project_id = files.project_id AND user_id = auth.uid()));

-- Notifications: 본인 알림만
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Service Payments: 본인 결제만
CREATE POLICY "Users can view own payments" ON service_payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own payments" ON service_payments FOR INSERT WITH CHECK (user_id = auth.uid());

-- Read Receipts: 프로젝트 멤버만
CREATE POLICY "Project members can view receipts" ON read_receipts FOR SELECT 
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = read_receipts.project_id AND user_id = auth.uid()));
CREATE POLICY "Users can create receipts" ON read_receipts FOR INSERT 
  WITH CHECK (reader_id = auth.uid());

-- Shares: 공개 토큰은 누구나, 프로젝트 멤버는 모두
CREATE POLICY "Anyone with token can view share" ON shares FOR SELECT USING (true);
CREATE POLICY "Project members can create shares" ON shares FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = shares.project_id AND owner_id = auth.uid()));
