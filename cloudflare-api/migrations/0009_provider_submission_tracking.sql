-- Store only provider-confirmed submission identifiers and safe error summaries.
ALTER TABLE applications ADD COLUMN provider_submission_id TEXT;
ALTER TABLE applications ADD COLUMN submission_error TEXT;
