-- Let users opt out of Telegram notifications when a tracked proposal receives a provider-confirmed response.
ALTER TABLE agent_settings ADD COLUMN notify_application_updates INTEGER NOT NULL DEFAULT 1;
