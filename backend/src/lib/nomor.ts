import type pg from 'pg';
import { Jam } from './jam.js';

export type KodeDokumen = 'PJ' | 'PB' | 'OP' | 'PP' | 'JU' | 'SP';

/**
 * Membangkitkan nomor dokumen berformat KODE-YYYYMM-NNNNN di dalam transaksi yang sama.
 * Bulan diambil dari tanggal bisnis WIB; urutan direset tiap bulan per apotek.
 */
export async function buatNomorDokumen(
  client: pg.PoolClient,
  apotekId: number | string,
  kode: KodeDokumen,
  tanggalWib?: string,
): Promise<string> {
  const tgl = tanggalWib ?? Jam.hariIniWib();
  const ym = tgl.slice(0, 7); // YYYY-MM
  const yyyymm = ym.replace('-', '');

  const res = await client.query<{ terakhir: number }>(
    `INSERT INTO urutan_nomor (apotek_id, jenis, periode, terakhir)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (apotek_id, jenis, periode)
     DO UPDATE SET terakhir = urutan_nomor.terakhir + 1
     RETURNING terakhir`,
    [apotekId, kode, ym],
  );

  const urutan = res.rows[0]?.terakhir ?? 1;
  return `${kode}-${yyyymm}-${String(urutan).padStart(5, '0')}`;
}
