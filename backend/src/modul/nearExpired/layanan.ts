import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { Jam } from '../../lib/jam.js';
import { keUangBulat } from '../../lib/uang.js';
import { skemaPaginasi } from '../../lib/validasi.js';

export const skemaNearExpiredQuery = z.object({
  batas_hari: z.coerce.number().int().min(1).max(365).optional(),
});

export async function hitungNearExpiredDiClient(
  client: import('pg').PoolClient,
  apotekId: number,
  batasHariOverride?: number,
) {
  const hariIni = Jam.hariIniWib();

  let batasHari = batasHariOverride;
  if (batasHari === undefined) {
    const pRes = await client.query<{ batas_near_expired_hari: number }>(
      `SELECT batas_near_expired_hari FROM pengaturan_apotek WHERE apotek_id = $1`,
      [apotekId],
    );
    batasHari = pRes.rows[0]?.batas_near_expired_hari ?? 90;
  }

  const res = await client.query<{
    batch_id: string;
    barang_id: string;
    kode: string;
    nama: string;
    satuan: string;
    nomor_batch: string;
    tanggal_kedaluwarsa: Date | string;
    sisa_hari: number;
    stok: number;
    harga_beli: string;
  }>(
    `SELECT bb.id AS batch_id, b.id AS barang_id, b.kode, b.nama, b.satuan,
            bb.nomor_batch, bb.tanggal_kedaluwarsa,
            (bb.tanggal_kedaluwarsa - $1::date)::int AS sisa_hari,
            bb.stok, bb.harga_beli
     FROM batch_barang bb
     JOIN barang b ON b.id = bb.barang_id
     WHERE bb.stok > 0
       AND (bb.tanggal_kedaluwarsa - $1::date) <= $2
     ORDER BY bb.tanggal_kedaluwarsa ASC, bb.id ASC`,
    [hariIni, batasHari],
  );

  const mendekati: Array<{
    batch_id: number;
    barang: { id: number; kode: string; nama: string; satuan: string };
    nomor_batch: string;
    tanggal_kedaluwarsa: string;
    sisa_hari: number;
    stok: number;
    nilai: number;
  }> = [];

  const sudahKedaluwarsa: typeof mendekati = [];
  let nilaiBerisiko = 0;

  for (const r of res.rows) {
    const nilai = r.stok * keUangBulat(r.harga_beli);
    nilaiBerisiko += nilai;
    const item = {
      batch_id: Number(r.batch_id),
      barang: { id: Number(r.barang_id), kode: r.kode, nama: r.nama, satuan: r.satuan },
      nomor_batch: r.nomor_batch,
      tanggal_kedaluwarsa: Jam.keTanggalWib(r.tanggal_kedaluwarsa),
      sisa_hari: r.sisa_hari,
      stok: r.stok,
      nilai,
    };
    if (r.sisa_hari < 0) {
      sudahKedaluwarsa.push(item);
    } else {
      mendekati.push(item);
    }
  }

  return {
    batas_hari: batasHari,
    tanggal: hariIni,
    mendekati,
    sudah_kedaluwarsa: sudahKedaluwarsa,
    ringkasan: {
      jumlah_batch_mendekati: mendekati.length,
      jumlah_batch_kedaluwarsa: sudahKedaluwarsa.length,
      nilai_berisiko: nilaiBerisiko,
    },
  };
}

export async function nearExpiredLayanan(apotekId: number, batasHari?: number) {
  return withApotek(apotekId, (client) => hitungNearExpiredDiClient(client, apotekId, batasHari));
}

export async function riwayatPemeriksaanNearExpiredLayanan(
  apotekId: number,
  query: z.infer<typeof skemaPaginasi>,
) {
  return withApotek(apotekId, async (client) => {
    const totalRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM pemeriksaan_near_expired`,
    );
    const total = Number(totalRes.rows[0]?.cnt ?? 0);
    const offset = (query.halaman - 1) * query.per_halaman;

    const rowsRes = await client.query<{
      id: string;
      tanggal: Date | string;
      jumlah_batch: number;
      jumlah_sudah_kedaluwarsa: number;
      status: string;
      terlambat: boolean;
      dibuat_pada: Date;
    }>(
      `SELECT id, tanggal, jumlah_batch, jumlah_sudah_kedaluwarsa, status, terlambat, dibuat_pada
       FROM pemeriksaan_near_expired
       ORDER BY tanggal DESC, id DESC
       LIMIT $1 OFFSET $2`,
      [query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map((r) => ({
        id: Number(r.id),
        tanggal: Jam.keTanggalWib(r.tanggal),
        jumlah_batch: r.jumlah_batch,
        jumlah_sudah_kedaluwarsa: r.jumlah_sudah_kedaluwarsa,
        status: r.status,
        terlambat: r.terlambat,
        dibuat_pada: Jam.keIsoWib(r.dibuat_pada),
      })),
      meta: { halaman: query.halaman, per_halaman: query.per_halaman, total },
    };
  });
}
