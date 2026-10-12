CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_links_telegram_user_id
ON telegram_links(telegram_user_id)
WHERE telegram_user_id IS NOT NULL;
