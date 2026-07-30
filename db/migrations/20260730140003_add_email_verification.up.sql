ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
CREATE INDEX IF NOT EXISTS users_verification_token_idx ON users (verification_token);
