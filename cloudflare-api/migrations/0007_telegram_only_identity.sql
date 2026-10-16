-- Replace email/password identity fields with Telegram identity fields.
-- Existing Telegram accounts keep their IDs and workspace data. Legacy email-only
-- records are retained with a non-email key, but email sign-in is no longer available.
ALTER TABLE users RENAME COLUMN email TO telegram_identity;
ALTER TABLE users RENAME COLUMN is_verified TO telegram_verified;
ALTER TABLE users DROP COLUMN password_hash;
ALTER TABLE users DROP COLUMN verification_token_hash;
ALTER TABLE users DROP COLUMN verification_expires_at;
ALTER TABLE users DROP COLUMN password_reset_token_hash;
ALTER TABLE users DROP COLUMN password_reset_expires_at;

ALTER TABLE users ADD COLUMN identity_provider TEXT NOT NULL DEFAULT 'telegram';

-- Prefer the explicit Telegram link when migrating accounts that already have one.
UPDATE users
SET telegram_identity = 'tg:' || (
  SELECT telegram_user_id FROM telegram_links
  WHERE telegram_links.user_id = users.id
)
WHERE EXISTS (
  SELECT 1 FROM telegram_links
  WHERE telegram_links.user_id = users.id
    AND telegram_links.telegram_user_id IS NOT NULL
);

-- Older Telegram accounts used a synthetic email-like key. Convert it to a Telegram ID key.
UPDATE users
SET telegram_identity = 'tg:' || substr(telegram_identity, 10, instr(telegram_identity, '@') - 10)
WHERE telegram_identity LIKE 'telegram-%@telegram.local';

-- Do not retain real email addresses in old email-only records.
UPDATE users
SET telegram_identity = 'legacy:' || id
WHERE telegram_identity LIKE '%@%';

UPDATE users
SET identity_provider = CASE
  WHEN telegram_identity LIKE 'tg:%' THEN 'telegram'
  ELSE 'legacy'
END;

UPDATE users SET telegram_verified = 1 WHERE identity_provider = 'telegram';
ALTER TABLE users DROP COLUMN auth_method;
