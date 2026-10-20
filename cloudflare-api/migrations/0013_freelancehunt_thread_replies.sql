-- Track the last processed provider message to make automatic replies idempotent.
ALTER TABLE agent_settings ADD COLUMN auto_reply INTEGER NOT NULL DEFAULT 0;

-- Existing enabled agents already opted into automatic provider submissions, and
-- the product requirement explicitly includes AI replies in existing FH threads.
UPDATE agent_settings SET auto_reply=1 WHERE is_enabled=1 AND auto_submit=1;

CREATE TABLE IF NOT EXISTS freelancehunt_thread_state (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  last_message_id TEXT,
  last_message_count INTEGER NOT NULL DEFAULT 0,
  last_post_at TEXT,
  reply_status TEXT NOT NULL DEFAULT 'baseline',
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_freelancehunt_thread_state_user_updated
  ON freelancehunt_thread_state(user_id, updated_at);
