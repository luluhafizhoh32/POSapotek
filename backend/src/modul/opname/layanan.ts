import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit, catatAuditGagal } from '../../lib/audit.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { hitungHashPermintaan } from '../../lib/idempotensi.js';
import { Jam } from '../../lib/jam.js';
import { buatNomorDokumen } from '../../lib/nomor.js';
import { keUangBulat } from '../../lib/uang.js';
import { skemaPaginasi, teksOpsional } from '../../lib/validasi.js';

export const skemaSimpanOpname = z
  .object({
    baris: z
      .array(
        z
          .object({
            batch_id: z.number().int().positive(),
            stok_fisik: z.number().int().min(0).max(1_000_000),
            keterangan: teksOpsional(500).optional(),
          })
          .strict(),
      )
      .min(1),
    catatan: teksOpsional(500).optional(),
    waktu_perangkat: z.string().trim().optional().nullable(),
  })
  .strict();

export const skemaTinjauOpname = z
  .object({
    baris: z
      .array(
        z
          .object({
            batch_id: z.number().int().positive(),
            stok_fisik: z.number().int().min(0).max(1_000_000),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export async function tinjauOpnameLayanan(
  apotekId: number,
  input: z.infer<typeof skemaTinjauOpname>,
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

  return withApotek(apotekId, async (client) => {
    const batchAktifRes = await client.query<{ id: string }>(
      `SELECT id FROM batch_barang WHERE stok > 0 ORDER BY id ASC`,
    );
    if (batchAktifRes.rows.length === 0) {
      throw new GalatAplikasi('TIDAK_ADA_BATCH');
    }

    const petaInput = new Map(input.baris.map((b) => [b.batch_id, b.stok_fisik]));
    const belumDihitung: number[] = [];
    for (const b of batchAktifRes.rows) {
      const bId = Number(b.id);
      if (!petaInput.has(bId)) {
        belumDihitung.push(bId);
      }
    }
    if (belumDihitung.length > 0) {
      throw new GalatAplikasi('BATCH_BELUM_DIHITUNG', { batch_id: belumDihitung });
    }

    const semuaInputIds = input.baris.map((b) => b.batch_id);
    const detailRes = await client.query<{
      batch_id: string;
      nomor_batch: string;
      tanggal_kedaluwarsa: Date | string;
      stok: number;
      harga_beli: string;
      barang_id: string;
      kode: string;
      nama: string;
      satuan: string;
    }>(
      `SELECT bb.id AS batch_id, bb.nomor_batch, bb.tanggal_kedaluwarsa,
              bb.stok, bb.harga_beli,
              b.id AS barang_id, b.kode, b.nama, b.satuan
       FROM batch_barang bb
       JOIN barang b ON b.id = bb.barang_id
       WHERE bb.id = ANY($1::bigint[])
       ORDER BY b.nama ASC, bb.tanggal_kedaluwarsa ASC, bb.id ASC`,
      [semuaInputIds],
    );
    if (detailRes.rows.length !== semuaInputIds.length) {
      throw new GalatAplikasi('TIDAK_DITEMUKAN');
    }

    let jumlahSama = 0;
    let jumlahKurang = 0;
    let jumlahLebih = 0;
    let nilaiKurang = 0;
    let nilaiLebih = 0;

    const baris = detailRes.rows.map((r) => {
      const batchId = Number(r.batch_id);
      const stokFisik = petaInput.get(batchId)!;
      const stokSistem = r.stok;
      const selisih = stokFisik - stokSistem;
      const hargaBeli = keUangBulat(r.harga_beli);
      const nilaiSelisih = selisih * hargaBeli;

      if (selisih === 0) jumlahSama++;
      else if (selisih < 0) {
        jumlahKurang++;
        nilaiKurang += Math.abs(nilaiSelisih);
      } else {
        jumlahLebih++;
        nilaiLebih += nilaiSelisih;
      }

      return {
        batch_id: batchId,
        nomor_batch: r.nomor_batch,
        tanggal_kedaluwarsa: Jam.keTanggalWib(r.tanggal_kedaluwarsa),
        barang: {
          id: Number(r.barang_id),
          kode: r.kode,
          nama: r.nama,
          satuan: r.satuan,
        },
        stok_sistem: stokSistem,
        stok_fisik: stokFisik,
        selisih,
        nilai_selisih: nilaiSelisih,
      };
    });

    return {
      ringkasan: {
        jumlah_batch: baris.length,
        jumlah_sama: jumlahSama,
        jumlah_selisih_kurang: jumlahKurang,
        jumlah_selisih_lebih: jumlahLebih,
        nilai_selisih_kurang: nilaiKurang,
        nilai_selisih_lebih: nilaiLebih,
      },
      baris,
    };
  });
}

export async function daftarBatchOpnameLayanan(apotekId: number) {
  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      batch_id: string;
      barang_id: string;
      kode: string;
      nama: string;
      satuan: string;
      nomor_batch: string;
      tanggal_kedaluwarsa: Date | string;
    }>(
      `SELECT bb.id AS batch_id, b.id AS barang_id, b.kode, b.nama, b.satuan,
              bb.nomor_batch, bb.tanggal_kedaluwarsa
       FROM batch_barang bb
       JOIN barang b ON b.id = bb.barang_id
       WHERE bb.stok > 0
       ORDER BY b.nama ASC, bb.tanggal_kedaluwarsa ASC, bb.id ASC`,
    );

    // DILARANG menyertakan stok sistem!
    return res.rows.map((r) => ({
      batch_id: Number(r.batch_id),
      barang: {
        id: Number(r.barang_id),
        kode: r.kode,
        nama: r.nama,
        satuan: r.satuan,
      },
      nomor_batch: r.nomor_batch,
      tanggal_kedaluwarsa: Jam.keTanggalWib(r.tanggal_kedaluwarsa),
    }));
  });
}

async function formatOpnameLengkap(client: import('pg').PoolClient, opnameId: number) {
  const opRes = await client.query<{
    id: string;
    nomor: string;
    waktu: Date;
    catatan: string | null;
    dibuat_oleh: string;
  }>(`SELECT id, nomor, waktu, catatan, dibuat_oleh FROM opname WHERE id = $1`, [opnameId]);
  const op = opRes.rows[0];
  if (!op) throw new GalatAplikasi('TIDAK_DITEMUKAN');

  const barisRes = await client.query<{
    id: string;
    batch_id: string;
    nomor_batch: string;
    barang_id: string;
    kode: string;
    nama: string;
    satuan: string;
    stok_sistem: number;
    stok_fisik: number;
    selisih: number;
    nilai_selisih: string;
    keterangan: string | null;
  }>(
    `SELECT bo.id, bo.batch_id, bb.nomor_batch, b.id AS barang_id, b.kode, b.nama, b.satuan,
            bo.stok_sistem, bo.stok_fisik, bo.selisih, bo.nilai_selisih, bo.keterangan
     FROM baris_opname bo
     JOIN batch_barang bb ON bb.id = bo.batch_id
     JOIN barang b ON b.id = bb.barang_id
     WHERE bo.opname_id = $1
     ORDER BY bo.id ASC`,
    [opnameId],
  );

  let jumlahSama = 0;
  let jumlahKurang = 0;
  let jumlahLebih = 0;
  let nilaiKurang = 0;

  const baris = barisRes.rows.map((r) => {
    const nilai = keUangBulat(r.nilai_selisih);
    if (r.selisih === 0) jumlahSama++;
    else if (r.selisih < 0) {
      jumlahKurang++;
      nilaiKurang += Math.abs(nilai);
    } else {
      jumlahLebih++;
    }
    return {
      id: Number(r.id),
      batch_id: Number(r.batch_id),
      nomor_batch: r.nomor_batch,
      barang: { id: Number(r.barang_id), kode: r.kode, nama: r.nama, satuan: r.satuan },
      stok_sistem: r.stok_sistem,
      stok_fisik: r.stok_fisik,
      selisih: r.selisih,
      nilai_selisih: nilai,
      keterangan: r.keterangan,
    };
  });

  const pengRes = await client.query<{ id: string; nomor: string; status: string }>(
    `SELECT id, nomor, status FROM pengajuan_pengurangan WHERE opname_id = $1`,
    [opnameId],
  );
  const peng = pengRes.rows[0]
    ? { id: Number(pengRes.rows[0].id), nomor: pengRes.rows[0].nomor, status: pengRes.rows[0].status }
    : null;

  return {
    id: Number(op.id),
    nomor: op.nomor,
    waktu: Jam.keIsoWib(op.waktu),
    catatan: op.catatan,
    dibuat_oleh: Number(op.dibuat_oleh),
    ringkasan: {
      jumlah_batch: baris.length,
      jumlah_sama: jumlahSama,
      jumlah_selisih_kurang: jumlahKurang,
      jumlah_selisih_lebih: jumlahLebih,
      nilai_selisih_kurang: nilaiKurang,
    },
    baris,
    pengajuan: peng,
  };
}

export async function simpanOpnameLayanan(
  pengguna: KonteksPengguna,
  kunciIdempoten: string,
  input: z.infer<typeof skemaSimpanOpname>,
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

  const hashPermintaan = hitungHashPermintaan(input as unknown as Record<string, unknown>);
  const sekarang = Jam.sekarang();
  const hariIni = Jam.hariIniWib();

  try {
    return await withApotek(pengguna.apotekId, async (client) => {
      const cekIdemp = await client.query<{ id: string; hash_permintaan: string }>(
        `SELECT id, hash_permintaan FROM opname WHERE kunci_idempoten = $1`,
        [kunciIdempoten],
      );
      if (cekIdemp.rows[0]) {
        if (cekIdemp.rows[0].hash_permintaan !== hashPermintaan) {
          throw new GalatAplikasi('KUNCI_IDEMPOTEN_BENTROK');
        }
        const data = await formatOpnameLengkap(client, Number(cekIdemp.rows[0].id));
        return { replay: true, data };
      }

      // Kunci semua batch berstok > 0
      const batchRes = await client.query<{
        id: string;
        stok: number;
        harga_beli: string;
      }>(
        `SELECT id, stok, harga_beli FROM batch_barang WHERE stok > 0 ORDER BY id ASC FOR UPDATE`,
      );
      if (batchRes.rows.length === 0) {
        throw new GalatAplikasi('TIDAK_ADA_BATCH');
      }

      const petaInput = new Map(input.baris.map((b) => [b.batch_id, b]));
      const belumDihitung: number[] = [];
      for (const b of batchRes.rows) {
        const bId = Number(b.id);
        if (!petaInput.has(bId)) {
          belumDihitung.push(bId);
        }
      }
      if (belumDihitung.length > 0) {
        throw new GalatAplikasi('BATCH_BELUM_DIHITUNG', { batch_id: belumDihitung });
      }

      // Pastikan semua batch_id di input milik apotek ini
      const semuaInputIds = input.baris.map((b) => b.batch_id);
      const cekMilik = await client.query<{ id: string; stok: number; harga_beli: string }>(
        `SELECT id, stok, harga_beli FROM batch_barang WHERE id = ANY($1::bigint[]) FOR UPDATE`,
        [semuaInputIds],
      );
      if (cekMilik.rows.length !== semuaInputIds.length) {
        throw new GalatAplikasi('TIDAK_DITEMUKAN');
      }
      const petaBatch = new Map(
        cekMilik.rows.map((r) => [
          Number(r.id),
          { stok: r.stok, hargaBeli: keUangBulat(r.harga_beli) },
        ]),
      );

      // Cek keterangan wajib untuk selisih lebih
      const selisihLebihTanpaKet: number[] = [];
      const barisKurang: Array<{ batchId: number; jumlahKurang: number; hargaBeli: number; keterangan: string | null }> = [];

      for (const item of input.baris) {
        const info = petaBatch.get(item.batch_id)!;
        const selisih = item.stok_fisik - info.stok;
        if (selisih > 0 && (!item.keterangan || item.keterangan.trim().length === 0)) {
          selisihLebihTanpaKet.push(item.batch_id);
        }
        if (selisih < 0) {
          barisKurang.push({
            batchId: item.batch_id,
            jumlahKurang: -selisih,
            hargaBeli: info.hargaBeli,
            keterangan: item.keterangan ?? null,
          });
        }
      }

      if (selisihLebihTanpaKet.length > 0) {
        throw new GalatAplikasi('KETERANGAN_WAJIB', { batch_id: selisihLebihTanpaKet });
      }

      const nomorOp = await buatNomorDokumen(client, pengguna.apotekId, 'OP', hariIni);
      const waktuIso = sekarang.toISO()!;
      const opRes = await client.query<{ id: string }>(
        `INSERT INTO opname
          (apotek_id, nomor, kunci_idempoten, hash_permintaan, waktu, waktu_perangkat, dibuat_oleh, catatan)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          pengguna.apotekId,
          nomorOp,
          kunciIdempoten,
          hashPermintaan,
          waktuIso,
          input.waktu_perangkat ?? null,
          pengguna.id,
          input.catatan ?? null,
        ],
      );
      const opnameId = Number(opRes.rows[0]!.id);

      for (const item of input.baris) {
        const info = petaBatch.get(item.batch_id)!;
        const selisih = item.stok_fisik - info.stok;
        const nilaiSelisih = selisih * info.hargaBeli;
        await client.query(
          `INSERT INTO baris_opname
            (apotek_id, opname_id, batch_id, stok_sistem, stok_fisik, nilai_selisih, keterangan)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            pengguna.apotekId,
            opnameId,
            item.batch_id,
            info.stok,
            item.stok_fisik,
            nilaiSelisih,
            item.keterangan ?? null,
          ],
        );
      }

      // Bila ada selisih kurang -> buat 1 pengajuan_pengurangan otomatis + notifikasi ke semua APA aktif
      if (barisKurang.length > 0) {
        const nomorPp = await buatNomorDokumen(client, pengguna.apotekId, 'PP', hariIni);
        const ppRes = await client.query<{ id: string }>(
          `INSERT INTO pengajuan_pengurangan
            (apotek_id, nomor, alasan, opname_id, status, diajukan_oleh, diajukan_pada)
           VALUES ($1, $2, 'selisih_opname', $3, 'menunggu', $4, $5)
           RETURNING id`,
          [pengguna.apotekId, nomorPp, opnameId, pengguna.id, waktuIso],
        );
        const pengajuanId = Number(ppRes.rows[0]!.id);

        for (const bk of barisKurang) {
          await client.query(
            `INSERT INTO baris_pengajuan
              (apotek_id, pengajuan_id, batch_id, jumlah_diajukan, harga_beli_satuan, keterangan)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [pengguna.apotekId, pengajuanId, bk.batchId, bk.jumlahKurang, bk.hargaBeli, bk.keterangan],
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
              `Pengajuan ${nomorPp} dari opname ${nomorOp} menunggu pengesahan.`,
              String(pengajuanId),
              waktuIso,
            ],
          );
        }
      }

      await catatAudit(client, {
        apotekId: pengguna.apotekId,
        penggunaId: pengguna.id,
        aksi: 'opname.simpan',
        entitas: 'opname',
        entitasId: opnameId,
        hasil: 'berhasil',
        detail: { nomor: nomorOp, jumlah_selisih_kurang: barisKurang.length },
      });

      const data = await formatOpnameLengkap(client, opnameId);
      return { replay: false, data };
    });
  } catch (err) {
    if (err instanceof GalatAplikasi && err.kode === 'DUPLIKAT') {
      const cek = await withApotek(pengguna.apotekId, async (client) => {
        const r = await client.query<{ id: string; hash_permintaan: string }>(
          `SELECT id, hash_permintaan FROM opname WHERE kunci_idempoten = $1`,
          [kunciIdempoten],
        );
        if (!r.rows[0]) return null;
        if (r.rows[0].hash_permintaan !== hashPermintaan) {
          throw new GalatAplikasi('KUNCI_IDEMPOTEN_BENTROK');
        }
        return formatOpnameLengkap(client, Number(r.rows[0].id));
      });
      if (cek) return { replay: true, data: cek };
    }

    const kodeGalat = err instanceof GalatAplikasi ? err.kode : 'GALAT_INTERNAL';
    await catatAuditGagal({
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'opname.simpan',
      entitas: 'opname',
      kodeGalat,
    });
    throw err;
  }
}

export async function daftarOpnameLayanan(
  apotekId: number,
  query: z.infer<typeof skemaPaginasi>,
) {
  return withApotek(apotekId, async (client) => {
    const totalRes = await client.query<{ cnt: string }>(`SELECT count(*) AS cnt FROM opname`);
    const total = Number(totalRes.rows[0]?.cnt ?? 0);
    const offset = (query.halaman - 1) * query.per_halaman;

    const rowsRes = await client.query<{
      id: string;
      nomor: string;
      waktu: Date;
      catatan: string | null;
      dibuat_oleh_nama: string;
      jumlah_batch: string;
    }>(
      `SELECT o.id, o.nomor, o.waktu, o.catatan, u.nama_lengkap AS dibuat_oleh_nama,
              count(bo.id) AS jumlah_batch
       FROM opname o
       JOIN pengguna u ON u.id = o.dibuat_oleh
       LEFT JOIN baris_opname bo ON bo.opname_id = o.id
       GROUP BY o.id, u.nama_lengkap
       ORDER BY o.waktu DESC, o.id DESC
       LIMIT $1 OFFSET $2`,
      [query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map((r) => ({
        id: Number(r.id),
        nomor: r.nomor,
        waktu: Jam.keIsoWib(r.waktu),
        catatan: r.catatan,
        dibuat_oleh_nama: r.dibuat_oleh_nama,
        jumlah_batch: Number(r.jumlah_batch),
      })),
      meta: { halaman: query.halaman, per_halaman: query.per_halaman, total },
    };
  });
}

export async function ambilOpnameLayanan(apotekId: number, id: number) {
  return withApotek(apotekId, (client) => formatOpnameLengkap(client, id));
}
