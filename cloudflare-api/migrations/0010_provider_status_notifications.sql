-- Track official provider bid status separately from the application workflow status.
ALTER TABLE applications ADD COLUMN provider_status TEXT;
ALTER TABLE applications ADD COLUMN provider_is_winner INTEGER NOT NULL DEFAULT 0 CHECK (provider_is_winner IN (0,1));
ALTER TABLE applications ADD COLUMN provider_status_synced_at TEXT;
ALTER TABLE agent_settings ADD COLUMN notify_application_updates INTEGER NOT NULL DEFAULT 1 CHECK (notify_application_updates IN (0,1));
