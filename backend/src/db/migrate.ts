import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import { getEnv } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../migrations');

export async function jalankanMigrasi(databaseUrl?: string): Promise<void> {
  const url = databaseUrl ?? getEnv().DATABASE_URL_MIGRATOR;
  await runner({
    databaseUrl: url,
    dir: migrationsDir,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    verbose: true,
    noLock: false,
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  jalankanMigrasi()
    .then(() => {
      console.log('Migrasi selesai.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migrasi gagal:', err);
      process.exit(1);
    });
}
