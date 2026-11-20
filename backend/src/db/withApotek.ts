import type pg from 'pg';
import { getPool } from './pool.js';
import { GalatAplikasi } from '../lib/galat.js';

function petakanGalatDb(err: unknown): never {
  if (err instanceof GalatAplikasi) {
    throw err;
  }
  const pgErr = err as { code?: string; message?: string; constraint?: string };
  const pesan = pgErr?.message ?? '';

  if (pesan.startsWith('JURNAL_TIDAK_SEIMBANG')) {
    throw new GalatAplikasi('JURNAL_TIDAK_SEIMBANG');
  }
  if (pesan.includes('PERIODE_DITUTUP')) {
    throw new GalatAplikasi('PERIODE_DITUTUP');
  }
  if (pgErr?.code === '23505') {
    throw new GalatAplikasi('DUPLIKAT');
  }
  throw err;
}

/**
 * Menjalankan operasi di dalam satu transaksi dengan konteks RLS `app.apotek_id`.
 * Setiap akses ke tabel ber-RLS WAJIB melewati pembantu ini.
 */
export async function withApotek<T>(
  apotekId: number | string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.apotek_id', $1, true)`, [String(apotekId)]);
    const hasil = await fn(client);
    await client.query('COMMIT');
    return hasil;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Abaikan galat rollback agar galat asli tetap dilempar
    }
    petakanGalatDb(err);
  } finally {
    client.release();
  }
}

/**
 * Transaksi tanpa konteks apotek (khusus untuk tabel non-RLS seperti apotek, pengguna, sesi_login).
 */
export async function withTransaksi<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const hasil = await fn(client);
    await client.query('COMMIT');
    return hasil;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Abaikan galat rollback
    }
    petakanGalatDb(err);
  } finally {
    client.release();
  }
}
