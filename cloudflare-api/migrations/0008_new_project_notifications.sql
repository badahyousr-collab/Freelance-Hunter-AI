-- Notifications are opt-out; only newly inserted projects trigger a message.
ALTER TABLE agent_settings ADD COLUMN notify_new_projects INTEGER NOT NULL DEFAULT 1;
