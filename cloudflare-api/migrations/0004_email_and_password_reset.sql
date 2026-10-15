ALTER TABLE users ADD COLUMN verification_expires_at TEXT;
ALTER TABLE users ADD COLUMN password_reset_token_hash TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires_at TEXT;
