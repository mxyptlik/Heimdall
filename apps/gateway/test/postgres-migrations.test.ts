// T020 acceptance: fresh migration and re-runs succeed in disposable
// PostgreSQL; duplicate idempotency claims and invalid foreign ownership
// fail; transactions roll back; migrations stay forward-only; concurrent
// migrators serialize; the application role is least-privilege.
// Requires TEST_DATABASE_URL (disposable cluster, never production).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import pg from 'pg';
import { checkDatabaseReady, createPool, withTransaction } from '../src/platform/db.js';
import { migrateDatabase } from '../src/platform/migrate.js';

const DB_URL = process.env['TEST_DATABASE_URL'];
const describePg = DB_URL ? describe : describe.skip;
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

let pool: pg.Pool;

async function truncateOwned(): Promise<void> {
  await pool.query(`
    TRUNCATE feedback.outcome_events, feedback.aggregate_versions,
      invocation.usage_ledger, invocation.budget_reservations, invocation.attempts,
      invocation.invocation_claims, routing.prepared_route_claims, routing.decision_metadata,
      catalog.snapshots, catalog.price_schedules, catalog.evidence,
      catalog.profile_revisions, catalog.candidates,
      access.quota_reservations, access.credential_refs, access.policy_versions,
      access.tenants
      RESTART IDENTITY CASCADE
  `);
}

describePg('postgresql migrations', () => {
  beforeAll(async () => {
    pool = createPool(DB_URL as string, 4);
    const ready = await checkDatabaseReady(pool);
    expect(ready.ok).toBe(true);
    await migrateDatabase(pool, MIGRATIONS_DIR);
    const versions = await pool.query('SELECT version FROM public.schema_migrations');
    expect(versions.rows.map((row: { version: string }) => row.version)).toContain('0001_init');
  });

  beforeEach(async () => {
    await truncateOwned();
  });

  it('is idempotent across re-runs and concurrent migrators', async () => {
    expect(await migrateDatabase(pool, MIGRATIONS_DIR)).toEqual([]);
    const [first, second] = await Promise.all([
      migrateDatabase(pool, MIGRATIONS_DIR),
      migrateDatabase(pool, MIGRATIONS_DIR),
    ]);
    expect(first).toEqual([]);
    expect(second).toEqual([]);
    const tables = await pool.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
       WHERE table_schema IN ('access','catalog','routing','invocation','feedback')`,
    );
    expect((tables.rows[0] as { n: number }).n).toBeGreaterThanOrEqual(15);
  });

  it('walks the full durable chain across module schemas', async () => {
    await pool.query(`INSERT INTO access.tenants (id) VALUES ('ten_chain00001')`);
    await pool.query(
      `INSERT INTO catalog.candidates (id, provider_family, model) VALUES ('cand_chain0001', 'synthetic-local', '{}')`,
    );
    await pool.query(
      `INSERT INTO routing.decision_metadata (id, tenant_id, candidate_id, request_digest, policy_version)
       VALUES ('dec_chain00001', 'ten_chain00001', 'cand_chain0001', 'abc', 'pol_chain00001')`,
    );
    await pool.query(
      `INSERT INTO invocation.invocation_claims (tenant_id, endpoint, idempotency_key, decision_id)
       VALUES ('ten_chain00001', '/v1/invocations', 'key-1', 'dec_chain00001')`,
    );
    await pool.query(
      `INSERT INTO invocation.attempts (id, claim_id, ordinal, state)
       VALUES ('att_chain00001', (SELECT id FROM invocation.invocation_claims WHERE idempotency_key = 'key-1'), 0, 'completed')`,
    );
    await pool.query(
      `INSERT INTO invocation.usage_ledger (attempt_id, usage, certainty)
       VALUES ('att_chain00001', '{"inputTokens": 10}', 'completed')`,
    );
    await pool.query(
      `INSERT INTO feedback.outcome_events (event_key, decision_id, label, payload)
       VALUES ('evt-1', 'dec_chain00001', 'passed-tests', '{}')`,
    );
    const count = await pool.query('SELECT count(*)::int AS n FROM invocation.usage_ledger');
    expect((count.rows[0] as { n: number }).n).toBe(1);
  });

  it('rejects duplicate idempotency claims without a second dispatch', async () => {
    await pool.query(`INSERT INTO access.tenants (id) VALUES ('ten_dup00000001')`);
    await pool.query(
      `INSERT INTO invocation.invocation_claims (tenant_id, endpoint, idempotency_key)
       VALUES ('ten_dup00000001', '/v1/invocations', 'dup-key')`,
    );
    await expect(
      pool.query(
        `INSERT INTO invocation.invocation_claims (tenant_id, endpoint, idempotency_key)
         VALUES ('ten_dup00000001', '/v1/invocations', 'dup-key')`,
      ),
    ).rejects.toMatchObject({ code: '23505' });
    const count = await pool.query(
      `SELECT count(*)::int AS n FROM invocation.invocation_claims WHERE idempotency_key = 'dup-key'`,
    );
    expect((count.rows[0] as { n: number }).n).toBe(1);
  });

  it('fails invalid foreign ownership instead of accepting orphans', async () => {
    await expect(
      pool.query(
        `INSERT INTO invocation.attempts (id, claim_id, ordinal, state)
         VALUES ('att_orphan0001', 999999, 0, 'completed')`,
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('rolls back failed transactions atomically', async () => {
    await pool.query(`INSERT INTO access.tenants (id) VALUES ('ten_tx000000001')`);
    await expect(
      withTransaction(pool, async (client) => {
        await client.query(`INSERT INTO access.tenants (id) VALUES ('ten_tx000000002')`);
        await client.query('INSERT INTO access.tenants (id) VALUES (NULL)');
      }),
    ).rejects.toThrow();
    const count = await pool.query(
      `SELECT count(*)::int AS n FROM access.tenants WHERE id = 'ten_tx000000002'`,
    );
    expect((count.rows[0] as { n: number }).n).toBe(0);
  });

  it('upgrades a previous schema version in order', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const onlyV1 = fs.mkdtempSync(join(os.tmpdir(), 'heimdall-mig-v1-'));
    fs.copyFileSync(join(MIGRATIONS_DIR, '0001_init.sql'), join(onlyV1, '0001_init.sql'));
    await migrateDatabase(pool, onlyV1);
    await migrateDatabase(pool, MIGRATIONS_DIR);
    const versions = await pool.query(
      'SELECT version FROM public.schema_migrations ORDER BY version',
    );
    expect(versions.rows.map((row: { version: string }) => row.version)).toEqual([
      '0001_init',
      '0002_tenant_history',
    ]);
    const indexes = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'routing' AND indexname = 'decision_metadata_tenant_created_idx'`,
    );
    expect(indexes.rowCount).toBe(1);
    fs.rmSync(onlyV1, { recursive: true, force: true });
  });

  it('keeps migrations forward-only with no destructive statements', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n');
      expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|SCHEMA)\b/i);
      expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    }
  });

  it('grants the application role least privilege without delete rights', async () => {
    const role = await pool.query(`SELECT 1 FROM pg_roles WHERE rolname = 'heimdall_app'`);
    expect(role.rowCount).toBe(1);
    const insert = await pool.query(
      `SELECT has_table_privilege('heimdall_app', 'invocation.invocation_claims', 'INSERT') AS ok`,
    );
    const remove = await pool.query(
      `SELECT has_table_privilege('heimdall_app', 'invocation.invocation_claims', 'DELETE') AS ok`,
    );
    expect((insert.rows[0] as { ok: boolean }).ok).toBe(true);
    expect((remove.rows[0] as { ok: boolean }).ok).toBe(false);
  });
});
