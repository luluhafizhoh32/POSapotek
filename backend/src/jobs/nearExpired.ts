import { DateTime } from 'luxon';
import { getPool } from '../db/pool.js';
import { withApotek } from '../db/withApotek.js';
import { catatAuditGagal } from '../lib/audit.js';
import { Jam, ZONA_BISNIS } from '../lib/jam.js';
import { formatRupiah } from '../lib/uang.js';
import { hitungNearExpiredDiClient } from '../modul/nearExpired/layanan.js';

export type PengirimNotifikasi = (
  client: import('pg').PoolClient,
  params: {
    apotekId: number;
    penerimaIds: number[];
    judul: string;
    isi: string;
    waktuIso: string;
  },
) => Promise<void>;

const pengirimDefault: PengirimNotifikasi = async (client, params) => {
  for (const pid of params.penerimaIds) {
    await client.query(
      `INSERT INTO notifikasi
        (apotek_id, penerima_id, jenis, judul, isi, tautan_tipe, dibuat_pada)
       VALUES ($1, $2, 'near_expired', $3, $4, 'near_expired', $5)`,
      [params.apotekId, pid, params.judul, params.isi, params.waktuIso],
    );
  }
};

function jeda(ms: number): Promise<void> {
  if (process.env['NODE_ENV'] === 'test') return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function kirimDenganUlang(
  fn: () => Promise<void>,
): Promise<boolean> {
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

export async function jalankanJobNearExpired(
  pengirim: PengirimNotifikasi = pengirimDefault,
): Promise<void> {
  const pool = getPool();
  const lockClient = await pool.connect();

  try {
    const lockRes = await lockClient.query<{ ok: boolean }>(
      `SELECT pg_try_advisory_lock(1001) AS ok`,
    );
    if (!lockRes.rows[0]?.ok) return;

    const apotekRes = await pool.query<{ id: string }>(
      `SELECT id FROM apotek WHERE aktif = true ORDER BY id ASC`,
    );

    const sekarang = Jam.sekarang();
    const hariIni = sekarang.toFormat('yyyy-MM-dd');
    const waktuIso = sekarang.toISO()!;
    const terlambat = sekarang.hour > 6 || (sekarang.hour === 6 && sekarang.minute > 30);

    for (const row of apotekRes.rows) {
      const apotekId = Number(row.id);
      try {
        await withApotek(apotekId, async (client) => {
          // 1. Terlewat (maks 7 hari terakhir)
          const lastRes = await client.query<{ tanggal: Date | string }>(
            `SELECT tanggal FROM pemeriksaan_near_expired ORDER BY tanggal DESC LIMIT 1`,
          );
          if (lastRes.rows[0]) {
            const lastStr = Jam.keTanggalWib(lastRes.rows[0].tanggal);
            const lastDt = DateTime.fromISO(lastStr, { zone: ZONA_BISNIS });
            const todayDt = DateTime.fromISO(hariIni, { zone: ZONA_BISNIS });
            const diffDays = Math.floor(todayDt.diff(lastDt, 'days').days);
            if (diffDays > 1) {
              const startOffset = Math.max(1, diffDays - 7);
              for (let d = startOffset; d < diffDays; d++) {
                const tglTerlewat = lastDt.plus({ days: d }).toFormat('yyyy-MM-dd');
                await client.query(
                  `INSERT INTO pemeriksaan_near_expired
                    (apotek_id, tanggal, jumlah_batch, jumlah_sudah_kedaluwarsa, status, terlambat, dibuat_pada)
                   VALUES ($1, $2, 0, 0, 'terlewat', true, $3)
                   ON CONFLICT (apotek_id, tanggal) DO NOTHING`,
                  [apotekId, tglTerlewat, waktuIso],
                );
              }
            }
          }

          // 2. Cek baris hari ini
          const todayRes = await client.query<{ id: string; status: string }>(
            `SELECT id, status FROM pemeriksaan_near_expired WHERE tanggal = $1 FOR UPDATE`,
            [hariIni],
          );

          let pemeriksaanId: number;
          let neData: Awaited<ReturnType<typeof hitungNearExpiredDiClient>>;

          if (todayRes.rows[0]) {
            if (todayRes.rows[0].status === 'terkirim') {
              return;
            }
            pemeriksaanId = Number(todayRes.rows[0].id);
            neData = await hitungNearExpiredDiClient(client, apotekId);
          } else {
            // 3-4. Hitung dan sisipkan baris hari ini
            neData = await hitungNearExpiredDiClient(client, apotekId);
            const jmlMendekati = neData.ringkasan.jumlah_batch_mendekati;
            const jmlExp = neData.ringkasan.jumlah_batch_kedaluwarsa;

            if (jmlMendekati === 0 && jmlExp === 0) {
              await client.query(
                `INSERT INTO pemeriksaan_near_expired
                  (apotek_id, tanggal, jumlah_batch, jumlah_sudah_kedaluwarsa, status, terlambat, dibuat_pada)
                 VALUES ($1, $2, 0, 0, 'terkirim', $3, $4)`,
                [apotekId, hariIni, terlambat, waktuIso],
              );
              return;
            }

            const ins = await client.query<{ id: string }>(
              `INSERT INTO pemeriksaan_near_expired
                (apotek_id, tanggal, jumlah_batch, jumlah_sudah_kedaluwarsa, status, terlambat, dibuat_pada)
               VALUES ($1, $2, $3, $4, 'belum_terkirim', $5, $6)
               RETURNING id`,
              [apotekId, hariIni, jmlMendekati, jmlExp, terlambat, waktuIso],
            );
            pemeriksaanId = Number(ins.rows[0]!.id);
          }

          // 5. Kirim notifikasi ke staf_gudang & pemilik aktif
          const pRes = await client.query<{ id: string }>(
            `SELECT id FROM pengguna
             WHERE apotek_id = $1 AND peran IN ('staf_gudang', 'pemilik') AND aktif = true`,
            [apotekId],
          );
          const penerimaIds = pRes.rows.map((p) => Number(p.id));
          const isi = `${neData.ringkasan.jumlah_batch_mendekati} batch mendekati kedaluwarsa (≤ ${neData.batas_hari} hari), ${neData.ringkasan.jumlah_batch_kedaluwarsa} batch sudah kedaluwarsa. Nilai berisiko ${formatRupiah(neData.ringkasan.nilai_berisiko)}.`;

          const terkirim = await kirimDenganUlang(() =>
            pengirim(client, {
              apotekId,
              penerimaIds,
              judul: 'Peringatan kedaluwarsa',
              isi,
              waktuIso,
            }),
          );

          if (terkirim) {
            await client.query(
              `UPDATE pemeriksaan_near_expired SET status = 'terkirim' WHERE id = $1`,
              [pemeriksaanId],
            );
          } else {
            await catatAuditGagal({
              apotekId,
              aksi: 'near_expired.kirim',
              entitas: 'pemeriksaan_near_expired',
              entitasId: pemeriksaanId,
              kodeGalat: 'GALAT_INTERNAL',
            });
          }
        });
      } catch {
        await catatAuditGagal({
          apotekId,
          aksi: 'job.gagal',
          entitas: 'pemeriksaan_near_expired',
          kodeGalat: 'GALAT_INTERNAL',
        });
      }
    }
  } finally {
    await lockClient.query(`SELECT pg_advisory_unlock(1001)`).catch(() => {});
    lockClient.release();
  }
}
