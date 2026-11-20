import { getPool } from '../../db/pool.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';

export async function daftarApotekPantauLayanan(pengguna: KonteksPengguna) {
  const res = await getPool().query<{
    id: string;
    kode: string;
    nama: string;
    sendiri: boolean;
  }>(
    `SELECT a.id, a.kode, a.nama, (a.id = $1) AS sendiri
     FROM apotek a
     WHERE a.id = $1
        OR EXISTS (
          SELECT 1 FROM akses_pantau ap
          WHERE ap.pengguna_id = $2 AND ap.apotek_id = a.id
        )
     ORDER BY sendiri DESC, a.nama ASC`,
    [pengguna.apotekId, pengguna.id],
  );

  return res.rows.map((r) => ({
    id: Number(r.id),
    kode: r.kode,
    nama: r.nama,
    sendiri: r.sendiri,
  }));
}

export async function verifikasiAksesPantau(
  pengguna: KonteksPengguna,
  targetApotekId: number,
): Promise<void> {
  if (targetApotekId === pengguna.apotekId) return;

  const res = await getPool().query(
    `SELECT 1 FROM akses_pantau WHERE pengguna_id = $1 AND apotek_id = $2`,
    [pengguna.id, targetApotekId],
  );
  if (!res.rowCount || res.rowCount === 0) {
    throw new GalatAplikasi('DILARANG');
  }
}
