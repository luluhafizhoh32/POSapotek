import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit } from '../../lib/audit.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam } from '../../lib/jam.js';
import { keUangBulat } from '../../lib/uang.js';
import {
  skemaKode,
  skemaPaginasi,
  skemaUangPositif,
  teksOpsional,
  teksWajib,
} from '../../lib/validasi.js';

export const skemaDaftarBarang = skemaPaginasi.extend({
  q: z.string().trim().max(100).optional(),
  barcode: z.string().trim().max(100).optional(),
  kategori: z.enum(['generik', 'paten']).optional(),
  golongan: z
    .enum(['bebas', 'bebas_terbatas', 'keras', 'narkotika', 'psikotropika', 'prekursor'])
    .optional(),
  aktif: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  defekta: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const skemaBuatBarang = z
  .object({
    kode: skemaKode,
    barcode: teksOpsional(100).optional(),
    nama: teksWajib(1, 150),
    kategori: z.enum(['generik', 'paten']),
    golongan: z.enum([
      'bebas',
      'bebas_terbatas',
      'keras',
      'narkotika',
      'psikotropika',
      'prekursor',
    ]),
    satuan: teksWajib(1, 50),
    harga_jual: skemaUangPositif,
    stok_minimum: z.number().int().min(0).max(1_000_000).default(0),
    pemasok_utama_id: z.number().int().positive().nullable().optional(),
  })
  .strict();

export const skemaUbahBarang = skemaBuatBarang.omit({ kode: true });

export const skemaDaftarBatch = z.object({
  semua: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

interface BarisBarang {
  id: string;
  kode: string;
  barcode: string | null;
  nama: string;
  kategori: 'generik' | 'paten';
  golongan: string;
  satuan: string;
  harga_jual: string;
  stok_minimum: number;
  pemasok_utama_id: string | null;
  aktif: boolean;
  stok_total: string;
  stok_kedaluwarsa: string;
}

function petakanBarang(r: BarisBarang) {
  return {
    id: Number(r.id),
    kode: r.kode,
    barcode: r.barcode,
    nama: r.nama,
    kategori: r.kategori,
    golongan: r.golongan,
    satuan: r.satuan,
    harga_jual: keUangBulat(r.harga_jual),
    stok_minimum: r.stok_minimum,
    pemasok_utama_id: r.pemasok_utama_id ? Number(r.pemasok_utama_id) : null,
    aktif: r.aktif,
    stok_total: Number(r.stok_total),
    stok_kedaluwarsa: Number(r.stok_kedaluwarsa),
  };
}

export async function daftarBarangLayanan(
  apotekId: number,
  query: z.infer<typeof skemaDaftarBarang>,
) {
  const hariIni = Jam.hariIniWib();

  return withApotek(apotekId, async (client) => {
    const params: unknown[] = [hariIni];
    const kondisi: string[] = [];

    if (query.defekta) {
      kondisi.push('b.aktif = true');
      kondisi.push('b.stok_minimum > 0');
      kondisi.push('COALESCE(s.stok_total, 0) <= b.stok_minimum');
    } else {
      params.push(query.aktif);
      kondisi.push(`b.aktif = $${params.length}`);
    }

    if (query.q && query.q.length > 0) {
      params.push(`%${query.q.toLowerCase()}%`);
      kondisi.push(
        `(lower(b.nama) LIKE $${params.length} OR lower(b.kode) LIKE $${params.length} OR lower(COALESCE(b.barcode, '')) LIKE $${params.length})`,
      );
    }
    if (query.barcode && query.barcode.length > 0) {
      params.push(query.barcode);
      kondisi.push(`b.barcode = $${params.length}`);
    }
    if (query.kategori) {
      params.push(query.kategori);
      kondisi.push(`b.kategori = $${params.length}`);
    }
    if (query.golongan) {
      params.push(query.golongan);
      kondisi.push(`b.golongan = $${params.length}`);
    }

    const whereSql = kondisi.length > 0 ? `WHERE ${kondisi.join(' AND ')}` : '';
    const baseJoin = `
      FROM barang b
      LEFT JOIN (
        SELECT barang_id,
               COALESCE(SUM(stok) FILTER (WHERE tanggal_kedaluwarsa >= $1::date), 0) AS stok_total,
               COALESCE(SUM(stok) FILTER (WHERE tanggal_kedaluwarsa < $1::date), 0) AS stok_kedaluwarsa
        FROM batch_barang
        GROUP BY barang_id
      ) s ON s.barang_id = b.id
      ${whereSql}
    `;

    const totalRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt ${baseJoin}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.cnt ?? 0);

    const offset = (query.halaman - 1) * query.per_halaman;
    const rowsRes = await client.query<BarisBarang>(
      `SELECT b.id, b.kode, b.barcode, b.nama, b.kategori, b.golongan, b.satuan,
              b.harga_jual, b.stok_minimum, b.pemasok_utama_id, b.aktif,
              COALESCE(s.stok_total, 0) AS stok_total,
              COALESCE(s.stok_kedaluwarsa, 0) AS stok_kedaluwarsa
       ${baseJoin}
       ORDER BY b.nama ASC, b.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map(petakanBarang),
      meta: {
        halaman: query.halaman,
        per_halaman: query.per_halaman,
        total,
      },
    };
  });
}

async function ambilSatuBarangDiClient(
  client: import('pg').PoolClient,
  id: number,
  hariIni: string,
) {
  const res = await client.query<BarisBarang>(
    `SELECT b.id, b.kode, b.barcode, b.nama, b.kategori, b.golongan, b.satuan,
            b.harga_jual, b.stok_minimum, b.pemasok_utama_id, b.aktif,
            COALESCE(s.stok_total, 0) AS stok_total,
            COALESCE(s.stok_kedaluwarsa, 0) AS stok_kedaluwarsa
     FROM barang b
     LEFT JOIN (
       SELECT barang_id,
              COALESCE(SUM(stok) FILTER (WHERE tanggal_kedaluwarsa >= $1::date), 0) AS stok_total,
              COALESCE(SUM(stok) FILTER (WHERE tanggal_kedaluwarsa < $1::date), 0) AS stok_kedaluwarsa
       FROM batch_barang
       WHERE barang_id = $2
       GROUP BY barang_id
     ) s ON s.barang_id = b.id
     WHERE b.id = $2`,
    [hariIni, id],
  );
  const row = res.rows[0];
  if (!row) throw new GalatAplikasi('TIDAK_DITEMUKAN');
  return petakanBarang(row);
}

export async function ambilBarangLayanan(apotekId: number, id: number) {
  const hariIni = Jam.hariIniWib();
  return withApotek(apotekId, (client) => ambilSatuBarangDiClient(client, id, hariIni));
}

export async function buatBarangLayanan(
  pengguna: KonteksPengguna,
  input: z.infer<typeof skemaBuatBarang>,
) {
  const sekarang = Jam.sekarang();
  const hariIni = Jam.hariIniWib();

  return withApotek(pengguna.apotekId, async (client) => {
    if (input.pemasok_utama_id) {
      const p = await client.query('SELECT 1 FROM pemasok WHERE id = $1', [
        input.pemasok_utama_id,
      ]);
      if (!p.rowCount) {
        throw new GalatAplikasi('TIDAK_DITEMUKAN', { field: 'pemasok_utama_id' });
      }
    }

    const res = await client.query<{ id: string }>(
      `INSERT INTO barang
        (apotek_id, kode, barcode, nama, kategori, golongan, satuan,
         harga_jual, stok_minimum, pemasok_utama_id, dibuat_pada, diubah_pada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       RETURNING id`,
      [
        pengguna.apotekId,
        input.kode,
        input.barcode ?? null,
        input.nama,
        input.kategori,
        input.golongan,
        input.satuan,
        input.harga_jual,
        input.stok_minimum,
        input.pemasok_utama_id ?? null,
        sekarang.toISO(),
      ],
    );
    const barangId = Number(res.rows[0]!.id);

    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'barang.buat',
      entitas: 'barang',
      entitasId: barangId,
      hasil: 'berhasil',
      detail: { kode: input.kode },
    });

    return ambilSatuBarangDiClient(client, barangId, hariIni);
  });
}

export async function ubahBarangLayanan(
  pengguna: KonteksPengguna,
  id: number,
  input: z.infer<typeof skemaUbahBarang>,
) {
  const sekarang = Jam.sekarang();
  const hariIni = Jam.hariIniWib();

  return withApotek(pengguna.apotekId, async (client) => {
    if (input.pemasok_utama_id) {
      const p = await client.query('SELECT 1 FROM pemasok WHERE id = $1', [
        input.pemasok_utama_id,
      ]);
      if (!p.rowCount) {
        throw new GalatAplikasi('TIDAK_DITEMUKAN', { field: 'pemasok_utama_id' });
      }
    }

    const res = await client.query(
      `UPDATE barang
       SET barcode = $1, nama = $2, kategori = $3, golongan = $4, satuan = $5,
           harga_jual = $6, stok_minimum = $7, pemasok_utama_id = $8, diubah_pada = $9
       WHERE id = $10`,
      [
        input.barcode ?? null,
        input.nama,
        input.kategori,
        input.golongan,
        input.satuan,
        input.harga_jual,
        input.stok_minimum,
        input.pemasok_utama_id ?? null,
        sekarang.toISO(),
        id,
      ],
    );
    if (!res.rowCount) throw new GalatAplikasi('TIDAK_DITEMUKAN');

    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'barang.ubah',
      entitas: 'barang',
      entitasId: id,
      hasil: 'berhasil',
    });

    return ambilSatuBarangDiClient(client, id, hariIni);
  });
}

export async function setAktifBarangLayanan(
  pengguna: KonteksPengguna,
  id: number,
  aktif: boolean,
) {
  const sekarang = Jam.sekarang();
  const hariIni = Jam.hariIniWib();

  return withApotek(pengguna.apotekId, async (client) => {
    const res = await client.query(
      `UPDATE barang SET aktif = $1, diubah_pada = $2 WHERE id = $3`,
      [aktif, sekarang.toISO(), id],
    );
    if (!res.rowCount) throw new GalatAplikasi('TIDAK_DITEMUKAN');

    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: aktif ? 'barang.aktifkan' : 'barang.nonaktifkan',
      entitas: 'barang',
      entitasId: id,
      hasil: 'berhasil',
    });

    return ambilSatuBarangDiClient(client, id, hariIni);
  });
}

export async function daftarBatchBarangLayanan(
  apotekId: number,
  barangId: number,
  semua: boolean,
) {
  const hariIni = Jam.hariIniWib();

  return withApotek(apotekId, async (client) => {
    const cek = await client.query('SELECT 1 FROM barang WHERE id = $1', [barangId]);
    if (!cek.rowCount) throw new GalatAplikasi('TIDAK_DITEMUKAN');

    const filterStok = semua ? '' : 'AND stok > 0';
    const res = await client.query<{
      id: string;
      nomor_batch: string;
      tanggal_kedaluwarsa: Date | string;
      harga_beli: string;
      stok: number;
    }>(
      `SELECT id, nomor_batch, tanggal_kedaluwarsa, harga_beli, stok
       FROM batch_barang
       WHERE barang_id = $1 ${filterStok}
       ORDER BY tanggal_kedaluwarsa ASC, id ASC`,
      [barangId],
    );

    return res.rows.map((r) => {
      const tglExp =
        r.tanggal_kedaluwarsa instanceof Date
          ? Jam.keTanggalWib(r.tanggal_kedaluwarsa)
          : String(r.tanggal_kedaluwarsa).slice(0, 10);
      return {
        id: Number(r.id),
        nomor_batch: r.nomor_batch,
        tanggal_kedaluwarsa: tglExp,
        harga_beli: keUangBulat(r.harga_beli),
        stok: r.stok,
        sudah_kedaluwarsa: tglExp < hariIni,
      };
    });
  });
}
