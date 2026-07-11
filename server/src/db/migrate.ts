/**
 * Apply pending migrations. Run: npm run db:migrate -w server
 * Needs server/.env with a valid DATABASE_URL.
 *
 * Resolves the migrations folder as:
 * 1. MIGRATIONS_DIR env (Docker / App Platform)
 * 2. ./src/db/migrations relative to cwd (local `tsx` from server/)
 * 3. ./migrations relative to this file's directory (compiled dist next to copied SQL)
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, closeDb } from './client.js';
import { loadEnv } from '../config/env.js';
import { logger } from '../logger.js';

function resolveMigrationsFolder(): string {
  const env = loadEnv();
  if (env.MIGRATIONS_DIR) return path.resolve(env.MIGRATIONS_DIR);

  const cwdCandidate = path.resolve(process.cwd(), 'src/db/migrations');
  if (fs.existsSync(cwdCandidate)) return cwdCandidate;

  const here = path.dirname(fileURLToPath(import.meta.url));
  const besideDist = path.resolve(here, 'migrations');
  if (fs.existsSync(besideDist)) return besideDist;

  // Fallback: source tree relative to compiled dist/db/
  return path.resolve(here, '../../src/db/migrations');
}

async function main(): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder();
  logger.info({ migrationsFolder }, 'Running migrations…');
  await migrate(getDb(), { migrationsFolder });
  logger.info('Migrations complete.');
  await closeDb();
}

main().catch(async (e) => {
  logger.error({ err: e }, 'Migration failed');
  await closeDb();
  process.exit(1);
});
