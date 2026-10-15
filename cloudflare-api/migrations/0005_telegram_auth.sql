CREATE TABLE IF NOT EXISTS telegram_auth_codes (
  code_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  telegram_user_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  authenticated_at TEXT,
  session_issued_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_telegram_auth_codes_expiry
ON telegram_auth_codes(expires_at);
