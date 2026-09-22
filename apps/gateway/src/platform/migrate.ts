// Forward-only migration harness (T020). Applies ordered `*.sql` files once,
// tracked in `public.schema_migrations`, serialized across replicas by a
// transaction-scoped advisory lock. There is no down-migration: rollback
// means compatible app rollback or backup restore. Concurrent migrators
// serialize on the lock; the second run is a no-op.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';
import { withTransaction } from './db.js';

export const MIGRATION_LOCK_KEY = 'heimdall_migrations';

/** Apply pending migrations in lexicographic order. Returns applied versions. */
export async function migrateDatabase(pool: pg.Pool, migrationsDir: string): Promise<string[]> {
  return withTransaction(pool, async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [MIGRATION_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const applied = new Set<string>(
      (await client.query('SELECT version FROM public.schema_migrations')).rows.map(
        (row: { version: string }) => row.version,
      ),
    );
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    const newlyApplied: string[] = [];
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (applied.has(version)) continue;
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1)', [version]);
      newlyApplied.push(version);
    }
    return newlyApplied;
  });
}
