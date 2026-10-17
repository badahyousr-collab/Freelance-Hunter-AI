-- Store provider-confirmed bid IDs and safe diagnostic messages for submission recovery.
ALTER TABLE applications ADD COLUMN provider_submission_id TEXT;
ALTER TABLE applications ADD COLUMN submission_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_provider_submission_id
  ON applications(user_id, provider_submission_id)
  WHERE provider_submission_id IS NOT NULL;
