import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { bangunServer } from '../../src/server.js';
import { tutupSemuaPool } from '../../src/db/pool.js';
import { withApotek } from '../../src/db/withApotek.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';
import { beriAksesPantau } from '../../src/cli/pantauBeri.js';
import { jalankanJobNearExpired } from '../../src/jobs/nearExpired.js';
import { jalankanJobLaporanBulanan } from '../../src/jobs/laporanBulanan.js';
import { Jam } from '../../src/lib/jam.js';
import { resetBasisDataUji } from '../bantu/db.js';

describe('Fase 5: Laporan Operasional, Golongan Khusus CSV, Audit, dan Worker Jobs', () => {
  let app: Awaited<ReturnType<typeof bangunServer>>;

  beforeAll(async () => {
    app = await bangunServer();
  });

  beforeEach(async () => {
    Jam.atur('2026-11-10T06:00:00+07:00');
    await resetBasisDataUji();
  });

  afterEach(() => {
    Jam.reset();
  });

  afterAll(async () => {
    await app.close();
    await tutupSemuaPool();
  });

  async function masuk(u: string, s: string, ip: string) {
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/masuk',
      remoteAddress: ip,
      payload: { username: u, kata_sandi: s },
    });
    return r.json().data.token_akses as string;
  }

  it('Laporan operasional (omzet, margin, fast-slow, defekta, golongan khusus JSON & CSV BOM) dan jejak audit', async () => {
    await buatApotekDenganPemilik({
      kode: 'LAP01',
      nama: 'Apotek Laporan',
      pemilikUsername: 'pemilik_lap',
      pemilikNama: 'Pemilik Lap',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });
    let tokenP = await masuk('pemilik_lap', 'Rahasia123', '10.5.0.1');

    // Buat barang termasuk narkotika
    const brgNark = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/barang',
        headers: { authorization: `Bearer ${tokenP}` },
        payload: {
          kode: 'COD10',
          nama: 'Codeine 10 mg',
          kategori: 'generik',
          golongan: 'narkotika',
          satuan: 'tablet',
          harga_jual: 5000,
          stok_minimum: 20,
        },
      })
    ).json().data.id as number;

    const brgBebas = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/barang',
        headers: { authorization: `Bearer ${tokenP}` },
        payload: {
          kode: 'VITC',
          nama: 'Vitamin C',
          kategori: 'paten',
          golongan: 'bebas',
          satuan: 'strip',
          harga_jual: 10000,
          stok_minimum: 5,
        },
      })
    ).json().data.id as number;

    await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenP}` },
      payload: {
        tanggal: '2026-11-01',
        akun: [{ kode: '1110', saldo: 500_000 }],
        stok: [
          { barang_id: brgNark, nomor_batch: 'N-01', tanggal_kedaluwarsa: '2027-12-31', jumlah: 10, harga_beli: 2000 },
          { barang_id: brgBebas, nomor_batch: 'V-01', tanggal_kedaluwarsa: '2027-12-31', jumlah: 30, harga_beli: 6000 },
        ],
      },
    });

    // Buat kasir & jual 2 Codeine
    await app.inject({
      method: 'POST',
      url: '/api/v1/pengguna',
      headers: { authorization: `Bearer ${tokenP}` },
      payload: { username: 'kasir_lap', nama_lengkap: 'Kasir Lap', peran: 'kasir', kata_sandi_awal: 'Rahasia123' },
    });
    const tK1 = await masuk('kasir_lap', 'Rahasia123', '10.5.0.2');
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/ganti-sandi',
      headers: { authorization: `Bearer ${tK1}` },
      payload: { kata_sandi_lama: 'Rahasia123', kata_sandi_baru: 'KasirBaru1' },
    });
    const tokenK = await masuk('kasir_lap', 'KasirBaru1', '10.5.0.3');

    await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: { authorization: `Bearer ${tokenK}`, 'idempotency-key': crypto.randomUUID() },
      payload: { baris: [{ barang_id: brgNark, jumlah: 2 }], cara_bayar: 'tunai', uang_diterima: 10000 },
    });

    // Laporan omzet
    const omz = await app.inject({
      method: 'GET',
      url: '/api/v1/laporan/omzet?dari=2026-11-01&sampai=2026-11-30',
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(omz.statusCode).toBe(200);
    expect(omz.json().data.total.omzet).toBe(10000);
    expect(omz.json().data.total.hpp).toBe(4000);

    // Fast-slow (2 barang -> k=1 -> fast=[COD10], slow=[VITC], sedang=0)
    const fs = await app.inject({
      method: 'GET',
      url: '/api/v1/laporan/fast-slow',
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(fs.statusCode).toBe(200);
    expect(fs.json().data.fast.length).toBe(1);
    expect(fs.json().data.fast[0].kode).toBe('COD10');
    expect(fs.json().data.slow.length).toBe(1);
    expect(fs.json().data.slow[0].kode).toBe('VITC');

    // Defekta: Codeine stok 8 <= 20
    const def = await app.inject({
      method: 'GET',
      url: '/api/v1/laporan/defekta',
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(def.statusCode).toBe(200);
    expect(def.json().data.length).toBe(1);
    expect(def.json().data[0].jumlah_kurang).toBe(12);

    // Golongan khusus JSON & CSV BOM
    const gkJson = await app.inject({
      method: 'GET',
      url: '/api/v1/laporan/golongan-khusus?periode=2026-11&format=json',
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(gkJson.statusCode).toBe(200);
    expect(gkJson.json().data.baris[0]).toMatchObject({
      kode: 'COD10',
      stok_awal: 0,
      masuk: 10,
      keluar_penjualan: 2,
      keluar_pengurangan: 0,
      stok_akhir: 8,
    });

    const gkCsv = await app.inject({
      method: 'GET',
      url: '/api/v1/laporan/golongan-khusus?periode=2026-11&format=csv',
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(gkCsv.statusCode).toBe(200);
    expect(gkCsv.headers['content-type']).toContain('text/csv');
    expect(gkCsv.body.startsWith('\uFEFFkode,nama,golongan')).toBe(true);
    expect(gkCsv.body).toContain('\r\n');

    // Jejak audit
    const auditRes = await app.inject({
      method: 'GET',
      url: '/api/v1/jejak-audit',
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(auditRes.statusCode).toBe(200);
    expect(auditRes.json().data.length).toBeGreaterThan(0);
  });

  it('UC-17/19 Jobs: nearExpired (nol tanpa notif, terlewat catch-up, retry gagal 3x, idempoten) & laporanBulanan + pantau', async () => {
    const a1 = await buatApotekDenganPemilik({
      kode: 'JOB01',
      nama: 'Apotek Job 1',
      pemilikUsername: 'pemilik_j1',
      pemilikNama: 'Pemilik J1',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });
    await buatApotekDenganPemilik({
      kode: 'JOB02',
      nama: 'Apotek Job 2',
      pemilikUsername: 'pemilik_j2',
      pemilikNama: 'Pemilik J2',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });
    await beriAksesPantau('pemilik_j2', 'JOB01');

    // 1. Hari 1 (2026-11-10): tidak ada batch -> nearExpired tercatat terkirim tanpa notifikasi
    await jalankanJobNearExpired();
    const pemeriksaan1 = await withApotek(a1.apotekId, async (c) => {
      const r = await c.query<{ status: string; jumlah_batch: number }>(
        `SELECT status, jumlah_batch FROM pemeriksaan_near_expired`,
      );
      const n = await c.query(`SELECT 1 FROM notifikasi`);
      return { rows: r.rows, notifCount: n.rowCount };
    });
    expect(pemeriksaan1.rows).toEqual([{ status: 'terkirim', jumlah_batch: 0 }]);
    expect(pemeriksaan1.notifCount).toBe(0);

    // 2. Lompat ke 2026-11-13 -> 2026-11-11 & 2026-11-12 tercatat 'terlewat'
    // Tambahkan 1 batch mendekati expired untuk 2026-11-13, suntik pengirim gagal -> status 'belum_terkirim'
    let tokenP1 = await masuk('pemilik_j1', 'Rahasia123', '10.5.1.1');
    const brgId = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/barang',
        headers: { authorization: `Bearer ${tokenP1}` },
        payload: {
          kode: 'NE01',
          nama: 'Obat NE',
          kategori: 'generik',
          golongan: 'bebas',
          satuan: 'strip',
          harga_jual: 5000,
        },
      })
    ).json().data.id as number;
    await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenP1}` },
      payload: {
        tanggal: '2026-11-10',
        akun: [{ kode: '1110', saldo: 100_000 }],
        stok: [{ barang_id: brgId, nomor_batch: 'NE-1', tanggal_kedaluwarsa: '2026-11-25', jumlah: 5, harga_beli: 2000 }],
      },
    });

    Jam.atur('2026-11-13T07:00:00+07:00');
    await jalankanJobNearExpired(async () => {
      throw new Error('SIMULASI_KIRIM_GAGAL');
    });

    const pemeriksaan2 = await withApotek(a1.apotekId, async (c) => {
      const r = await c.query<{ tanggal: Date | string; status: string }>(
        `SELECT tanggal, status FROM pemeriksaan_near_expired ORDER BY tanggal ASC`,
      );
      return r.rows.map((x) => ({ tgl: Jam.keTanggalWib(x.tanggal), status: x.status }));
    });
    expect(pemeriksaan2).toEqual([
      { tgl: '2026-11-10', status: 'terkirim' },
      { tgl: '2026-11-11', status: 'terlewat' },
      { tgl: '2026-11-12', status: 'terlewat' },
      { tgl: '2026-11-13', status: 'belum_terkirim' },
    ]);

    // Jalankan ulang dengan pengirim normal -> status menjadi 'terkirim', jalankan lagi -> tidak duplikat
    await jalankanJobNearExpired();
    await jalankanJobNearExpired();
    const notifNE = await withApotek(a1.apotekId, async (c) => {
      const r = await c.query(`SELECT 1 FROM notifikasi WHERE jenis = 'near_expired'`);
      return r.rowCount;
    });
    expect(notifNE).toBe(1);

    // 3. Laporan bulanan pada 2026-12-03: periode 2026-11 belum ditutup -> notifikasi periode_belum_ditutup max 1/hari
    Jam.atur('2026-12-03T06:30:00+07:00');
    await jalankanJobLaporanBulanan();
    await jalankanJobLaporanBulanan();
    const notifBelumTutup = await withApotek(a1.apotekId, async (c) => {
      const r = await c.query(`SELECT 1 FROM notifikasi WHERE jenis = 'periode_belum_ditutup'`);
      return r.rowCount;
    });
    expect(notifBelumTutup).toBe(1);

    // Tutup periode 2026-11 -> jalankan job -> laporan terbit & pemantau (JOB02) menerima notifikasi
    tokenP1 = await masuk('pemilik_j1', 'Rahasia123', '10.5.1.2');
    await app.inject({
      method: 'POST',
      url: '/api/v1/periode/2026-11/tutup',
      headers: { authorization: `Bearer ${tokenP1}` },
    });

    await jalankanJobLaporanBulanan();
    const tokenP2 = await masuk('pemilik_j2', 'Rahasia123', '10.5.1.3');
    const lapPantau = await app.inject({
      method: 'GET',
      url: `/api/v1/laporan-bulanan/2026-11?apotek_id=${a1.apotekId}`,
      headers: { authorization: `Bearer ${tokenP2}` },
    });
    expect(lapPantau.statusCode).toBe(200);
    expect(lapPantau.json().data.status).toBe('terbit');

    const notifP2 = await app.inject({
      method: 'GET',
      url: '/api/v1/notifikasi',
      headers: { authorization: `Bearer ${tokenP2}` },
    });
    expect(notifP2.json().data.some((n: { jenis: string }) => n.jenis === 'laporan_bulanan_terbit')).toBe(
      true,
    );
  });
});
