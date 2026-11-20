import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit, catatAuditGagal } from '../../lib/audit.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { hitungHashPermintaan } from '../../lib/idempotensi.js';
import { Jam } from '../../lib/jam.js';
import { buatNomorDokumen } from '../../lib/nomor.js';
import { keUangBulat } from '../../lib/uang.js';
import { skemaJumlah, skemaPaginasi, teksOpsional } from '../../lib/validasi.js';
import { ambilPetaAkun, buatJurnalDiClient } from '../akuntansi/layanan.js';

export const skemaBuatPengajuan = z
  .object({
    alasan: z.enum(['kedaluwarsa', 'rusak', 'retur_pbf']),
    pemasok_id: z.number().int().positive().nullable().optional(),
    lampiran_id: z.string().uuid().nullable().optional(),
    baris: z
      .array(
        z
          .object({
            batch_id: z.number().int().positive(),
            jumlah: skemaJumlah,
            keterangan: teksOpsional(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

export const skemaDaftarPengajuan = skemaPaginasi.extend({
  status: z.enum(['menunggu', 'disahkan', 'ditolak', 'dikembalikan']).optional(),
  alasan: z.enum(['kedaluwarsa', 'rusak', 'selisih_opname', 'retur_pbf']).optional(),
});

export const skemaPutuskanPengajuan = z
  .object({
    keputusan: z.enum(['setuju', 'tolak', 'kembalikan']),
    alasan: teksOpsional(500).optional(),
    baris: z
      .array(
        z
          .object({
            baris_id: z.number().int().positive(),
            jumlah_disetujui: z.number().int().min(0).max(1_000_000),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

async function formatPengajuanLengkap(client: import('pg').PoolClient, id: number) {
  const pRes = await client.query<{
    id: string;
    nomor: string;
    alasan: string;
    opname_id: string | null;
    pemasok_id: string | null;
    pemasok_nama: string | null;
    lampiran_id: string | null;
    status: string;
    diajukan_oleh: string;
    diajukan_nama: string;
    diajukan_pada: Date;
    diputuskan_oleh: string | null;
    diputuskan_nama: string | null;
    diputuskan_pada: Date | null;
    alasan_keputusan: string | null;
  }>(
    `SELECT pp.id, pp.nomor, pp.alasan, pp.opname_id, pp.pemasok_id, pm.nama AS pemasok_nama,
            pp.lampiran_id, pp.status, pp.diajukan_oleh, u1.nama_lengkap AS diajukan_nama,
            pp.diajukan_pada, pp.diputuskan_oleh, u2.nama_lengkap AS diputuskan_nama,
            pp.diputuskan_pada, pp.alasan_keputusan
     FROM pengajuan_pengurangan pp
     JOIN pengguna u1 ON u1.id = pp.diajukan_oleh
     LEFT JOIN pengguna u2 ON u2.id = pp.diputuskan_oleh
     LEFT JOIN pemasok pm ON pm.id = pp.pemasok_id
     WHERE pp.id = $1`,
    [id],
  );
  const p = pRes.rows[0];
  if (!p) throw new GalatAplikasi('TIDAK_DITEMUKAN');

  const bRes = await client.query<{
    id: string;
    batch_id: string;
    barang_id: string;
    kode: string;
    nama: string;
    satuan: string;
    nomor_batch: string;
    tanggal_kedaluwarsa: Date | string;
    stok_saat_ini: number;
    jumlah_diajukan: number;
    jumlah_disetujui: number | null;
    harga_beli_satuan: string;
    keterangan: string | null;
  }>(
    `SELECT bp.id, bp.batch_id, b.id AS barang_id, b.kode, b.nama, b.satuan,
            bb.nomor_batch, bb.tanggal_kedaluwarsa, bb.stok AS stok_saat_ini,
            bp.jumlah_diajukan, bp.jumlah_disetujui, bp.harga_beli_satuan, bp.keterangan
     FROM baris_pengajuan bp
     JOIN batch_barang bb ON bb.id = bp.batch_id
     JOIN barang b ON b.id = bb.barang_id
     WHERE bp.pengajuan_id = $1
     ORDER BY bp.id ASC`,
    [id],
  );

  return {
    id: Number(p.id),
    nomor: p.nomor,
    alasan: p.alasan,
    opname_id: p.opname_id ? Number(p.opname_id) : null,
    pemasok: p.pemasok_id ? { id: Number(p.pemasok_id), nama: p.pemasok_nama! } : null,
    lampiran_id: p.lampiran_id,
    status: p.status,
    diajukan_oleh: { id: Number(p.diajukan_oleh), nama_lengkap: p.diajukan_nama },
    diajukan_pada: Jam.keIsoWib(p.diajukan_pada),
    diputuskan_oleh: p.diputuskan_oleh
      ? { id: Number(p.diputuskan_oleh), nama_lengkap: p.diputuskan_nama! }
      : null,
    diputuskan_pada: p.diputuskan_pada ? Jam.keIsoWib(p.diputuskan_pada) : null,
    alasan_keputusan: p.alasan_keputusan,
    baris: bRes.rows.map((r) => ({
      id: Number(r.id),
      batch_id: Number(r.batch_id),
      barang: { id: Number(r.barang_id), kode: r.kode, nama: r.nama, satuan: r.satuan },
      nomor_batch: r.nomor_batch,
      tanggal_kedaluwarsa: Jam.keTanggalWib(r.tanggal_kedaluwarsa),
      stok_saat_ini: r.stok_saat_ini,
      jumlah_diajukan: r.jumlah_diajukan,
      jumlah_disetujui: r.jumlah_disetujui,
      harga_beli_satuan: keUangBulat(r.harga_beli_satuan),
      keterangan: r.keterangan,
    })),
  };
}

export async function buatPengajuanLayanan(
  pengguna: KonteksPengguna,
  kunciIdempoten: string,
  input: z.infer<typeof skemaBuatPengajuan>,
) {
  const seen = new Set<number>();
  for (const b of input.baris) {
    if (seen.has(b.batch_id)) {
      throw new GalatAplikasi('VALIDASI_GAGAL', {
        baris: [`batch_id ${b.batch_id} tidak boleh ganda.`],
      });
    }
    seen.add(b.batch_id);
  }

  if ((input.alasan === 'kedaluwarsa' || input.alasan === 'rusak') && !input.lampiran_id) {
    throw new GalatAplikasi('LAMPIRAN_WAJIB');
  }
  if (input.alasan === 'retur_pbf' && !input.pemasok_id) {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      pemasok_id: ['Pemasok wajib dipilih untuk retur ke PBF.'],
    });
  }

  const hashPermintaan = hitungHashPermintaan(input as unknown as Record<string, unknown>);
  const sekarang = Jam.sekarang();
  const hariIni = Jam.hariIniWib();

  try {
    return await withApotek(pengguna.apotekId, async (client) => {
      const cekIdemp = await client.query<{ id: string; hash_permintaan: string }>(
        `SELECT id, hash_permintaan FROM pengajuan_pengurangan WHERE kunci_idempoten = $1`,
        [kunciIdempoten],
      );
      if (cekIdemp.rows[0]) {
        if (cekIdemp.rows[0].hash_permintaan !== hashPermintaan) {
          throw new GalatAplikasi('KUNCI_IDEMPOTEN_BENTROK');
        }
        const data = await formatPengajuanLengkap(client, Number(cekIdemp.rows[0].id));
        return { replay: true, data };
      }

      if (input.lampiran_id) {
        const lamp = await client.query<{ jenis: string }>(
          `SELECT jenis FROM lampiran WHERE id = $1`,
          [input.lampiran_id],
        );
        if (!lamp.rows[0] || lamp.rows[0].jenis !== 'bukti_pengurangan') {
          throw new GalatAplikasi('LAMPIRAN_WAJIB');
        }
      }

      if (input.pemasok_id) {
        const pbf = await client.query<{ aktif: boolean }>(
          `SELECT aktif FROM pemasok WHERE id = $1`,
          [input.pemasok_id],
        );
        if (!pbf.rows[0]) throw new GalatAplikasi('TIDAK_DITEMUKAN', { pemasok_id: input.pemasok_id });
        if (!pbf.rows[0].aktif) {
          throw new GalatAplikasi('VALIDASI_GAGAL', { pemasok_id: ['Pemasok tidak aktif.'] });
        }
      }

      const detailBatch: Array<{
        batchId: number;
        jumlah: number;
        hargaBeli: number;
        keterangan: string | null;
      }> = [];

      for (let i = 0; i < input.baris.length; i++) {
        const b = input.baris[i]!;
        const bRes = await client.query<{
          stok: number;
          harga_beli: string;
          tanggal_kedaluwarsa: Date | string;
        }>(
          `SELECT stok, harga_beli, tanggal_kedaluwarsa FROM batch_barang WHERE id = $1`,
          [b.batch_id],
        );
        const batch = bRes.rows[0];
        if (!batch) throw new GalatAplikasi('TIDAK_DITEMUKAN', { batch_id: b.batch_id });

        if (b.jumlah > batch.stok) {
          throw new GalatAplikasi('JUMLAH_MELEBIHI_STOK', { indeks: i, stok: batch.stok });
        }

        if (input.alasan === 'kedaluwarsa') {
          const tglExp = Jam.keTanggalWib(batch.tanggal_kedaluwarsa);
          if (tglExp >= hariIni) {
            throw new GalatAplikasi('ALASAN_TIDAK_SESUAI', { indeks: i });
          }
        }

        detailBatch.push({
          batchId: b.batch_id,
          jumlah: b.jumlah,
          hargaBeli: keUangBulat(batch.harga_beli),
          keterangan: b.keterangan ?? null,
        });
      }

      const nomor = await buatNomorDokumen(client, pengguna.apotekId, 'PP', hariIni);
      const waktuIso = sekarang.toISO()!;
      const ppRes = await client.query<{ id: string }>(
        `INSERT INTO pengajuan_pengurangan
          (apotek_id, nomor, kunci_idempoten, hash_permintaan, alasan, pemasok_id, lampiran_id,
           status, diajukan_oleh, diajukan_pada)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'menunggu', $8, $9)
         RETURNING id`,
        [
          pengguna.apotekId,
          nomor,
          kunciIdempoten,
          hashPermintaan,
          input.alasan,
          input.pemasok_id ?? null,
          input.lampiran_id ?? null,
          pengguna.id,
          waktuIso,
        ],
      );
      const pengajuanId = Number(ppRes.rows[0]!.id);

      for (const db of detailBatch) {
        await client.query(
          `INSERT INTO baris_pengajuan
            (apotek_id, pengajuan_id, batch_id, jumlah_diajukan, harga_beli_satuan, keterangan)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pengguna.apotekId, pengajuanId, db.batchId, db.jumlah, db.hargaBeli, db.keterangan],
        );
      }

      const apaRes = await client.query<{ id: string }>(
        `SELECT id FROM pengguna WHERE apotek_id = $1 AND peran = 'apa' AND aktif = true`,
        [pengguna.apotekId],
      );
      for (const apa of apaRes.rows) {
        await client.query(
          `INSERT INTO notifikasi
            (apotek_id, penerima_id, jenis, judul, isi, tautan_tipe, tautan_id, dibuat_pada)
           VALUES ($1, $2, 'pengajuan_menunggu', 'Pengajuan pengurangan stok', $3, 'pengajuan', $4, $5)`,
          [
            pengguna.apotekId,
            apa.id,
            `Pengajuan ${nomor} (${input.alasan}) menunggu pengesahan.`,
            String(pengajuanId),
            waktuIso,
          ],
        );
      }

      await catatAudit(client, {
        apotekId: pengguna.apotekId,
        penggunaId: pengguna.id,
        aksi: 'pengajuan.buat',
        entitas: 'pengajuan_pengurangan',
        entitasId: pengajuanId,
        hasil: 'berhasil',
        detail: { nomor, alasan: input.alasan },
      });

      const data = await formatPengajuanLengkap(client, pengajuanId);
      return { replay: false, data };
    });
  } catch (err) {
    if (err instanceof GalatAplikasi && err.kode === 'DUPLIKAT') {
      const cek = await withApotek(pengguna.apotekId, async (client) => {
        const r = await client.query<{ id: string; hash_permintaan: string }>(
          `SELECT id, hash_permintaan FROM pengajuan_pengurangan WHERE kunci_idempoten = $1`,
          [kunciIdempoten],
        );
        if (!r.rows[0]) return null;
        if (r.rows[0].hash_permintaan !== hashPermintaan) {
          throw new GalatAplikasi('KUNCI_IDEMPOTEN_BENTROK');
        }
        return formatPengajuanLengkap(client, Number(r.rows[0].id));
      });
      if (cek) return { replay: true, data: cek };
    }

    const kodeGalat = err instanceof GalatAplikasi ? err.kode : 'GALAT_INTERNAL';
    await catatAuditGagal({
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'pengajuan.buat',
      entitas: 'pengajuan_pengurangan',
      kodeGalat,
    });
    throw err;
  }
}

export async function daftarPengajuanLayanan(
  pengguna: KonteksPengguna,
  query: z.infer<typeof skemaDaftarPengajuan>,
) {
  return withApotek(pengguna.apotekId, async (client) => {
    const kondisi: string[] = [];
    const params: unknown[] = [];

    if (pengguna.peran === 'staf_gudang') {
      params.push(pengguna.id);
      kondisi.push(`pp.diajukan_oleh = $${params.length}`);
    }
    if (query.status) {
      params.push(query.status);
      kondisi.push(`pp.status = $${params.length}`);
    }
    if (query.alasan) {
      params.push(query.alasan);
      kondisi.push(`pp.alasan = $${params.length}`);
    }

    const whereSql = kondisi.length > 0 ? `WHERE ${kondisi.join(' AND ')}` : '';
    const totalRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM pengajuan_pengurangan pp ${whereSql}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.cnt ?? 0);

    const offset = (query.halaman - 1) * query.per_halaman;
    const rowsRes = await client.query<{
      id: string;
      nomor: string;
      alasan: string;
      status: string;
      diajukan_oleh: string;
      diajukan_nama: string;
      diajukan_pada: Date;
      jumlah_baris: string;
      nilai_total: string;
    }>(
      `SELECT pp.id, pp.nomor, pp.alasan, pp.status, pp.diajukan_oleh, u.nama_lengkap AS diajukan_nama,
              pp.diajukan_pada, count(bp.id) AS jumlah_baris,
              COALESCE(SUM(bp.jumlah_diajukan * bp.harga_beli_satuan), 0) AS nilai_total
       FROM pengajuan_pengurangan pp
       JOIN pengguna u ON u.id = pp.diajukan_oleh
       LEFT JOIN baris_pengajuan bp ON bp.pengajuan_id = pp.id
       ${whereSql}
       GROUP BY pp.id, u.nama_lengkap
       ORDER BY pp.diajukan_pada DESC, pp.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map((r) => ({
        id: Number(r.id),
        nomor: r.nomor,
        alasan: r.alasan,
        status: r.status,
        diajukan_oleh: { id: Number(r.diajukan_oleh), nama_lengkap: r.diajukan_nama },
        diajukan_pada: Jam.keIsoWib(r.diajukan_pada),
        jumlah_baris: Number(r.jumlah_baris),
        nilai_total: keUangBulat(r.nilai_total),
      })),
      meta: { halaman: query.halaman, per_halaman: query.per_halaman, total },
    };
  });
}

export async function ambilPengajuanLayanan(pengguna: KonteksPengguna, id: number) {
  return withApotek(pengguna.apotekId, async (client) => {
    const cek = await client.query<{ diajukan_oleh: string }>(
      `SELECT diajukan_oleh FROM pengajuan_pengurangan WHERE id = $1`,
      [id],
    );
    const row = cek.rows[0];
    if (!row) throw new GalatAplikasi('TIDAK_DITEMUKAN');
    if (pengguna.peran === 'staf_gudang' && Number(row.diajukan_oleh) !== pengguna.id) {
      throw new GalatAplikasi('TIDAK_DITEMUKAN');
    }
    return formatPengajuanLengkap(client, id);
  });
}

export async function putuskanPengajuanLayanan(
  pengguna: KonteksPengguna,
  id: number,
  input: z.infer<typeof skemaPutuskanPengajuan>,
) {
  const sekarang = Jam.sekarang();
  const hariIni = Jam.hariIniWib();
  const waktuIso = sekarang.toISO()!;

  try {
    return await withApotek(pengguna.apotekId, async (client) => {
      const ppRes = await client.query<{
        id: string;
        nomor: string;
        alasan: 'kedaluwarsa' | 'rusak' | 'selisih_opname' | 'retur_pbf';
        status: string;
        diajukan_oleh: string;
      }>(
        `SELECT id, nomor, alasan, status, diajukan_oleh
         FROM pengajuan_pengurangan WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const pp = ppRes.rows[0];
      if (!pp) throw new GalatAplikasi('TIDAK_DITEMUKAN');

      if (pp.status !== 'menunggu') {
        throw new GalatAplikasi('STATUS_TIDAK_VALID');
      }
      if (Number(pp.diajukan_oleh) === pengguna.id) {
        throw new GalatAplikasi('PENGESAH_SAMA_DENGAN_PENGAJU');
      }

      if (input.keputusan === 'tolak' || input.keputusan === 'kembalikan') {
        if (!input.alasan || input.alasan.trim().length < 5) {
          throw new GalatAplikasi('VALIDASI_GAGAL', {
            alasan: ['Alasan wajib diisi minimal 5 karakter.'],
          });
        }
        const statusBaru = input.keputusan === 'tolak' ? 'ditolak' : 'dikembalikan';
        await client.query(
          `UPDATE pengajuan_pengurangan
           SET status = $1, diputuskan_oleh = $2, diputuskan_pada = $3, alasan_keputusan = $4
           WHERE id = $5`,
          [statusBaru, pengguna.id, waktuIso, input.alasan.trim(), id],
        );

        await client.query(
          `INSERT INTO notifikasi
            (apotek_id, penerima_id, jenis, judul, isi, tautan_tipe, tautan_id, dibuat_pada)
           VALUES ($1, $2, 'pengajuan_diputuskan', 'Keputusan pengajuan pengurangan', $3, 'pengajuan', $4, $5)`,
          [
            pengguna.apotekId,
            pp.diajukan_oleh,
            `Pengajuan ${pp.nomor} ${statusBaru}: ${input.alasan.trim()}`,
            String(id),
            waktuIso,
          ],
        );

        await catatAudit(client, {
          apotekId: pengguna.apotekId,
          penggunaId: pengguna.id,
          aksi: `pengajuan.${input.keputusan}`,
          entitas: 'pengajuan_pengurangan',
          entitasId: id,
          hasil: 'berhasil',
          detail: { status: statusBaru },
        });

        return formatPengajuanLengkap(client, id);
      }

      // keputusan === 'setuju'
      const bpRes = await client.query<{
        id: string;
        batch_id: string;
        jumlah_diajukan: number;
        harga_beli_satuan: string;
      }>(
        `SELECT id, batch_id, jumlah_diajukan, harga_beli_satuan
         FROM baris_pengajuan WHERE pengajuan_id = $1 ORDER BY id ASC FOR UPDATE`,
        [id],
      );

      const petaPersetujuan = new Map<number, number>();
      if (!input.baris) {
        for (const bp of bpRes.rows) {
          petaPersetujuan.set(Number(bp.id), bp.jumlah_diajukan);
        }
      } else {
        if (input.baris.length !== bpRes.rows.length) {
          throw new GalatAplikasi('VALIDASI_GAGAL', {
            baris: ['Daftar baris harus mencakup semua baris pengajuan.'],
          });
        }
        const bpMap = new Map(bpRes.rows.map((bp) => [Number(bp.id), bp.jumlah_diajukan]));
        let adaLebihDariNol = false;
        let adaLebihKecil = false;
        for (const item of input.baris) {
          const diajukan = bpMap.get(item.baris_id);
          if (diajukan === undefined) {
            throw new GalatAplikasi('VALIDASI_GAGAL', {
              baris: [`baris_id ${item.baris_id} tidak ditemukan pada pengajuan ini.`],
            });
          }
          if (item.jumlah_disetujui < 0 || item.jumlah_disetujui > diajukan) {
            throw new GalatAplikasi('VALIDASI_GAGAL', {
              baris: [`jumlah_disetujui untuk baris ${item.baris_id} tidak valid.`],
            });
          }
          if (item.jumlah_disetujui > 0) adaLebihDariNol = true;
          if (item.jumlah_disetujui < diajukan) adaLebihKecil = true;
          petaPersetujuan.set(item.baris_id, item.jumlah_disetujui);
        }
        if (!adaLebihDariNol) {
          throw new GalatAplikasi('VALIDASI_GAGAL', {
            baris: ['Minimal satu baris harus disetujui lebih dari 0.'],
          });
        }
        if (adaLebihKecil && (!input.alasan || input.alasan.trim().length === 0)) {
          throw new GalatAplikasi('KETERANGAN_WAJIB');
        }
      }

      // Kunci batch_barang terkait dan periksa stok
      const batchIds = bpRes.rows.map((r) => Number(r.batch_id)).sort((a, b) => a - b);
      const batchRes = await client.query<{ id: string; barang_id: string; stok: number }>(
        `SELECT id, barang_id, stok FROM batch_barang WHERE id = ANY($1::bigint[]) ORDER BY id ASC FOR UPDATE`,
        [batchIds],
      );
      const petaBatch = new Map(
        batchRes.rows.map((b) => [Number(b.id), { barangId: Number(b.barang_id), stok: b.stok }]),
      );

      const stokBerubah: Array<{ baris_id: number; stok_sekarang: number }> = [];
      for (const bp of bpRes.rows) {
        const jmlSetuju = petaPersetujuan.get(Number(bp.id))!;
        const stokSekarang = petaBatch.get(Number(bp.batch_id))!.stok;
        if (stokSekarang < jmlSetuju) {
          stokBerubah.push({ baris_id: Number(bp.id), stok_sekarang: stokSekarang });
        }
      }
      if (stokBerubah.length > 0) {
        throw new GalatAplikasi('STOK_BERUBAH', { baris: stokBerubah });
      }

      // Lolos -> kurangi stok, mutasi_stok, baris_pengajuan.jumlah_disetujui, jurnal otomatis (8.3)
      let nilaiTotal = 0;
      for (const bp of bpRes.rows) {
        const bpId = Number(bp.id);
        const batchId = Number(bp.batch_id);
        const jmlSetuju = petaPersetujuan.get(bpId)!;
        const hargaBeli = keUangBulat(bp.harga_beli_satuan);
        const barangId = petaBatch.get(batchId)!.barangId;

        await client.query(`UPDATE baris_pengajuan SET jumlah_disetujui = $1 WHERE id = $2`, [
          jmlSetuju,
          bpId,
        ]);

        if (jmlSetuju > 0) {
          nilaiTotal += jmlSetuju * hargaBeli;
          await client.query(`UPDATE batch_barang SET stok = stok - $1 WHERE id = $2`, [
            jmlSetuju,
            batchId,
          ]);
          await client.query(
            `INSERT INTO mutasi_stok
              (apotek_id, batch_id, barang_id, jenis, jumlah, waktu, sumber_tipe, sumber_id)
             VALUES ($1, $2, $3, 'pengurangan', $4, $5, 'pengajuan', $6)`,
            [pengguna.apotekId, batchId, barangId, -jmlSetuju, waktuIso, id],
          );
        }
      }

      if (nilaiTotal > 0) {
        const petaAkun = await ambilPetaAkun(client);
        const akunDebitKode =
          pp.alasan === 'kedaluwarsa'
            ? '5130'
            : pp.alasan === 'retur_pbf'
              ? '2110'
              : '5120';
        await buatJurnalDiClient(client, {
          apotekId: pengguna.apotekId,
          tanggal: hariIni,
          jenis: 'pengurangan',
          keterangan: `Pengurangan ${pp.nomor} (${pp.alasan})`,
          sumberTipe: 'pengajuan',
          sumberId: id,
          dibuatOleh: pengguna.id,
          baris: [
            { akunId: petaAkun.get(akunDebitKode)!.id, debit: nilaiTotal, kredit: 0 },
            { akunId: petaAkun.get('1140')!.id, debit: 0, kredit: nilaiTotal },
          ],
        });
      }

      await client.query(
        `UPDATE pengajuan_pengurangan
         SET status = 'disahkan', diputuskan_oleh = $1, diputuskan_pada = $2, alasan_keputusan = $3
         WHERE id = $4`,
        [pengguna.id, waktuIso, input.alasan?.trim() ?? null, id],
      );

      await client.query(
        `INSERT INTO notifikasi
          (apotek_id, penerima_id, jenis, judul, isi, tautan_tipe, tautan_id, dibuat_pada)
         VALUES ($1, $2, 'pengajuan_diputuskan', 'Pengajuan pengurangan disahkan', $3, 'pengajuan', $4, $5)`,
        [
          pengguna.apotekId,
          pp.diajukan_oleh,
          `Pengajuan ${pp.nomor} telah disahkan.`,
          String(id),
          waktuIso,
        ],
      );

      await catatAudit(client, {
        apotekId: pengguna.apotekId,
        penggunaId: pengguna.id,
        aksi: 'pengajuan.setuju',
        entitas: 'pengajuan_pengurangan',
        entitasId: id,
        hasil: 'berhasil',
        detail: { nilai_total: nilaiTotal },
      });

      return formatPengajuanLengkap(client, id);
    });
  } catch (err) {
    const kodeGalat = err instanceof GalatAplikasi ? err.kode : 'GALAT_INTERNAL';
    await catatAuditGagal({
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: `pengajuan.${input.keputusan}`,
      entitas: 'pengajuan_pengurangan',
      entitasId: id,
      kodeGalat,
    });
    throw err;
  }
}
