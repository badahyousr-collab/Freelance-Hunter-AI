-- Persist provider-confirmed bid state separately from the local application workflow.
ALTER TABLE applications ADD COLUMN provider_status TEXT;
