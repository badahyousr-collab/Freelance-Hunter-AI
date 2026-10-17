-- Store provider thread links and deduplicated messages from Freelancehunt conversations.
ALTER TABLE applications ADD COLUMN provider_thread_id TEXT;
CREATE TABLE application_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  application_id INTEGER NOT NULL,
  provider_message_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client','freelancer','unknown')),
  message_text TEXT NOT NULL,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, provider_message_id)
);
CREATE INDEX application_messages_owner_app_idx ON application_messages(user_id, application_id, posted_at);
