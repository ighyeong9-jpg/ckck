-- Add user_email column to issue_comments table
ALTER TABLE issue_comments ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Update existing comments with placeholder email
UPDATE issue_comments SET user_email = '사용자' WHERE user_email IS NULL;
