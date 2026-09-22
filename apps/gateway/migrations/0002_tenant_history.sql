-- 0002: tenant history indexes (T020). Additive only: new indexes for
-- tenant-scoped history reads. Safe to apply on a live 0001 schema.
CREATE INDEX IF NOT EXISTS decision_metadata_tenant_created_idx
  ON routing.decision_metadata (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS usage_ledger_recorded_idx
  ON invocation.usage_ledger (recorded_at);
