ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- Existing users should be verified automatically to not break them
UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE email_verified = FALSE AND created_at < NOW() - INTERVAL '1 minute';
