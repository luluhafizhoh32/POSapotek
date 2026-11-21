import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit, catatAuditGagal } from '../../lib/audit.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { hitungHashPermintaan } from '../../lib/idempotensi.js';
import { Jam } from '../../lib/jam.js';
import { buatNomorDokumen } from '../../lib/nomor.js';
import { keUangBulat } from '../../lib/uang.js';
import { skemaJumlah, skemaPaginasi, skemaTanggal, skemaUang } from '../../lib/validasi.js';
import { ambilPetaAkun, buatJurnalDiClient } from '../akuntansi/layanan.js';

export const penjualanHooksUji = {
  setelahKurangiStok: null as null | (() => void),
};

export const skemaPratinjauPenjualan = z
  .object({
    baris: z
      .array(
        z
          .object({
            barang_id: z.number().int().positive(),
            jumlah: skemaJumlah,
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

export const skemaSimpanPenjualan = z
  .object({
    baris: z
      .array(
        z
          .object({
            barang_id: z.number().int().positive(),
            jumlah: skemaJumlah,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    cara_bayar: z.enum(['tunai', 'qris', 'debit', 'transfer', 'ewallet']),
    uang_diterima: skemaUang.nullable().optional(),
    pembayaran_nontunai_id: z.string().uuid().nullable().optional(),
    waktu_perangkat: z.string().trim().optional().nullable(),
  })
  .strict();

export const skemaDaftarPenjualan = skemaPaginasi.extend({
  tanggal_dari: skemaTanggal.optional(),
  tanggal_sampai: skemaTanggal.optional(),
  kasir_id: z.coerce.number().int().positive().optional(),
  cara_bayar: z.enum(['tunai', 'qris', 'debit', 'transfer', 'ewallet']).optional(),
});

function pastikanBarangTidakGanda(baris: Array<{ barang_id: number }>) {
  const seen = new Set<number>();
  for (const b of baris) {
    if (seen.has(b.barang_id)) {
      throw new GalatAplikasi('VALIDASI_GAGAL', {
        baris: [`barang_id ${b.barang_id} tidak boleh ganda.`],
      });
    }
    seen.add(b.barang_id);
  }
}

export async function pratinjauPenjualanLayanan(
  apotekId: number,
  input: z.infer<typeof skemaPratinjauPenjualan>,
) {
  pastikanBarangTidakGanda(input.baris);
  const hariIni = Jam.hariIniWib();

  return withApotek(apotekId, async (client) => {
    const hasilBaris: Array<{
      barang_id: number;
      kode: string;
      nama: string;
      satuan: string;
      jumlah: number;
      harga_satuan: number;
      subtotal: number;
      status: 'ok' | 'stok_tidak_cukup' | 'semua_batch_kedaluwarsa' | 'barang_nonaktif';
      stok_tersedia: number;
    }> = [];

    let total = 0;
    let dapatDisimpan = true;

    for (const item of input.baris) {
      const brgRes = await client.query<{
        id: string;
        kode: string;
        nama: string;
        satuan: string;
        harga_jual: string;
        aktif: boolean;
      }>(`SELECT id, kode, nama, satuan, harga_jual, aktif FROM barang WHERE id = $1`, [
        item.barang_id,
      ]);
      const brg = brgRes.rows[0];
      if (!brg) {
        throw new GalatAplikasi('TIDAK_DITEMUKAN', { barang_id: item.barang_id });
      }

      const stokRes = await client.query<{ tersedia: string; kedaluwarsa: string }>(
        `SELECT
           COALESCE(SUM(stok) FILTER (WHERE tanggal_kedaluwarsa >= $2::date), 0) AS tersedia,
           COALESCE(SUM(stok) FILTER (WHERE tanggal_kedaluwarsa < $2::date), 0) AS kedaluwarsa
         FROM batch_barang
         WHERE barang_id = $1`,
        [item.barang_id, hariIni],
      );
      const stokTersedia = Number(stokRes.rows[0]?.tersedia ?? 0);
      const stokKedaluwarsa = Number(stokRes.rows[0]?.kedaluwarsa ?? 0);
      const hargaSatuan = keUangBulat(brg.harga_jual);
      const subtotal = item.jumlah * hargaSatuan;

      let status: 'ok' | 'stok_tidak_cukup' | 'semua_batch_kedaluwarsa' | 'barang_nonaktif' = 'ok';
      if (!brg.aktif) {
        status = 'barang_nonaktif';
      } else if (stokTersedia === 0 && stokKedaluwarsa > 0) {
        status = 'semua_batch_kedaluwarsa';
      } else if (stokTersedia < item.jumlah) {
        status = 'stok_tidak_cukup';
      }

      if (status === 'ok') {
        total += subtotal;
      } else {
        dapatDisimpan = false;
      }

      hasilBaris.push({
        barang_id: item.barang_id,
        kode: brg.kode,
        nama: brg.nama,
        satuan: brg.satuan,
        jumlah: item.jumlah,
        harga_satuan: hargaSatuan,
        subtotal,
        status,
        stok_tersedia: stokTersedia,
      });
    }

    return {
      baris: hasilBaris,
      total,
      dapat_disimpan: dapatDisimpan,
    };
  });
}

async function formatPenjualanLengkap(
  client: import('pg').PoolClient,
  penjualanId: number,
  sertakanHpp: boolean,
) {
  const pRes = await client.query<{
    id: string;
    nomor: string;
    waktu: Date;
    kasir_id: string;
    kasir_nama: string;
    cara_bayar: 'tunai' | 'qris' | 'transfer';
    total: string;
    total_hpp: string;
    uang_diterima: string | null;
    kembalian: string | null;
  }>(
    `SELECT p.id, p.nomor, p.waktu, p.kasir_id, u.nama_lengkap AS kasir_nama,
            p.cara_bayar, p.total, p.total_hpp, p.uang_diterima, p.kembalian
     FROM penjualan p
     JOIN pengguna u ON u.id = p.kasir_id
     WHERE p.id = $1`,
    [penjualanId],
  );
  const p = pRes.rows[0];
  if (!p) throw new GalatAplikasi('TIDAK_DITEMUKAN');

  const barisRes = await client.query<{
    id: string;
    barang_id: string;
    kode: string;
    nama: string;
    satuan: string;
    jumlah: number;
    harga_satuan: string;
    subtotal: string;
  }>(
    `SELECT bp.id, bp.barang_id, b.kode, b.nama, b.satuan, bp.jumlah, bp.harga_satuan, bp.subtotal
     FROM baris_penjualan bp
     JOIN barang b ON b.id = bp.barang_id
     WHERE bp.penjualan_id = $1
     ORDER BY bp.id ASC`,
    [penjualanId],
  );

  const baris = [];
  for (const b of barisRes.rows) {
    const pengRes = await client.query<{
      batch_id: string;
      nomor_batch: string;
      tanggal_kedaluwarsa: Date | string;
      jumlah: number;
      harga_beli_satuan: string;
    }>(
      `SELECT pb.batch_id, bb.nomor_batch, bb.tanggal_kedaluwarsa, pb.jumlah, pb.harga_beli_satuan
       FROM pengambilan_batch pb
       JOIN batch_barang bb ON bb.id = pb.batch_id
       WHERE pb.baris_penjualan_id = $1
       ORDER BY pb.id ASC`,
      [b.id],
    );

    baris.push({
      barang_id: Number(b.barang_id),
      kode: b.kode,
      nama: b.nama,
      satuan: b.satuan,
      jumlah: b.jumlah,
      harga_satuan: keUangBulat(b.harga_satuan),
      subtotal: keUangBulat(b.subtotal),
      pengambilan: pengRes.rows.map((pgRow) => ({
        batch_id: Number(pgRow.batch_id),
        nomor_batch: pgRow.nomor_batch,
        tanggal_kedaluwarsa: Jam.keTanggalWib(pgRow.tanggal_kedaluwarsa),
        jumlah: pgRow.jumlah,
        ...(sertakanHpp ? { harga_beli: keUangBulat(pgRow.harga_beli_satuan) } : {}),
      })),
    });
  }

  return {
    id: Number(p.id),
    nomor: p.nomor,
    waktu: Jam.keIsoWib(p.waktu),
    kasir: {
      id: Number(p.kasir_id),
      nama_lengkap: p.kasir_nama,
    },
    cara_bayar: p.cara_bayar,
    total: keUangBulat(p.total),
    ...(sertakanHpp ? { total_hpp: keUangBulat(p.total_hpp) } : {}),
    uang_diterima: p.uang_diterima !== null ? keUangBulat(p.uang_diterima) : null,
    kembalian: p.kembalian !== null ? keUangBulat(p.kembalian) : null,
    baris,
  };
}

export async function simpanPenjualanLayanan(
  pengguna: KonteksPengguna,
  kunciIdempoten: string,
  input: z.infer<typeof skemaSimpanPenjualan>,
) {
  pastikanBarangTidakGanda(input.baris);

  if (input.cara_bayar === 'tunai') {
    if (input.uang_diterima === null || input.uang_diterima === undefined || input.pembayaran_nontunai_id) {
      throw new GalatAplikasi('VALIDASI_GAGAL', {
        uang_diterima: ['Pembayaran tunai wajib mengisi uang_diterima dan tanpa pembayaran_nontunai_id.'],
      });
    }
  } else {
    if (!input.pembayaran_nontunai_id || (input.uang_diterima !== null && input.uang_diterima !== undefined)) {
      throw new GalatAplikasi('VALIDASI_GAGAL', {
        pembayaran_nontunai_id: ['Pembayaran nontunai wajib mengisi pembayaran_nontunai_id dan tanpa uang_diterima.'],
      });
    }
  }

  const hashPermintaan = hitungHashPermintaan(input as unknown as Record<string, unknown>);
  const sekarang = Jam.sekarang();
  const hariIni = Jam.hariIniWib();
  const sertakanHpp = pengguna.peran === 'apa' || pengguna.peran === 'pemilik';

  try {
    return await withApotek(pengguna.apotekId, async (client) => {
      // 1. Cek kunci idempoten
      const cekIdemp = await client.query<{ id: string; hash_permintaan: string }>(
        `SELECT id, hash_permintaan FROM penjualan WHERE kunci_idempoten = $1`,
        [kunciIdempoten],
      );
      if (cekIdemp.rows[0]) {
        if (cekIdemp.rows[0].hash_permintaan !== hashPermintaan) {
          throw new GalatAplikasi('KUNCI_IDEMPOTEN_BENTROK');
        }
        const data = await formatPenjualanLengkap(client, Number(cekIdemp.rows[0].id), sertakanHpp);
        return { replay: true, data };
      }

      // 2-4. Muat barang & kunci batch FEFO berurutan berdasarkan barang_id (hindari deadlock)
      const barisTerurut = [...input.baris].sort((a, b) => a.barang_id - b.barang_id);
      const barisDitolak: Array<{ barang_id: number; status: string; stok_tersedia: number }> = [];

      interface RencanaBaris {
        barangId: number;
        jumlah: number;
        hargaSatuan: number;
        subtotal: number;
        pengambilan: Array<{ batchId: number; jumlah: number; hargaBeli: number }>;
      }
      const rencana: RencanaBaris[] = [];

      for (const item of barisTerurut) {
        const brgRes = await client.query<{
          id: string;
          harga_jual: string;
          aktif: boolean;
        }>(`SELECT id, harga_jual, aktif FROM barang WHERE id = $1`, [item.barang_id]);
        const brg = brgRes.rows[0];
        if (!brg) {
          throw new GalatAplikasi('TIDAK_DITEMUKAN', { barang_id: item.barang_id });
        }

        if (!brg.aktif) {
          barisDitolak.push({
            barang_id: item.barang_id,
            status: 'barang_nonaktif',
            stok_tersedia: 0,
          });
          continue;
        }

        const batchRes = await client.query<{
          id: string;
          stok: number;
          harga_beli: string;
        }>(
          `SELECT id, stok, harga_beli
           FROM batch_barang
           WHERE barang_id = $1 AND stok > 0 AND tanggal_kedaluwarsa >= $2::date
           ORDER BY tanggal_kedaluwarsa ASC, id ASC
           FOR UPDATE`,
          [item.barang_id, hariIni],
        );

        let stokTersedia = 0;
        let sisa = item.jumlah;
        const pengambilan: Array<{ batchId: number; jumlah: number; hargaBeli: number }> = [];

        for (const batch of batchRes.rows) {
          stokTersedia += batch.stok;
          if (sisa > 0) {
            const ambil = Math.min(sisa, batch.stok);
            pengambilan.push({
              batchId: Number(batch.id),
              jumlah: ambil,
              hargaBeli: keUangBulat(batch.harga_beli),
            });
            sisa -= ambil;
          }
        }

        if (sisa > 0) {
          let status = 'stok_tidak_cukup';
          if (stokTersedia === 0) {
            const expRes = await client.query<{ cnt: string }>(
              `SELECT count(*) AS cnt FROM batch_barang
               WHERE barang_id = $1 AND stok > 0 AND tanggal_kedaluwarsa < $2::date`,
              [item.barang_id, hariIni],
            );
            if (Number(expRes.rows[0]?.cnt ?? 0) > 0) {
              status = 'semua_batch_kedaluwarsa';
            }
          }
          barisDitolak.push({
            barang_id: item.barang_id,
            status,
            stok_tersedia: stokTersedia,
          });
          continue;
        }

        const hargaSatuan = keUangBulat(brg.harga_jual);
        rencana.push({
          barangId: item.barang_id,
          jumlah: item.jumlah,
          hargaSatuan,
          subtotal: item.jumlah * hargaSatuan,
          pengambilan,
        });
      }

      if (barisDitolak.length > 0) {
        throw new GalatAplikasi('BARIS_DITOLAK', { baris: barisDitolak });
      }

      // Kembalikan urutan asli sesuai input
      const petaRencana = new Map(rencana.map((r) => [r.barangId, r]));
      const rencanaSesuaiInput = input.baris.map((b) => petaRencana.get(b.barang_id)!);

      // 5. Hitung total & HPP
      let total = 0;
      let totalHpp = 0;
      for (const r of rencanaSesuaiInput) {
        total += r.subtotal;
        for (const p of r.pengambilan) {
          totalHpp += p.jumlah * p.hargaBeli;
        }
      }

      // 6. Validasi pembayaran
      let uangDiterima: number | null = null;
      let kembalian: number | null = null;
      let pembayaranId: string | null = null;

      if (input.cara_bayar === 'tunai') {
        uangDiterima = input.uang_diterima!;
        if (uangDiterima < total) {
          throw new GalatAplikasi('UANG_KURANG', { kekurangan: total - uangDiterima });
        }
        kembalian = uangDiterima - total;
      } else {
        pembayaranId = input.pembayaran_nontunai_id!;
        const payRes = await client.query<{
          id: string;
          cara: string;
          jumlah: string;
          status: string;
        }>(
          `SELECT id, cara, jumlah, status FROM pembayaran_nontunai WHERE id = $1 FOR UPDATE`,
          [pembayaranId],
        );
        const pay = payRes.rows[0];
        if (!pay) {
          throw new GalatAplikasi('TIDAK_DITEMUKAN', { pembayaran_nontunai_id: pembayaranId });
        }
        if (pay.cara !== input.cara_bayar || keUangBulat(pay.jumlah) !== total) {
          throw new GalatAplikasi('PEMBAYARAN_TIDAK_SESUAI');
        }
        if (pay.status !== 'dibayar') {
          throw new GalatAplikasi('PEMBAYARAN_BELUM_DIBAYAR');
        }
        const cekDipakai = await client.query(
          `SELECT 1 FROM penjualan WHERE pembayaran_nontunai_id = $1`,
          [pembayaranId],
        );
        if (cekDipakai.rowCount && cekDipakai.rowCount > 0) {
          throw new GalatAplikasi('PEMBAYARAN_SUDAH_DIPAKAI');
        }
      }

      // 7. Insert penjualan, baris, pengambilan, kurangi stok, mutasi_stok
      const nomor = await buatNomorDokumen(client, pengguna.apotekId, 'PJ', hariIni);
      const waktuIso = sekarang.toISO()!;
      const waktuPerangkatIso = input.waktu_perangkat ?? null;

      const penRes = await client.query<{ id: string }>(
        `INSERT INTO penjualan
          (apotek_id, nomor, kunci_idempoten, hash_permintaan, waktu, waktu_perangkat,
           kasir_id, cara_bayar, total, total_hpp, uang_diterima, kembalian, pembayaran_nontunai_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          pengguna.apotekId,
          nomor,
          kunciIdempoten,
          hashPermintaan,
          waktuIso,
          waktuPerangkatIso,
          pengguna.id,
          input.cara_bayar,
          total,
          totalHpp,
          uangDiterima,
          kembalian,
          pembayaranId,
        ],
      );
      const penjualanId = Number(penRes.rows[0]!.id);

      for (const r of rencanaSesuaiInput) {
        const bpRes = await client.query<{ id: string }>(
          `INSERT INTO baris_penjualan
            (apotek_id, penjualan_id, barang_id, jumlah, harga_satuan, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [pengguna.apotekId, penjualanId, r.barangId, r.jumlah, r.hargaSatuan, r.subtotal],
        );
        const barisId = Number(bpRes.rows[0]!.id);

        for (const p of r.pengambilan) {
          await client.query(
            `INSERT INTO pengambilan_batch
              (apotek_id, baris_penjualan_id, batch_id, jumlah, harga_beli_satuan)
             VALUES ($1, $2, $3, $4, $5)`,
            [pengguna.apotekId, barisId, p.batchId, p.jumlah, p.hargaBeli],
          );

          await client.query(
            `UPDATE batch_barang SET stok = stok - $1 WHERE id = $2`,
            [p.jumlah, p.batchId],
          );

          await client.query(
            `INSERT INTO mutasi_stok
              (apotek_id, batch_id, barang_id, jenis, jumlah, waktu, sumber_tipe, sumber_id)
             VALUES ($1, $2, $3, 'penjualan', $4, $5, 'penjualan', $6)`,
            [pengguna.apotekId, p.batchId, r.barangId, -p.jumlah, waktuIso, penjualanId],
          );
        }
      }

      if (process.env['NODE_ENV'] === 'test' && penjualanHooksUji.setelahKurangiStok) {
        penjualanHooksUji.setelahKurangiStok();
      }

      // 8. Jurnal otomatis penjualan (8.1)
      const petaAkun = await ambilPetaAkun(client);
      const kodeKasAtauBank = input.cara_bayar === 'tunai' ? '1110' : '1120';
      const barisJurnal = [
        { akunId: petaAkun.get(kodeKasAtauBank)!.id, debit: total, kredit: 0 },
        { akunId: petaAkun.get('4110')!.id, debit: 0, kredit: total },
      ];
      if (totalHpp > 0) {
        barisJurnal.push(
          { akunId: petaAkun.get('5110')!.id, debit: totalHpp, kredit: 0 },
          { akunId: petaAkun.get('1140')!.id, debit: 0, kredit: totalHpp },
        );
      }
      await buatJurnalDiClient(client, {
        apotekId: pengguna.apotekId,
        tanggal: hariIni,
        jenis: 'penjualan',
        keterangan: `Penjualan ${nomor}`,
        sumberTipe: 'penjualan',
        sumberId: penjualanId,
        dibuatOleh: pengguna.id,
        baris: barisJurnal,
      });

      // 9. Audit berhasil
      await catatAudit(client, {
        apotekId: pengguna.apotekId,
        penggunaId: pengguna.id,
        aksi: 'penjualan.simpan',
        entitas: 'penjualan',
        entitasId: penjualanId,
        hasil: 'berhasil',
        detail: { nomor, total, cara_bayar: input.cara_bayar },
      });

      const data = await formatPenjualanLengkap(client, penjualanId, sertakanHpp);
      return { replay: false, data };
    });
  } catch (err) {
    // Tangani balapan kunci idempoten
    if (err instanceof GalatAplikasi && err.kode === 'DUPLIKAT') {
      const cek = await withApotek(pengguna.apotekId, async (client) => {
        const r = await client.query<{ id: string; hash_permintaan: string }>(
          `SELECT id, hash_permintaan FROM penjualan WHERE kunci_idempoten = $1`,
          [kunciIdempoten],
        );
        if (!r.rows[0]) return null;
        if (r.rows[0].hash_permintaan !== hashPermintaan) {
          throw new GalatAplikasi('KUNCI_IDEMPOTEN_BENTROK');
        }
        return formatPenjualanLengkap(client, Number(r.rows[0].id), sertakanHpp);
      });
      if (cek) return { replay: true, data: cek };
    }

    const kodeGalat = err instanceof GalatAplikasi ? err.kode : 'GALAT_INTERNAL';
    await catatAuditGagal({
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'penjualan.simpan',
      entitas: 'penjualan',
      kodeGalat,
    });
    throw err;
  }
}

export async function daftarPenjualanLayanan(
  pengguna: KonteksPengguna,
  query: z.infer<typeof skemaDaftarPenjualan>,
) {
  const hariIni = Jam.hariIniWib();
  const dari = query.tanggal_dari ?? hariIni;
  const sampai = query.tanggal_sampai ?? hariIni;

  return withApotek(pengguna.apotekId, async (client) => {
    const kondisi: string[] = ['p.waktu >= $1', 'p.waktu <= $2'];
    const params: unknown[] = [`${dari}T00:00:00+07:00`, `${sampai}T23:59:59.999+07:00`];

    if (pengguna.peran === 'kasir') {
      params.push(pengguna.id);
      kondisi.push(`p.kasir_id = $${params.length}`);
    } else if (query.kasir_id) {
      params.push(query.kasir_id);
      kondisi.push(`p.kasir_id = $${params.length}`);
    }

    if (query.cara_bayar) {
      params.push(query.cara_bayar);
      kondisi.push(`p.cara_bayar = $${params.length}`);
    }

    const whereSql = kondisi.join(' AND ');
    const totalRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM penjualan p WHERE ${whereSql}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.cnt ?? 0);

    const offset = (query.halaman - 1) * query.per_halaman;
    const rowsRes = await client.query<{
      id: string;
      nomor: string;
      waktu: Date;
      kasir_nama: string;
      cara_bayar: string;
      total: string;
      jumlah_baris: string;
    }>(
      `SELECT p.id, p.nomor, p.waktu, u.nama_lengkap AS kasir_nama, p.cara_bayar, p.total,
              count(bp.id) AS jumlah_baris
       FROM penjualan p
       JOIN pengguna u ON u.id = p.kasir_id
       LEFT JOIN baris_penjualan bp ON bp.penjualan_id = p.id
       WHERE ${whereSql}
       GROUP BY p.id, u.nama_lengkap
       ORDER BY p.waktu DESC, p.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map((r) => ({
        id: Number(r.id),
        nomor: r.nomor,
        waktu: Jam.keIsoWib(r.waktu),
        kasir_nama: r.kasir_nama,
        cara_bayar: r.cara_bayar,
        total: keUangBulat(r.total),
        jumlah_baris: Number(r.jumlah_baris),
      })),
      meta: {
        halaman: query.halaman,
        per_halaman: query.per_halaman,
        total,
      },
    };
  });
}

export async function ambilPenjualanLayanan(pengguna: KonteksPengguna, id: number) {
  const sertakanHpp = pengguna.peran === 'apa' || pengguna.peran === 'pemilik';

  return withApotek(pengguna.apotekId, async (client) => {
    const cek = await client.query<{ kasir_id: string }>(
      `SELECT kasir_id FROM penjualan WHERE id = $1`,
      [id],
    );
    const row = cek.rows[0];
    if (!row) throw new GalatAplikasi('TIDAK_DITEMUKAN');
    if (pengguna.peran === 'kasir' && Number(row.kasir_id) !== pengguna.id) {
      throw new GalatAplikasi('TIDAK_DITEMUKAN');
    }

    return formatPenjualanLengkap(client, id, sertakanHpp);
  });
}

export async function ambilStrukPenjualanLayanan(pengguna: KonteksPengguna, id: number) {
  return withApotek(pengguna.apotekId, async (client) => {
    const pRes = await client.query<{
      id: string;
      nomor: string;
      waktu: Date;
      kasir_id: string;
      kasir_nama: string;
      cara_bayar: string;
      total: string;
      uang_diterima: string | null;
      kembalian: string | null;
      kepala_struk: string;
      kaki_struk: string;
    }>(
      `SELECT p.id, p.nomor, p.waktu, p.kasir_id, u.nama_lengkap AS kasir_nama,
              p.cara_bayar, p.total, p.uang_diterima, p.kembalian,
              pa.kepala_struk, pa.kaki_struk
       FROM penjualan p
       JOIN pengguna u ON u.id = p.kasir_id
       JOIN pengaturan_apotek pa ON pa.apotek_id = p.apotek_id
       WHERE p.id = $1`,
      [id],
    );
    const p = pRes.rows[0];
    if (!p) throw new GalatAplikasi('TIDAK_DITEMUKAN');
    if (pengguna.peran === 'kasir' && Number(p.kasir_id) !== pengguna.id) {
      throw new GalatAplikasi('TIDAK_DITEMUKAN');
    }

    const bRes = await client.query<{
      nama: string;
      jumlah: number;
      harga_satuan: string;
      subtotal: string;
    }>(
      `SELECT b.nama, bp.jumlah, bp.harga_satuan, bp.subtotal
       FROM baris_penjualan bp
       JOIN barang b ON b.id = bp.barang_id
       WHERE bp.penjualan_id = $1
       ORDER BY bp.id ASC`,
      [id],
    );

    return {
      kepala: p.kepala_struk,
      nomor: p.nomor,
      waktu: Jam.keIsoWib(p.waktu),
      kasir: p.kasir_nama,
      baris: bRes.rows.map((b) => ({
        nama: b.nama,
        jumlah: b.jumlah,
        harga_satuan: keUangBulat(b.harga_satuan),
        subtotal: keUangBulat(b.subtotal),
      })),
      total: keUangBulat(p.total),
      cara_bayar: p.cara_bayar,
      uang_diterima: p.uang_diterima !== null ? keUangBulat(p.uang_diterima) : null,
      kembalian: p.kembalian !== null ? keUangBulat(p.kembalian) : null,
      kaki: p.kaki_struk,
    };
  });
}
