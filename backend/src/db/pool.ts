import pg from 'pg';
import { getEnv } from '../config/env.js';

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _migratorPool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    const env = getEnv();
    _pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
    });
  }
  return _pool;
}

export function getMigratorPool(): pg.Pool {
  if (!_migratorPool) {
    const env = getEnv();
    _migratorPool = new Pool({
      connectionString: env.DATABASE_URL_MIGRATOR,
      max: 5,
    });
  }
  return _migratorPool;
}

export async function tutupSemuaPool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
  if (_migratorPool) {
    await _migratorPool.end();
    _migratorPool = null;
  }
}
