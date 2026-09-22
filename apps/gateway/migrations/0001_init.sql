-- Heimdall V1 baseline schema (T020).
-- Forward-only: additive changes only. No DROP TABLE, DROP COLUMN, or
-- TRUNCATE appears in migrations; rollback means compatible app rollback or
-- backup restore, never a down-migration. A static test enforces this rule.
-- Each section is owned by one module; no module queries another module's
-- tables from domain code (crossed only via public read interfaces).

-- Owner: access -----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS access;

CREATE TABLE IF NOT EXISTS access.tenants (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access.policy_versions (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES access.tenants (id),
  rule JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS access.credential_refs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES access.tenants (id),
  provider TEXT NOT NULL,
  env_var TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access.quota_reservations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES access.tenants (id),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  granted BIGINT NOT NULL CHECK (granted >= 0),
  used BIGINT NOT NULL DEFAULT 0 CHECK (used >= 0)
);

-- Owner: catalog ----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS catalog;

CREATE TABLE IF NOT EXISTS catalog.candidates (
  id TEXT PRIMARY KEY,
  provider_family TEXT NOT NULL,
  model JSONB NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog.profile_revisions (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES catalog.candidates (id),
  profile JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_revisions_candidate_idx
  ON catalog.profile_revisions (candidate_id);

CREATE TABLE IF NOT EXISTS catalog.evidence (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES catalog.candidates (id),
  record JSONB NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS evidence_candidate_idx ON catalog.evidence (candidate_id);

CREATE TABLE IF NOT EXISTS catalog.price_schedules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES catalog.candidates (id),
  schedule JSONB NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS price_schedules_candidate_idx
  ON catalog.price_schedules (candidate_id);

CREATE TABLE IF NOT EXISTS catalog.snapshots (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS snapshots_single_active
  ON catalog.snapshots (active) WHERE active;

-- Owner: routing ----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS routing;

CREATE TABLE IF NOT EXISTS routing.decision_metadata (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES access.tenants (id),
  candidate_id TEXT NOT NULL REFERENCES catalog.candidates (id),
  request_digest TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  catalog_revision TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS decision_metadata_tenant_idx
  ON routing.decision_metadata (tenant_id);

CREATE TABLE IF NOT EXISTS routing.prepared_route_claims (
  token_hash TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES access.tenants (id),
  decision_id TEXT NOT NULL REFERENCES routing.decision_metadata (id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prepared_route_claims_expiry_idx
  ON routing.prepared_route_claims (expires_at);

-- Owner: invocation -------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS invocation;

CREATE TABLE IF NOT EXISTS invocation.invocation_claims (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES access.tenants (id),
  endpoint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  decision_id TEXT REFERENCES routing.decision_metadata (id),
  status TEXT NOT NULL DEFAULT 'claimed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, endpoint, idempotency_key)
);

CREATE TABLE IF NOT EXISTS invocation.attempts (
  id TEXT PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES invocation.invocation_claims (id),
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  actual_model JSONB,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (claim_id, ordinal)
);

CREATE TABLE IF NOT EXISTS invocation.usage_ledger (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES invocation.attempts (id),
  usage JSONB NOT NULL,
  cost JSONB,
  certainty TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_ledger_attempt_idx ON invocation.usage_ledger (attempt_id);

CREATE TABLE IF NOT EXISTS invocation.budget_reservations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES access.tenants (id),
  amount JSONB NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Owner: feedback ---------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS feedback;

CREATE TABLE IF NOT EXISTS feedback.outcome_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  decision_id TEXT REFERENCES routing.decision_metadata (id),
  attempt_id TEXT REFERENCES invocation.attempts (id),
  label TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback.aggregate_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  summary JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Least-privilege application role ----------------------------------------
-- Applied by the privileged migrator. The gateway runtime never connects as
-- a superuser and never runs DDL. No DELETE anywhere: ledgers are append-only.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'heimdall_app') THEN
    CREATE ROLE heimdall_app WITH NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA access, catalog, routing, invocation, feedback TO heimdall_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA access TO heimdall_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA catalog TO heimdall_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA routing TO heimdall_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA invocation TO heimdall_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA feedback TO heimdall_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA access FROM heimdall_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA catalog FROM heimdall_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA routing FROM heimdall_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA invocation FROM heimdall_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA feedback FROM heimdall_app;
