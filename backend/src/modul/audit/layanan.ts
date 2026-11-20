import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { Jam } from '../../lib/jam.js';
import { skemaPaginasi, skemaTanggal } from '../../lib/validasi.js';

export const skemaDaftarAudit = skemaPaginasi.extend({
  dari: skemaTanggal.optional(),
  sampai: skemaTanggal.optional(),
  aksi: z.string().trim().max(100).optional(),
  pengguna_id: z.coerce.number().int().positive().optional(),
  hasil: z.enum(['berhasil', 'gagal']).optional(),
});

export async function daftarAuditLayanan(
  apotekId: number,
  query: z.infer<typeof skemaDaftarAudit>,
) {
  return withApotek(apotekId, async (client) => {
    const kondisi: string[] = [];
    const params: unknown[] = [];

    if (query.dari) {
      params.push(`${query.dari}T00:00:00+07:00`);
      kondisi.push(`ja.waktu >= $${params.length}`);
    }
    if (query.sampai) {
      params.push(`${query.sampai}T23:59:59.999+07:00`);
      kondisi.push(`ja.waktu <= $${params.length}`);
    }
    if (query.aksi) {
      params.push(query.aksi);
      kondisi.push(`ja.aksi = $${params.length}`);
    }
    if (query.pengguna_id) {
      params.push(query.pengguna_id);
      kondisi.push(`ja.pengguna_id = $${params.length}`);
    }
    if (query.hasil) {
      params.push(query.hasil);
      kondisi.push(`ja.hasil = $${params.length}`);
    }

    const whereSql = kondisi.length > 0 ? `WHERE ${kondisi.join(' AND ')}` : '';
    const totalRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM jejak_audit ja ${whereSql}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.cnt ?? 0);

    const offset = (query.halaman - 1) * query.per_halaman;
    const rowsRes = await client.query<{
      id: string;
      waktu: Date;
      pengguna_id: string | null;
      pengguna_nama: string | null;
      aksi: string;
      entitas: string | null;
      entitas_id: string | null;
      hasil: 'berhasil' | 'gagal';
      kode_galat: string | null;
      detail: unknown;
    }>(
      `SELECT ja.id, ja.waktu, ja.pengguna_id, u.nama_lengkap AS pengguna_nama,
              ja.aksi, ja.entitas, ja.entitas_id, ja.hasil, ja.kode_galat, ja.detail
       FROM jejak_audit ja
       LEFT JOIN pengguna u ON u.id = ja.pengguna_id
       ${whereSql}
       ORDER BY ja.waktu DESC, ja.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map((r) => ({
        id: Number(r.id),
        waktu: Jam.keIsoWib(r.waktu),
        pengguna: r.pengguna_id
          ? { id: Number(r.pengguna_id), nama_lengkap: r.pengguna_nama! }
          : null,
        aksi: r.aksi,
        entitas: r.entitas,
        entitas_id: r.entitas_id,
        hasil: r.hasil,
        kode_galat: r.kode_galat,
        detail: r.detail,
      })),
      meta: { halaman: query.halaman, per_halaman: query.per_halaman, total },
    };
  });
}
