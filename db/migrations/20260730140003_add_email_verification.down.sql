DROP INDEX IF EXISTS users_verification_token_idx;
ALTER TABLE users DROP COLUMN IF EXISTS verification_token;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
