import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit, catatAuditGagal } from '../../lib/audit.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { hitungHashPermintaan } from '../../lib/idempotensi.js';
import { Jam } from '../../lib/jam.js';
import { buatNomorDokumen } from '../../lib/nomor.js';
import { keUangBulat } from '../../lib/uang.js';
import {
  skemaJumlah,
  skemaPaginasi,
  skemaTanggal,
  skemaUang,
  teksWajib,
} from '../../lib/validasi.js';
import { ambilPetaAkun, buatJurnalDiClient } from '../akuntansi/layanan.js';

export function normalisasiNomorFaktur(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

export const skemaCekFaktur = z.object({
  pemasok_id: z.coerce.number().int().positive(),
  nomor_faktur: teksWajib(1, 100),
});

export const skemaPeriksaBaris = z
  .object({
    barang_id: z.number().int().positive(),
    nomor_batch: teksWajib(1, 60),
    tanggal_kedaluwarsa: skemaTanggal,
    harga_beli: skemaUang,
  })
  .strict();

export const skemaSimpanPenerimaan = z
  .object({
    pemasok_id: z.number().int().positive(),
    nomor_faktur: teksWajib(1, 100),
    tanggal_faktur: skemaTanggal,
    lampiran_id: z.string().uuid(),
    waktu_perangkat: z.string().trim().optional().nullable(),
    baris: z
      .array(
        z
          .object({
            barang_id: z.number().int().positive(),
            nomor_batch: teksWajib(1, 60),
            tanggal_kedaluwarsa: skemaTanggal,
            jumlah: skemaJumlah,
            harga_beli: skemaUang,
            gabung_ke_batch_ada: z.boolean().default(false),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

export const skemaDaftarPenerimaan = skemaPaginasi.extend({
  pemasok_id: z.coerce.number().int().positive().optional(),
  tanggal_dari: skemaTanggal.optional(),
  tanggal_sampai: skemaTanggal.optional(),
});

export async function cekFakturLayanan(
  apotekId: number,
  pemasokId: number,
  nomorFakturRaw: string,
) {
  const nomorFaktur = normalisasiNomorFaktur(nomorFakturRaw);
  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      id: string;
      nomor: string;
      tanggal_faktur: Date | string;
      waktu: Date;
    }>(
      `SELECT id, nomor, tanggal_faktur, waktu
       FROM penerimaan_barang
       WHERE pemasok_id = $1 AND nomor_faktur = $2`,
      [pemasokId, nomorFaktur],
    );
    const r = res.rows[0];
    if (!r) {
      return { ada: false, penerimaan: null };
    }
    return {
      ada: true,
      penerimaan: {
        id: Number(r.id),
        nomor: r.nomor,
        tanggal_faktur: Jam.keTanggalWib(r.tanggal_faktur),
        waktu: Jam.keIsoWib(r.waktu),
      },
    };
  });
}

export async function periksaBarisPenerimaanLayanan(
  apotekId: number,
  input: z.infer<typeof skemaPeriksaBaris>,
) {
  const hariIni = Jam.hariIniWib();
  const tanggalLewat = input.tanggal_kedaluwarsa < hariIni;

  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      id: string;
      stok: number;
      tanggal_kedaluwarsa: Date | string;
      harga_beli: string;
    }>(
      `SELECT id, stok, tanggal_kedaluwarsa, harga_beli
       FROM batch_barang
       WHERE barang_id = $1 AND nomor_batch = $2`,
      [input.barang_id, input.nomor_batch],
    );
    const b = res.rows[0];
    if (!b) {
      return { tanggal_lewat: tanggalLewat, batch_ada: null, dapat_digabung: false };
    }

    const tglExp = Jam.keTanggalWib(b.tanggal_kedaluwarsa);
    const hargaBeli = keUangBulat(b.harga_beli);
    const dapatDigabung =
      tglExp === input.tanggal_kedaluwarsa && hargaBeli === input.harga_beli;

    return {
      tanggal_lewat: tanggalLewat,
      batch_ada: {
        id: Number(b.id),
        stok: b.stok,
        tanggal_kedaluwarsa: tglExp,
        harga_beli: hargaBeli,
      },
      dapat_digabung: dapatDigabung,
    };
  });
}

async function formatPenerimaanLengkap(client: import('pg').PoolClient, id: number) {
  const pRes = await client.query<{
    id: string;
    nomor: string;
    pemasok_id: string;
    pemasok_nama: string;
    nomor_faktur: string;
    tanggal_faktur: Date | string;
    total: string;
    lampiran_id: string;
    waktu: Date;
    dibuat_oleh: string;
  }>(
    `SELECT pb.id, pb.nomor, pb.pemasok_id, p.nama AS pemasok_nama,
            pb.nomor_faktur, pb.tanggal_faktur, pb.total, pb.lampiran_id, pb.waktu, pb.dibuat_oleh
     FROM penerimaan_barang pb
     JOIN pemasok p ON p.id = pb.pemasok_id
     WHERE pb.id = $1`,
    [id],
  );
  const p = pRes.rows[0];
  if (!p) throw new GalatAplikasi('TIDAK_DITEMUKAN');

  const bRes = await client.query<{
    id: string;
    barang_id: string;
    kode: string;
    nama: string;
    satuan: string;
    batch_id: string;
    nomor_batch: string;
    tanggal_kedaluwarsa: Date | string;
    jumlah: number;
    harga_beli: string;
    subtotal: string;
  }>(
    `SELECT bp.id, bp.barang_id, b.kode, b.nama, b.satuan,
            bp.batch_id, bp.nomor_batch, bp.tanggal_kedaluwarsa, bp.jumlah, bp.harga_beli, bp.subtotal
     FROM baris_penerimaan bp
     JOIN barang b ON b.id = bp.barang_id
     WHERE bp.penerimaan_id = $1
     ORDER BY bp.id ASC`,
    [id],
  );

  return {
    id: Number(p.id),
    nomor: p.nomor,
    pemasok: { id: Number(p.pemasok_id), nama: p.pemasok_nama },
    nomor_faktur: p.nomor_faktur,
    tanggal_faktur: Jam.keTanggalWib(p.tanggal_faktur),
    total: keUangBulat(p.total),
    lampiran_id: p.lampiran_id,
    waktu: Jam.keIsoWib(p.waktu),
    dibuat_oleh: Number(p.dibuat_oleh),
    baris: bRes.rows.map((b) => ({
      id: Number(b.id),
      barang_id: Number(b.barang_id),
      kode: b.kode,
      nama: b.nama,
      satuan: b.satuan,
      batch_id: Number(b.batch_id),
      nomor_batch: b.nomor_batch,
      tanggal_kedaluwarsa: Jam.keTanggalWib(b.tanggal_kedaluwarsa),
      jumlah: b.jumlah,
      harga_beli: keUangBulat(b.harga_beli),
      subtotal: keUangBulat(b.subtotal),
    })),
  };
}

export async function simpanPenerimaanLayanan(
  pengguna: KonteksPengguna,
  kunciIdempoten: string,
  input: z.infer<typeof skemaSimpanPenerimaan>,
) {
  const hashPermintaan = hitungHashPermintaan(input as unknown as Record<string, unknown>);
  const sekarang = Jam.sekarang();
  const hariIni = Jam.hariIniWib();
  const nomorFaktur = normalisasiNomorFaktur(input.nomor_faktur);

  if (input.tanggal_faktur > hariIni) {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      tanggal_faktur: ['Tanggal faktur tidak boleh melebihi hari ini.'],
    });
  }

  const batchTerlihat = new Set<string>();
  for (let i = 0; i < input.baris.length; i++) {
    const b = input.baris[i]!;
    if (b.tanggal_kedaluwarsa < hariIni) {
      throw new GalatAplikasi('TANGGAL_KEDALUWARSA_LEWAT', { indeks: i });
    }
    const k = `${b.barang_id}::${b.nomor_batch}`;
    if (batchTerlihat.has(k)) {
      throw new GalatAplikasi('VALIDASI_GAGAL', {
        baris: [`Pasangan barang ${b.barang_id} dan batch ${b.nomor_batch} ganda.`],
      });
    }
    batchTerlihat.add(k);
  }

  try {
    return await withApotek(pengguna.apotekId, async (client) => {
      const cekIdemp = await client.query<{ id: string; hash_permintaan: string }>(
        `SELECT id, hash_permintaan FROM penerimaan_barang WHERE kunci_idempoten = $1`,
        [kunciIdempoten],
      );
      if (cekIdemp.rows[0]) {
        if (cekIdemp.rows[0].hash_permintaan !== hashPermintaan) {
          throw new GalatAplikasi('KUNCI_IDEMPOTEN_BENTROK');
        }
        const data = await formatPenerimaanLengkap(client, Number(cekIdemp.rows[0].id));
        return { replay: true, data };
      }

      // 1. Pemasok & lampiran
      const pbfRes = await client.query<{ aktif: boolean }>(
        `SELECT aktif FROM pemasok WHERE id = $1`,
        [input.pemasok_id],
      );
      if (!pbfRes.rows[0]) throw new GalatAplikasi('TIDAK_DITEMUKAN', { pemasok_id: input.pemasok_id });
      if (!pbfRes.rows[0].aktif) {
        throw new GalatAplikasi('VALIDASI_GAGAL', { pemasok_id: ['Pemasok tidak aktif.'] });
      }

      const lampRes = await client.query<{ jenis: string }>(
        `SELECT jenis FROM lampiran WHERE id = $1`,
        [input.lampiran_id],
      );
      if (!lampRes.rows[0] || lampRes.rows[0].jenis !== 'faktur') {
        throw new GalatAplikasi('LAMPIRAN_WAJIB');
      }
      const lampPakai = await client.query(
        `SELECT 1 FROM penerimaan_barang WHERE lampiran_id = $1`,
        [input.lampiran_id],
      );
      if (lampPakai.rowCount && lampPakai.rowCount > 0) {
        throw new GalatAplikasi('DUPLIKAT', { field: 'lampiran_id' });
      }

      // 2. Cek faktur ganda
      const fakRes = await client.query<{ nomor: string; tanggal_faktur: Date | string }>(
        `SELECT nomor, tanggal_faktur FROM penerimaan_barang
         WHERE pemasok_id = $1 AND nomor_faktur = $2`,
        [input.pemasok_id, nomorFaktur],
      );
      if (fakRes.rows[0]) {
        throw new GalatAplikasi('FAKTUR_SUDAH_ADA', {
          nomor: fakRes.rows[0].nomor,
          tanggal_faktur: Jam.keTanggalWib(fakRes.rows[0].tanggal_faktur),
        });
      }

      // 3-4. Cek barang aktif dan batch
      let total = 0;
      const batchHasil: Array<{
        barangId: number;
        batchId: number;
        nomorBatch: string;
        tanggalExp: string;
        jumlah: number;
        hargaBeli: number;
        subtotal: number;
      }> = [];

      for (let i = 0; i < input.baris.length; i++) {
        const b = input.baris[i]!;
        const brgRes = await client.query<{ aktif: boolean }>(
          `SELECT aktif FROM barang WHERE id = $1`,
          [b.barang_id],
        );
        if (!brgRes.rows[0]) throw new GalatAplikasi('TIDAK_DITEMUKAN', { barang_id: b.barang_id });
        if (!brgRes.rows[0].aktif) {
          throw new GalatAplikasi('VALIDASI_GAGAL', {
            baris: [`Barang pada indeks ${i} tidak aktif.`],
          });
        }

        const existingBatchRes = await client.query<{
          id: string;
          stok: number;
          tanggal_kedaluwarsa: Date | string;
          harga_beli: string;
        }>(
          `SELECT id, stok, tanggal_kedaluwarsa, harga_beli
           FROM batch_barang
           WHERE barang_id = $1 AND nomor_batch = $2
           FOR UPDATE`,
          [b.barang_id, b.nomor_batch],
        );
        const ex = existingBatchRes.rows[0];
        let batchId: number;

        if (ex) {
          const exExp = Jam.keTanggalWib(ex.tanggal_kedaluwarsa);
          const exHarga = keUangBulat(ex.harga_beli);
          if (!b.gabung_ke_batch_ada) {
            throw new GalatAplikasi('BATCH_SUDAH_ADA', {
              indeks: i,
              batch: {
                id: Number(ex.id),
                stok: ex.stok,
                tanggal_kedaluwarsa: exExp,
                harga_beli: exHarga,
              },
            });
          }
          if (exExp !== b.tanggal_kedaluwarsa || exHarga !== b.harga_beli) {
            throw new GalatAplikasi('BATCH_BEDA_DATA', { indeks: i });
          }
          batchId = Number(ex.id);
          await client.query(`UPDATE batch_barang SET stok = stok + $1 WHERE id = $2`, [
            b.jumlah,
            batchId,
          ]);
        } else {
          const insB = await client.query<{ id: string }>(
            `INSERT INTO batch_barang
              (apotek_id, barang_id, nomor_batch, tanggal_kedaluwarsa, harga_beli, stok, dibuat_pada)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              pengguna.apotekId,
              b.barang_id,
              b.nomor_batch,
              b.tanggal_kedaluwarsa,
              b.harga_beli,
              b.jumlah,
              sekarang.toISO(),
            ],
          );
          batchId = Number(insB.rows[0]!.id);
        }

        const subtotal = b.jumlah * b.harga_beli;
        total += subtotal;
        batchHasil.push({
          barangId: b.barang_id,
          batchId,
          nomorBatch: b.nomor_batch,
          tanggalExp: b.tanggal_kedaluwarsa,
          jumlah: b.jumlah,
          hargaBeli: b.harga_beli,
          subtotal,
        });
      }

      if (total <= 0) {
        throw new GalatAplikasi('VALIDASI_GAGAL', {
          baris: ['Total penerimaan harus lebih dari 0.'],
        });
      }

      // 5. Insert penerimaan_barang, baris_penerimaan, mutasi_stok, jurnal, audit
      const nomor = await buatNomorDokumen(client, pengguna.apotekId, 'PB', hariIni);
      const waktuIso = sekarang.toISO()!;
      const pbRes = await client.query<{ id: string }>(
        `INSERT INTO penerimaan_barang
          (apotek_id, nomor, kunci_idempoten, hash_permintaan, pemasok_id,
           nomor_faktur, tanggal_faktur, total, lampiran_id, waktu, waktu_perangkat, dibuat_oleh)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          pengguna.apotekId,
          nomor,
          kunciIdempoten,
          hashPermintaan,
          input.pemasok_id,
          nomorFaktur,
          input.tanggal_faktur,
          total,
          input.lampiran_id,
          waktuIso,
          input.waktu_perangkat ?? null,
          pengguna.id,
        ],
      );
      const penerimaanId = Number(pbRes.rows[0]!.id);

      for (const bh of batchHasil) {
        await client.query(
          `INSERT INTO baris_penerimaan
            (apotek_id, penerimaan_id, barang_id, batch_id, nomor_batch,
             tanggal_kedaluwarsa, jumlah, harga_beli, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            pengguna.apotekId,
            penerimaanId,
            bh.barangId,
            bh.batchId,
            bh.nomorBatch,
            bh.tanggalExp,
            bh.jumlah,
            bh.hargaBeli,
            bh.subtotal,
          ],
        );

        await client.query(
          `INSERT INTO mutasi_stok
            (apotek_id, batch_id, barang_id, jenis, jumlah, waktu, sumber_tipe, sumber_id)
           VALUES ($1, $2, $3, 'penerimaan', $4, $5, 'penerimaan', $6)`,
          [pengguna.apotekId, bh.batchId, bh.barangId, bh.jumlah, waktuIso, penerimaanId],
        );
      }

      const petaAkun = await ambilPetaAkun(client);
      await buatJurnalDiClient(client, {
        apotekId: pengguna.apotekId,
        tanggal: hariIni,
        jenis: 'penerimaan',
        keterangan: `Penerimaan ${nomor} faktur ${nomorFaktur}`,
        sumberTipe: 'penerimaan',
        sumberId: penerimaanId,
        dibuatOleh: pengguna.id,
        baris: [
          { akunId: petaAkun.get('1140')!.id, debit: total, kredit: 0 },
          { akunId: petaAkun.get('2110')!.id, debit: 0, kredit: total },
        ],
      });

      await catatAudit(client, {
        apotekId: pengguna.apotekId,
        penggunaId: pengguna.id,
        aksi: 'penerimaan.simpan',
        entitas: 'penerimaan_barang',
        entitasId: penerimaanId,
        hasil: 'berhasil',
        detail: { nomor, nomor_faktur: nomorFaktur, total },
      });

      const data = await formatPenerimaanLengkap(client, penerimaanId);
      return { replay: false, data };
    });
  } catch (err) {
    if (err instanceof GalatAplikasi && err.kode === 'DUPLIKAT') {
      const cek = await withApotek(pengguna.apotekId, async (client) => {
        const r = await client.query<{ id: string; hash_permintaan: string }>(
          `SELECT id, hash_permintaan FROM penerimaan_barang WHERE kunci_idempoten = $1`,
          [kunciIdempoten],
        );
        if (!r.rows[0]) return null;
        if (r.rows[0].hash_permintaan !== hashPermintaan) {
          throw new GalatAplikasi('KUNCI_IDEMPOTEN_BENTROK');
        }
        return formatPenerimaanLengkap(client, Number(r.rows[0].id));
      });
      if (cek) return { replay: true, data: cek };
    }

    const kodeGalat = err instanceof GalatAplikasi ? err.kode : 'GALAT_INTERNAL';
    await catatAuditGagal({
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'penerimaan.simpan',
      entitas: 'penerimaan_barang',
      kodeGalat,
    });
    throw err;
  }
}

export async function daftarPenerimaanLayanan(
  apotekId: number,
  query: z.infer<typeof skemaDaftarPenerimaan>,
) {
  return withApotek(apotekId, async (client) => {
    const kondisi: string[] = [];
    const params: unknown[] = [];

    if (query.pemasok_id) {
      params.push(query.pemasok_id);
      kondisi.push(`pb.pemasok_id = $${params.length}`);
    }
    if (query.tanggal_dari) {
      params.push(`${query.tanggal_dari}T00:00:00+07:00`);
      kondisi.push(`pb.waktu >= $${params.length}`);
    }
    if (query.tanggal_sampai) {
      params.push(`${query.tanggal_sampai}T23:59:59.999+07:00`);
      kondisi.push(`pb.waktu <= $${params.length}`);
    }

    const whereSql = kondisi.length > 0 ? `WHERE ${kondisi.join(' AND ')}` : '';
    const totalRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM penerimaan_barang pb ${whereSql}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.cnt ?? 0);

    const offset = (query.halaman - 1) * query.per_halaman;
    const rowsRes = await client.query<{
      id: string;
      nomor: string;
      pemasok_nama: string;
      nomor_faktur: string;
      tanggal_faktur: Date | string;
      total: string;
      waktu: Date;
    }>(
      `SELECT pb.id, pb.nomor, p.nama AS pemasok_nama, pb.nomor_faktur,
              pb.tanggal_faktur, pb.total, pb.waktu
       FROM penerimaan_barang pb
       JOIN pemasok p ON p.id = pb.pemasok_id
       ${whereSql}
       ORDER BY pb.waktu DESC, pb.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map((r) => ({
        id: Number(r.id),
        nomor: r.nomor,
        pemasok_nama: r.pemasok_nama,
        nomor_faktur: r.nomor_faktur,
        tanggal_faktur: Jam.keTanggalWib(r.tanggal_faktur),
        total: keUangBulat(r.total),
        waktu: Jam.keIsoWib(r.waktu),
      })),
      meta: {
        halaman: query.halaman,
        per_halaman: query.per_halaman,
        total,
      },
    };
  });
}

export async function ambilPenerimaanLayanan(apotekId: number, id: number) {
  return withApotek(apotekId, (client) => formatPenerimaanLengkap(client, id));
}
