/**
 * Apply pending migrations. Run: npm run db:migrate -w server
 * Needs server/.env with a valid DATABASE_URL.
 */
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, closeDb } from './client.js';
import { logger } from '../logger.js';

async function main(): Promise<void> {
  logger.info('Running migrations…');
  await migrate(getDb(), { migrationsFolder: './src/db/migrations' });
  logger.info('Migrations complete.');
  await closeDb();
}

main().catch(async (e) => {
  logger.error({ err: e }, 'Migration failed');
  await closeDb();
  process.exit(1);
});
