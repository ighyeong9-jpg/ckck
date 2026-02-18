-- ========================================
-- Check-In Production Storage Buckets
-- 실행 순서: 3번 (storage.sql)
-- ========================================

-- Project Files Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', false);

-- Project Files Storage Policy
CREATE POLICY "Project members can upload files" ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'project-files' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Project members can view files" ON storage.objects FOR SELECT 
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Project members can delete files" ON storage.objects FOR DELETE 
  USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatar Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
