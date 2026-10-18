-- Automatic marketplace submission is enabled by default for opted-in agents.
-- The agent still respects the per-user daily cap and only submits through a verified adapter.
ALTER TABLE agent_settings ADD COLUMN auto_submit INTEGER NOT NULL DEFAULT 1;
ALTER TABLE agent_settings ADD COLUMN daily_submission_limit INTEGER NOT NULL DEFAULT 10;
