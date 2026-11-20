import { DateTime } from 'luxon';
import { getPool } from '../db/pool.js';
import { withApotek } from '../db/withApotek.js';
import { catatAuditGagal } from '../lib/audit.js';
import { Jam, ZONA_BISNIS } from '../lib/jam.js';
import { keUangBulat } from '../lib/uang.js';
import {
  hitungDefektaDiClient,
  hitungFastSlowDiClient,
  hitungMarginKategoriDiClient,
} from '../modul/laporan/layanan.js';
import { hitungNearExpiredDiClient } from '../modul/nearExpired/layanan.js';

export type PengirimLaporanBulanan = (params: {
  penerimaApotekId: number;
  penerimaId: number;
  apotekKode: string;
  apotekNama: string;
  periode: string;
  waktuIso: string;
}) => Promise<void>;

const pengirimDefault: PengirimLaporanBulanan = async (params) => {
  await withApotek(params.penerimaApotekId, async (c) => {
    await c.query(
      `INSERT INTO notifikasi
        (apotek_id, penerima_id, jenis, judul, isi, tautan_tipe, tautan_id, dibuat_pada)
       VALUES ($1, $2, 'laporan_bulanan_terbit', $3, $4, 'laporan_bulanan', $5, $6)`,
      [
        params.penerimaApotekId,
        params.penerimaId,
        'Laporan bulanan terbit',
        `Laporan bulanan ${params.apotekNama} (${params.apotekKode}) periode ${params.periode} telah terbit.`,
        params.periode,
        params.waktuIso,
      ],
    );
  });
};

function jeda(ms: number): Promise<void> {
  if (process.env['NODE_ENV'] === 'test') return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function kirimDenganUlang(fn: () => Promise<void>): Promise<boolean> {
  const jedaMs = [1000, 2000];
  for (let i = 0; i < 3; i++) {
    try {
      await fn();
      return true;
    } catch {
      if (i < 2) await jeda(jedaMs[i]!);
    }
  }
  return false;
}

export async function jalankanJobLaporanBulanan(
  pengirim: PengirimLaporanBulanan = pengirimDefault,
): Promise<void> {
  const pool = getPool();
  const lockClient = await pool.connect();

  try {
    const lockRes = await lockClient.query<{ ok: boolean }>(
      `SELECT pg_try_advisory_lock(1002) AS ok`,
    );
    if (!lockRes.rows[0]?.ok) return;

    const sekarang = Jam.sekarang();
    const hariIni = sekarang.toFormat('yyyy-MM-dd');
    const tanggalHariIni = sekarang.day;
    const periodeLalu = sekarang.minus({ months: 1 }).toFormat('yyyy-MM');
    const waktuIso = sekarang.toISO()!;

    const awalPeriode = `${periodeLalu}-01`;
    const akhirPeriode = DateTime.fromFormat(periodeLalu, 'yyyy-MM', { zone: ZONA_BISNIS })
      .endOf('month')
      .toFormat('yyyy-MM-dd');

    const apotekRes = await pool.query<{ id: string; kode: string; nama: string }>(
      `SELECT id, kode, nama FROM apotek WHERE aktif = true ORDER BY id ASC`,
    );

    for (const apo of apotekRes.rows) {
      const apotekId = Number(apo.id);
      try {
        const siapTerbit = await withApotek(apotekId, async (client) => {
          const pengRes = await client.query<{ laporan_bulanan_tanggal: number }>(
            `SELECT laporan_bulanan_tanggal FROM pengaturan_apotek WHERE apotek_id = $1`,
            [apotekId],
          );
          const tglJadwal = pengRes.rows[0]?.laporan_bulanan_tanggal ?? 3;
          if (tanggalHariIni < tglJadwal) return false;

          // 1. Cek apakah sudah terbit
          const lapRes = await client.query<{ id: string; status: string }>(
            `SELECT id, status FROM laporan_bulanan WHERE periode = $1 FOR UPDATE`,
            [periodeLalu],
          );
          if (lapRes.rows[0]?.status === 'terbit') return false;

          // 2. Cek apakah periode P sudah ditutup
          const perRes = await client.query<{ status: string }>(
            `SELECT status FROM periode_akuntansi WHERE periode = $1`,
            [periodeLalu],
          );
          if (perRes.rows[0]?.status !== 'ditutup') {
            const pemilikRes = await client.query<{ id: string }>(
              `SELECT id FROM pengguna WHERE apotek_id = $1 AND peran = 'pemilik' AND aktif = true`,
              [apotekId],
            );
            for (const pm of pemilikRes.rows) {
              const sudahAda = await client.query(
                `SELECT 1 FROM notifikasi
                 WHERE penerima_id = $1
                   AND jenis = 'periode_belum_ditutup'
                   AND (dibuat_pada AT TIME ZONE 'Asia/Jakarta')::date = $2::date`,
                [pm.id, hariIni],
              );
              if (!sudahAda.rowCount) {
                await client.query(
                  `INSERT INTO notifikasi
                    (apotek_id, penerima_id, jenis, judul, isi, tautan_tipe, tautan_id, dibuat_pada)
                   VALUES ($1, $2, 'periode_belum_ditutup', 'Periode belum ditutup', $3, 'periode', $4, $5)`,
                  [
                    apotekId,
                    pm.id,
                    `Periode ${periodeLalu} belum ditutup sehingga laporan bulanan belum dapat diterbitkan.`,
                    periodeLalu,
                    waktuIso,
                  ],
                );
              }
            }
            return false;
          }

          // 3. Susun isi laporan jika baris belum ada
          if (!lapRes.rows[0]) {
            const omzetRes = await client.query<{
              jumlah_transaksi: string;
              total: string;
              tunai: string;
              qris: string;
              transfer: string;
            }>(
              `SELECT count(*) AS jumlah_transaksi,
                      COALESCE(SUM(total), 0) AS total,
                      COALESCE(SUM(total) FILTER (WHERE cara_bayar = 'tunai'), 0) AS tunai,
                      COALESCE(SUM(total) FILTER (WHERE cara_bayar = 'qris'), 0) AS qris,
                      COALESCE(SUM(total) FILTER (WHERE cara_bayar = 'transfer'), 0) AS transfer
               FROM penjualan
               WHERE waktu >= $1 AND waktu <= $2`,
              [`${awalPeriode}T00:00:00+07:00`, `${akhirPeriode}T23:59:59.999+07:00`],
            );
            const omz = omzetRes.rows[0]!;
            const marginKategori = await hitungMarginKategoriDiClient(
              client,
              awalPeriode,
              akhirPeriode,
            );
            const fastSlow = await hitungFastSlowDiClient(
              client,
              awalPeriode,
              akhirPeriode,
              20,
            );
            const ne = await hitungNearExpiredDiClient(client, apotekId);
            const defekta = await hitungDefektaDiClient(client);

            const isi = {
              periode: periodeLalu,
              apotek: { kode: apo.kode, nama: apo.nama },
              omzet: {
                total: keUangBulat(omz.total),
                jumlah_transaksi: Number(omz.jumlah_transaksi),
                per_cara_bayar: {
                  tunai: keUangBulat(omz.tunai),
                  qris: keUangBulat(omz.qris),
                  transfer: keUangBulat(omz.transfer),
                },
              },
              margin_kategori: marginKategori,
              fast_slow: { fast: fastSlow.fast, slow: fastSlow.slow },
              near_expired: {
                batas_hari: ne.batas_hari,
                mendekati: ne.mendekati,
                sudah_kedaluwarsa: ne.sudah_kedaluwarsa,
              },
              defekta,
            };

            await client.query(
              `INSERT INTO laporan_bulanan (apotek_id, periode, isi, status, dibuat_pada)
               VALUES ($1, $2, $3, 'tersimpan', $4)`,
              [apotekId, periodeLalu, JSON.stringify(isi), waktuIso],
            );
          }

          return true;
        });

        if (!siapTerbit) continue;

        // 4. Kirim notifikasi ke pemilik apotek + pemantau KADIN (di apotek penerima masing-masing)
        const penerimaRes = await pool.query<{ id: string; apotek_id: string }>(
          `SELECT id, apotek_id FROM pengguna
           WHERE apotek_id = $1 AND peran = 'pemilik' AND aktif = true
           UNION
           SELECT p.id, p.apotek_id FROM pengguna p
           JOIN akses_pantau ap ON ap.pengguna_id = p.id
           WHERE ap.apotek_id = $1 AND p.aktif = true`,
          [apotekId],
        );

        const terkirim = await kirimDenganUlang(async () => {
          for (const pen of penerimaRes.rows) {
            await pengirim({
              penerimaApotekId: Number(pen.apotek_id),
              penerimaId: Number(pen.id),
              apotekKode: apo.kode,
              apotekNama: apo.nama,
              periode: periodeLalu,
              waktuIso,
            });
          }
        });

        await withApotek(apotekId, async (client) => {
          if (terkirim) {
            await client.query(
              `UPDATE laporan_bulanan
               SET status = 'terbit', diterbitkan_pada = $1, percobaan_kirim = percobaan_kirim + 1
               WHERE periode = $2`,
              [waktuIso, periodeLalu],
            );
          } else {
            await client.query(
              `UPDATE laporan_bulanan
               SET status = 'belum_terkirim', percobaan_kirim = percobaan_kirim + 1
               WHERE periode = $1`,
              [periodeLalu],
            );
            await catatAuditGagal({
              apotekId,
              aksi: 'laporan_bulanan.kirim',
              entitas: 'laporan_bulanan',
              entitasId: periodeLalu,
              kodeGalat: 'GALAT_INTERNAL',
            });
          }
        });
      } catch {
        await catatAuditGagal({
          apotekId,
          aksi: 'job.gagal',
          entitas: 'laporan_bulanan',
          entitasId: periodeLalu,
          kodeGalat: 'GALAT_INTERNAL',
        });
      }
    }
  } finally {
    await lockClient.query(`SELECT pg_advisory_unlock(1002)`).catch(() => {});
    lockClient.release();
  }
}
