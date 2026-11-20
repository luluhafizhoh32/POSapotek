import { withApotek } from '../../db/withApotek.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { Jam } from '../../lib/jam.js';
import { keUangBulat } from '../../lib/uang.js';

export async function ambilRingkasanLayanan(pengguna: KonteksPengguna) {
  const hariIni = Jam.hariIniWib();
  const awalHari = `${hariIni}T00:00:00+07:00`;
  const akhirHari = `${hariIni}T23:59:59.999+07:00`;

  return withApotek(pengguna.apotekId, async (client) => {
    const peran = pengguna.peran;
    const hasil: Record<string, number> = {};

    if (peran === 'kasir') {
      const r = await client.query<{ jumlah: string; omzet: string }>(
        `SELECT count(*) AS jumlah, COALESCE(SUM(total), 0) AS omzet
         FROM penjualan
         WHERE kasir_id = $1 AND waktu >= $2 AND waktu <= $3`,
        [pengguna.id, awalHari, akhirHari],
      );
      hasil['jumlah_transaksi_hari_ini'] = Number(r.rows[0]?.jumlah ?? 0);
      hasil['omzet_hari_ini'] = keUangBulat(r.rows[0]?.omzet ?? 0);
      return hasil;
    }

    // Ambil batas near expired dan jumlah notifikasi belum dibaca untuk SG, A, P
    const pengRes = await client.query<{ batas_near_expired_hari: number }>(
      `SELECT batas_near_expired_hari FROM pengaturan_apotek WHERE apotek_id = $1`,
      [pengguna.apotekId],
    );
    const batasHari = pengRes.rows[0]?.batas_near_expired_hari ?? 90;

    const notifRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM notifikasi WHERE penerima_id = $1 AND dibaca_pada IS NULL`,
      [pengguna.id],
    );
    const notifikasiBelumDibaca = Number(notifRes.rows[0]?.cnt ?? 0);

    const batchRes = await client.query<{ near_exp: string; exp: string }>(
      `SELECT
         count(*) FILTER (
           WHERE tanggal_kedaluwarsa >= $1::date
             AND (tanggal_kedaluwarsa - $1::date) <= $2
         ) AS near_exp,
         count(*) FILTER (
           WHERE tanggal_kedaluwarsa < $1::date
         ) AS exp
       FROM batch_barang
       WHERE stok > 0`,
      [hariIni, batasHari],
    );
    const nearExpiredBatch = Number(batchRes.rows[0]?.near_exp ?? 0);
    const kedaluwarsaBatch = Number(batchRes.rows[0]?.exp ?? 0);

    if (peran === 'staf_gudang' || peran === 'pemilik') {
      const defRes = await client.query<{ cnt: string }>(
        `SELECT count(*) AS cnt
         FROM barang b
         LEFT JOIN (
           SELECT barang_id, COALESCE(SUM(stok), 0) AS stok_total
           FROM batch_barang
           WHERE tanggal_kedaluwarsa >= $1::date
           GROUP BY barang_id
         ) s ON s.barang_id = b.id
         WHERE b.aktif = true
           AND b.stok_minimum > 0
           AND COALESCE(s.stok_total, 0) <= b.stok_minimum`,
        [hariIni],
      );
      hasil['defekta_barang'] = Number(defRes.rows[0]?.cnt ?? 0);
    }

    if (peran === 'staf_gudang') {
      hasil['near_expired_batch'] = nearExpiredBatch;
      hasil['kedaluwarsa_batch'] = kedaluwarsaBatch;
      hasil['notifikasi_belum_dibaca'] = notifikasiBelumDibaca;
      return hasil;
    }

    // APA & Pemilik
    const pengajuanRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM pengajuan_pengurangan WHERE status = 'menunggu'`,
    );
    const penjualanRes = await client.query<{ jumlah: string; omzet: string }>(
      `SELECT count(*) AS jumlah, COALESCE(SUM(total), 0) AS omzet
       FROM penjualan
       WHERE waktu >= $1 AND waktu <= $2`,
      [awalHari, akhirHari],
    );

    hasil['pengajuan_menunggu'] = Number(pengajuanRes.rows[0]?.cnt ?? 0);
    hasil['near_expired_batch'] = nearExpiredBatch;
    hasil['kedaluwarsa_batch'] = kedaluwarsaBatch;
    hasil['omzet_hari_ini'] = keUangBulat(penjualanRes.rows[0]?.omzet ?? 0);
    hasil['notifikasi_belum_dibaca'] = notifikasiBelumDibaca;

    if (peran === 'pemilik') {
      hasil['jumlah_transaksi_hari_ini'] = Number(penjualanRes.rows[0]?.jumlah ?? 0);
    }

    return hasil;
  });
}
