ALTER TABLE telegram_auth_codes ADD COLUMN auth_mode TEXT NOT NULL DEFAULT 'login';
ALTER TABLE telegram_auth_codes ADD COLUMN error_message TEXT;
