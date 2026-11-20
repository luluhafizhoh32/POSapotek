import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit } from '../../lib/audit.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam } from '../../lib/jam.js';
import { skemaKode, skemaPaginasi, teksOpsional, teksWajib } from '../../lib/validasi.js';

export const skemaDaftarPemasok = skemaPaginasi.extend({
  q: z.string().trim().max(100).optional(),
  aktif: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export const skemaBuatPemasok = z
  .object({
    kode: skemaKode,
    nama: teksWajib(1, 150),
    nama_kontak: teksOpsional(150).optional(),
    telepon: teksOpsional(50).optional(),
    alamat: teksOpsional(500).optional(),
  })
  .strict();

export const skemaUbahPemasok = z
  .object({
    nama: teksWajib(1, 150),
    nama_kontak: teksOpsional(150).optional(),
    telepon: teksOpsional(50).optional(),
    alamat: teksOpsional(500).optional(),
  })
  .strict();

interface BarisPemasok {
  id: string;
  kode: string;
  nama: string;
  nama_kontak: string | null;
  telepon: string | null;
  alamat: string | null;
  aktif: boolean;
  dibuat_pada: Date;
}

function petakanPemasok(r: BarisPemasok) {
  return {
    id: Number(r.id),
    kode: r.kode,
    nama: r.nama,
    nama_kontak: r.nama_kontak,
    telepon: r.telepon,
    alamat: r.alamat,
    aktif: r.aktif,
    dibuat_pada: Jam.keIsoWib(r.dibuat_pada),
  };
}

export async function daftarPemasokLayanan(
  apotekId: number,
  query: z.infer<typeof skemaDaftarPemasok>,
) {
  return withApotek(apotekId, async (client) => {
    const kondisi: string[] = ['aktif = $1'];
    const params: unknown[] = [query.aktif];

    if (query.q && query.q.length > 0) {
      params.push(`%${query.q.toLowerCase()}%`);
      kondisi.push(`(lower(nama) LIKE $${params.length} OR lower(kode) LIKE $${params.length})`);
    }

    const whereSql = kondisi.join(' AND ');
    const totalRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM pemasok WHERE ${whereSql}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.cnt ?? 0);

    const offset = (query.halaman - 1) * query.per_halaman;
    const rowsRes = await client.query<BarisPemasok>(
      `SELECT id, kode, nama, nama_kontak, telepon, alamat, aktif, dibuat_pada
       FROM pemasok
       WHERE ${whereSql}
       ORDER BY nama ASC, id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map(petakanPemasok),
      meta: {
        halaman: query.halaman,
        per_halaman: query.per_halaman,
        total,
      },
    };
  });
}

export async function buatPemasokLayanan(
  pengguna: KonteksPengguna,
  input: z.infer<typeof skemaBuatPemasok>,
) {
  const row = await withApotek(pengguna.apotekId, async (client) => {
    const res = await client.query<BarisPemasok>(
      `INSERT INTO pemasok (apotek_id, kode, nama, nama_kontak, telepon, alamat, dibuat_pada)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, kode, nama, nama_kontak, telepon, alamat, aktif, dibuat_pada`,
      [
        pengguna.apotekId,
        input.kode,
        input.nama,
        input.nama_kontak ?? null,
        input.telepon ?? null,
        input.alamat ?? null,
        Jam.sekarang().toISO(),
      ],
    );
    const inserted = res.rows[0]!;
    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'pemasok.buat',
      entitas: 'pemasok',
      entitasId: inserted.id,
      hasil: 'berhasil',
      detail: { kode: inserted.kode },
    });
    return inserted;
  });

  return petakanPemasok(row);
}

export async function ambilPemasokLayanan(apotekId: number, id: number) {
  return withApotek(apotekId, async (client) => {
    const res = await client.query<BarisPemasok>(
      `SELECT id, kode, nama, nama_kontak, telepon, alamat, aktif, dibuat_pada
       FROM pemasok WHERE id = $1`,
      [id],
    );
    const row = res.rows[0];
    if (!row) throw new GalatAplikasi('TIDAK_DITEMUKAN');
    return petakanPemasok(row);
  });
}

export async function ubahPemasokLayanan(
  pengguna: KonteksPengguna,
  id: number,
  input: z.infer<typeof skemaUbahPemasok>,
) {
  const row = await withApotek(pengguna.apotekId, async (client) => {
    const res = await client.query<BarisPemasok>(
      `UPDATE pemasok
       SET nama = $1, nama_kontak = $2, telepon = $3, alamat = $4
       WHERE id = $5
       RETURNING id, kode, nama, nama_kontak, telepon, alamat, aktif, dibuat_pada`,
      [
        input.nama,
        input.nama_kontak ?? null,
        input.telepon ?? null,
        input.alamat ?? null,
        id,
      ],
    );
    const updated = res.rows[0];
    if (!updated) throw new GalatAplikasi('TIDAK_DITEMUKAN');
    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'pemasok.ubah',
      entitas: 'pemasok',
      entitasId: id,
      hasil: 'berhasil',
    });
    return updated;
  });

  return petakanPemasok(row);
}

export async function setAktifPemasokLayanan(
  pengguna: KonteksPengguna,
  id: number,
  aktif: boolean,
) {
  const row = await withApotek(pengguna.apotekId, async (client) => {
    const res = await client.query<BarisPemasok>(
      `UPDATE pemasok SET aktif = $1 WHERE id = $2
       RETURNING id, kode, nama, nama_kontak, telepon, alamat, aktif, dibuat_pada`,
      [aktif, id],
    );
    const updated = res.rows[0];
    if (!updated) throw new GalatAplikasi('TIDAK_DITEMUKAN');
    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: aktif ? 'pemasok.aktifkan' : 'pemasok.nonaktifkan',
      entitas: 'pemasok',
      entitasId: id,
      hasil: 'berhasil',
    });
    return updated;
  });

  return petakanPemasok(row);
}
