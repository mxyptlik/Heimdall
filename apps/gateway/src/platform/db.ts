// PostgreSQL adapter bootstrap (T020). Parameterized queries only; every
// multi-statement unit of work runs inside an explicit transaction with
// guaranteed client release. Domain code never touches this module directly:
// storage adapters in later tasks own their queries against their own
// schemas. The gateway runtime connects with least-privilege credentials,
// never as a superuser.
import pg from 'pg';

const { Pool } = pg;
export type PoolClient = pg.PoolClient;

/** Create a connection pool. Callers own shutdown via `pool.end()`. */
export function createPool(connectionString: string, maxClients = 10): pg.Pool {
  return new Pool({ connectionString, max: maxClients });
}

/**
 * Run work inside a transaction: commit on success, roll back on any error,
 * always release the client. Nested use is a caller error, not a savepoint.
 */
export async function withTransaction<T>(
  pool: pg.Pool,
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Liveness probe for readiness checks. Never throws. */
export async function checkDatabaseReady(
  pool: pg.Pool,
): Promise<{ ok: boolean; version?: string }> {
  try {
    const result = await pool.query('SELECT version() AS version');
    const row = result.rows[0] as { version?: string } | undefined;
    return { ok: true, ...(row?.version ? { version: row.version } : {}) };
  } catch {
    return { ok: false };
  }
}
