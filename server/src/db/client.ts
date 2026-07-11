import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { loadEnv } from '../config/env.js';
import { AppError } from '../errors.js';

let pool: pg.Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

/** DO Managed Postgres uses a private CA; strip sslmode so Pool ssl wins. */
function poolConfig(connectionString: string): pg.PoolConfig {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('ssl');
  return {
    connectionString: url.toString(),
    // TODO(prod): pin the DO CA cert instead of disabling verification.
    ssl: { rejectUnauthorized: false },
    max: 10,
  };
}

export function getPool(): pg.Pool {
  if (pool) return pool;
  const env = loadEnv();
  if (!env.DATABASE_URL) throw AppError.upstream('DATABASE_URL not configured');
  pool = new pg.Pool(poolConfig(env.DATABASE_URL));
  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!db) db = drizzle(getPool(), { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
