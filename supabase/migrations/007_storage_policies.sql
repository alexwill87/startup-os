-- Storage policies for project-files bucket
-- Allow authenticated users to upload, read, and delete files

CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "auth_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files' AND auth.uid() IS NOT NULL
  );

-- Also add telegram_chat_id and expires_at columns
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE cockpit_api_keys ADD COLUMN IF NOT EXISTS expires_at timestamptz;
