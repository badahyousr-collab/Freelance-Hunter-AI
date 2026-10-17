-- Preserve provider-confirmed bid status separately from the local workflow state.
ALTER TABLE applications ADD COLUMN provider_status TEXT;
