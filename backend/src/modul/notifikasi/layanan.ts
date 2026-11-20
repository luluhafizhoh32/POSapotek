import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam } from '../../lib/jam.js';
import { skemaPaginasi } from '../../lib/validasi.js';

export const skemaDaftarNotifikasi = skemaPaginasi.extend({
  belum_dibaca: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export async function daftarNotifikasiLayanan(
  apotekId: number,
  penggunaId: number,
  query: z.infer<typeof skemaDaftarNotifikasi>,
) {
  return withApotek(apotekId, async (client) => {
    const kondisi: string[] = ['penerima_id = $1'];
    const params: unknown[] = [penggunaId];

    if (query.belum_dibaca) {
      kondisi.push('dibaca_pada IS NULL');
    }

    const whereSql = kondisi.join(' AND ');
    const totalRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM notifikasi WHERE ${whereSql}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.cnt ?? 0);

    const offset = (query.halaman - 1) * query.per_halaman;
    const rowsRes = await client.query<{
      id: string;
      jenis: string;
      judul: string;
      isi: string;
      tautan_tipe: string | null;
      tautan_id: string | null;
      dibaca_pada: Date | null;
      dibuat_pada: Date;
    }>(
      `SELECT id, jenis, judul, isi, tautan_tipe, tautan_id, dibaca_pada, dibuat_pada
       FROM notifikasi
       WHERE ${whereSql}
       ORDER BY dibuat_pada DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map((r) => ({
        id: Number(r.id),
        jenis: r.jenis,
        judul: r.judul,
        isi: r.isi,
        tautan_tipe: r.tautan_tipe,
        tautan_id: r.tautan_id,
        dibaca_pada: r.dibaca_pada ? Jam.keIsoWib(r.dibaca_pada) : null,
        dibuat_pada: Jam.keIsoWib(r.dibuat_pada),
      })),
      meta: {
        halaman: query.halaman,
        per_halaman: query.per_halaman,
        total,
      },
    };
  });
}

export async function tandaiDibacaLayanan(
  apotekId: number,
  penggunaId: number,
  notifikasiId: number,
): Promise<void> {
  await withApotek(apotekId, async (client) => {
    const res = await client.query(
      `UPDATE notifikasi
       SET dibaca_pada = COALESCE(dibaca_pada, $1)
       WHERE id = $2 AND penerima_id = $3`,
      [Jam.sekarang().toISO(), notifikasiId, penggunaId],
    );
    if (!res.rowCount || res.rowCount === 0) {
      throw new GalatAplikasi('TIDAK_DITEMUKAN');
    }
  });
}

export async function tandaiSemuaDibacaLayanan(
  apotekId: number,
  penggunaId: number,
): Promise<void> {
  await withApotek(apotekId, async (client) => {
    await client.query(
      `UPDATE notifikasi
       SET dibaca_pada = $1
       WHERE penerima_id = $2 AND dibaca_pada IS NULL`,
      [Jam.sekarang().toISO(), penggunaId],
    );
  });
}
