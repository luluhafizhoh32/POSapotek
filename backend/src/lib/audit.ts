import type pg from 'pg';
import { withApotek } from '../db/withApotek.js';
import { Jam } from './jam.js';

export interface DataAudit {
  apotekId: number | string;
  penggunaId?: number | string | null;
  aksi: string;
  entitas?: string | null;
  entitasId?: string | number | null;
  hasil: 'berhasil' | 'gagal';
  kodeGalat?: string | null;
  detail?: Record<string, unknown> | null;
}

export async function catatAudit(
  client: pg.PoolClient,
  data: DataAudit,
): Promise<void> {
  await client.query(
    `INSERT INTO jejak_audit
      (apotek_id, pengguna_id, aksi, entitas, entitas_id, hasil, kode_galat, detail, waktu)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      data.apotekId,
      data.penggunaId ?? null,
      data.aksi,
      data.entitas ?? null,
      data.entitasId !== undefined && data.entitasId !== null ? String(data.entitasId) : null,
      data.hasil,
      data.kodeGalat ?? null,
      data.detail ? JSON.stringify(data.detail) : null,
      Jam.sekarang().toISO(),
    ],
  );
}

/**
 * Mencatat audit percobaan gagal di transaksi terpisah setelah transaksi utama rollback.
 */
export async function catatAuditGagal(
  data: Omit<DataAudit, 'hasil'>,
): Promise<void> {
  try {
    await withApotek(data.apotekId, async (client) => {
      await catatAudit(client, { ...data, hasil: 'gagal' });
    });
  } catch {
    // Jangan timpa galat utama bila pencatatan audit gagal
  }
}
