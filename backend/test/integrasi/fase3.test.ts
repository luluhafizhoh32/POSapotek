import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { bangunServer } from '../../src/server.js';
import { getPool, tutupSemuaPool } from '../../src/db/pool.js';
import { withApotek } from '../../src/db/withApotek.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';
import { Jam } from '../../src/lib/jam.js';
import { penjualanHooksUji } from '../../src/modul/penjualan/layanan.js';
import { resetBasisDataUji } from '../bantu/db.js';
import { getEnv } from '../../src/config/env.js';

describe('Fase 3: Pembayaran Nontunai, Penjualan (FEFO), dan Penerimaan Barang', () => {
  let app: Awaited<ReturnType<typeof bangunServer>>;

  beforeAll(async () => {
    app = await bangunServer();
  });

  beforeEach(async () => {
    Jam.atur('2026-11-03T09:00:00+07:00');
    penjualanHooksUji.setelahKurangiStok = null;
    await resetBasisDataUji();
  });

  afterEach(() => {
    penjualanHooksUji.setelahKurangiStok = null;
    Jam.reset();
  });

  afterAll(async () => {
    await app.close();
    await tutupSemuaPool();
  });

  async function siapkanApotekDanPengguna() {
    const { apotekId } = await buatApotekDenganPemilik({
      kode: 'UJI03',
      nama: 'Apotek Fase 3',
      pemilikUsername: 'pemilik3',
      pemilikNama: 'Pemilik 3',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });

    let ipSeq = 1;
    const masuk = async (u: string, s: string) => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/masuk',
        remoteAddress: `10.3.0.${ipSeq++}`,
        payload: { username: u, kata_sandi: s },
      });
      return r.json().data.token_akses as string;
    };

    const tokenPemilik = await masuk('pemilik3', 'Rahasia123');

    const buatUser = async (username: string, peran: string) => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/pengguna',
        headers: { authorization: `Bearer ${tokenPemilik}` },
        payload: { username, nama_lengkap: username, peran, kata_sandi_awal: 'Rahasia123' },
      });
      const t1 = await masuk(username, 'Rahasia123');
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/ganti-sandi',
        headers: { authorization: `Bearer ${t1}` },
        payload: { kata_sandi_lama: 'Rahasia123', kata_sandi_baru: 'SandiBaru1' },
      });
      return masuk(username, 'SandiBaru1');
    };

    const tokenGudang = await buatUser('gudang3', 'staf_gudang');
    const tokenKasir = await buatUser('kasir3', 'kasir');
    const tokenKasir2 = await buatUser('kasir3b', 'kasir');

    return { apotekId, tokenPemilik, tokenGudang, tokenKasir, tokenKasir2 };
  }

  async function unggahFaktur(tokenGudang: string) {
    const boundary = '----FormBoundaryFaktur';
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const bodyMultipart = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="jenis"\r\n\r\nfaktur\r\n`),
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="berkas"; filename="faktur.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      pngBytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/lampiran',
      headers: {
        authorization: `Bearer ${tokenGudang}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: bodyMultipart,
    });
    return res.json().data.id as string;
  }

  it('UC-05: Penerimaan barang, cek faktur ganda, batch ada & gabung, dan jurnal otomatis', async () => {
    const { apotekId, tokenPemilik, tokenGudang } = await siapkanApotekDanPengguna();

    const pbfRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pemasok',
      headers: { authorization: `Bearer ${tokenGudang}` },
      payload: { kode: 'PBF1', nama: 'PT PBF Satu' },
    });
    const pbfId = pbfRes.json().data.id as number;

    const brgRes = await app.inject({
      method: 'POST',
      url: '/api/v1/barang',
      headers: { authorization: `Bearer ${tokenGudang}` },
      payload: {
        kode: 'F',
        nama: 'Obat F',
        kategori: 'paten',
        golongan: 'bebas',
        satuan: 'strip',
        harga_jual: 15000,
      },
    });
    const brgId = brgRes.json().data.id as number;
    const lamp1 = await unggahFaktur(tokenGudang);

    // Tanggal kedaluwarsa lampau -> 422 TANGGAL_KEDALUWARSA_LEWAT
    const expLewat = await app.inject({
      method: 'POST',
      url: '/api/v1/penerimaan',
      headers: {
        authorization: `Bearer ${tokenGudang}`,
        'idempotency-key': crypto.randomUUID(),
      },
      payload: {
        pemasok_id: pbfId,
        nomor_faktur: 'inv-001',
        tanggal_faktur: '2026-11-03',
        lampiran_id: lamp1,
        baris: [
          {
            barang_id: brgId,
            nomor_batch: 'F-01',
            tanggal_kedaluwarsa: '2026-10-31',
            jumlah: 600,
            harga_beli: 10000,
            gabung_ke_batch_ada: false,
          },
        ],
      },
    });
    expect(expLewat.statusCode).toBe(422);
    expect(expLewat.json().galat.kode).toBe('TANGGAL_KEDALUWARSA_LEWAT');

    // Penerimaan valid (Skenario 12.2 langkah 2)
    const kunci1 = crypto.randomUUID();
    const ter1 = await app.inject({
      method: 'POST',
      url: '/api/v1/penerimaan',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': kunci1 },
      payload: {
        pemasok_id: pbfId,
        nomor_faktur: '  inv-001  ',
        tanggal_faktur: '2026-11-03',
        lampiran_id: lamp1,
        baris: [
          {
            barang_id: brgId,
            nomor_batch: 'F-01',
            tanggal_kedaluwarsa: '2028-06-30',
            jumlah: 600,
            harga_beli: 10000,
            gabung_ke_batch_ada: false,
          },
        ],
      },
    });
    expect(ter1.statusCode).toBe(201);
    expect(ter1.json().data.nomor_faktur).toBe('INV-001');
    expect(ter1.json().data.total).toBe(6_000_000);

    // Replay idempoten -> 200 + header Idempotent-Replay
    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/penerimaan',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': kunci1 },
      payload: {
        pemasok_id: pbfId,
        nomor_faktur: '  inv-001  ',
        tanggal_faktur: '2026-11-03',
        lampiran_id: lamp1,
        baris: [
          {
            barang_id: brgId,
            nomor_batch: 'F-01',
            tanggal_kedaluwarsa: '2028-06-30',
            jumlah: 600,
            harga_beli: 10000,
            gabung_ke_batch_ada: false,
          },
        ],
      },
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.headers['idempotent-replay']).toBe('true');

    // Faktur sama lagi -> 409 FAKTUR_SUDAH_ADA
    const lamp2 = await unggahFaktur(tokenGudang);
    const fakGanda = await app.inject({
      method: 'POST',
      url: '/api/v1/penerimaan',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        pemasok_id: pbfId,
        nomor_faktur: 'INV-001',
        tanggal_faktur: '2026-11-03',
        lampiran_id: lamp2,
        baris: [
          {
            barang_id: brgId,
            nomor_batch: 'F-02',
            tanggal_kedaluwarsa: '2028-06-30',
            jumlah: 10,
            harga_beli: 10000,
            gabung_ke_batch_ada: false,
          },
        ],
      },
    });
    expect(fakGanda.statusCode).toBe(409);
    expect(fakGanda.json().galat.kode).toBe('FAKTUR_SUDAH_ADA');

    // Batch sudah ada tanpa gabung -> 409 BATCH_SUDAH_ADA, lalu gabung_ke_batch_ada=true berhasil
    const batchAda = await app.inject({
      method: 'POST',
      url: '/api/v1/penerimaan',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        pemasok_id: pbfId,
        nomor_faktur: 'INV-002',
        tanggal_faktur: '2026-11-03',
        lampiran_id: lamp2,
        baris: [
          {
            barang_id: brgId,
            nomor_batch: 'F-01',
            tanggal_kedaluwarsa: '2028-06-30',
            jumlah: 50,
            harga_beli: 10000,
            gabung_ke_batch_ada: false,
          },
        ],
      },
    });
    expect(batchAda.statusCode).toBe(409);
    expect(batchAda.json().galat.kode).toBe('BATCH_SUDAH_ADA');

    const batchGabung = await app.inject({
      method: 'POST',
      url: '/api/v1/penerimaan',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        pemasok_id: pbfId,
        nomor_faktur: 'INV-002',
        tanggal_faktur: '2026-11-03',
        lampiran_id: lamp2,
        baris: [
          {
            barang_id: brgId,
            nomor_batch: 'F-01',
            tanggal_kedaluwarsa: '2028-06-30',
            jumlah: 50,
            harga_beli: 10000,
            gabung_ke_batch_ada: true,
          },
        ],
      },
    });
    expect(batchGabung.statusCode).toBe(201);

    // Cek saldo 1140 dan 2110
    const ns = await app.inject({
      method: 'GET',
      url: '/api/v1/laporan-keuangan/neraca-saldo?periode=2026-11',
      headers: { authorization: `Bearer ${tokenPemilik}` },
    });
    expect(ns.json().data.total_debit).toBe(6_500_000);
    expect(ns.json().data.total_kredit).toBe(6_500_000);
    expect(apotekId).toBeGreaterThan(0);
  });

  it('UC-01: FEFO lintas 2 batch, batch kedaluwarsa dilewati, kasir tanpa HPP, nontunai/webhook, rollback, dan idempotensi', async () => {
    const { apotekId, tokenPemilik, tokenKasir, tokenKasir2 } = await siapkanApotekDanPengguna();

    const brgA = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/barang',
        headers: { authorization: `Bearer ${tokenPemilik}` },
        payload: {
          kode: 'A',
          nama: 'Obat A',
          kategori: 'generik',
          golongan: 'bebas',
          satuan: 'strip',
          harga_jual: 10000,
        },
      })
    ).json().data.id as number;

    const brgExp = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/barang',
        headers: { authorization: `Bearer ${tokenPemilik}` },
        payload: {
          kode: 'EXP',
          nama: 'Obat Exp',
          kategori: 'generik',
          golongan: 'bebas',
          satuan: 'strip',
          harga_jual: 5000,
        },
      })
    ).json().data.id as number;

    // Isi stok awal via saldo awal:
    // A: batch A-EXP (kedaluwarsa 2026-10-31, stok 5, beli 4000) -> harus dilewati!
    //    batch A-01 (2027-01-31, stok 3, beli 6000)
    //    batch A-02 (2027-06-30, stok 10, beli 7000)
    // EXP: batch EXP-01 (2026-10-31, stok 5, beli 3000)
    await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        tanggal: '2026-11-02',
        akun: [{ kode: '1110', saldo: 1_000_000 }],
        stok: [
          { barang_id: brgA, nomor_batch: 'A-EXP', tanggal_kedaluwarsa: '2026-10-31', jumlah: 5, harga_beli: 4000 },
          { barang_id: brgA, nomor_batch: 'A-01', tanggal_kedaluwarsa: '2027-01-31', jumlah: 3, harga_beli: 6000 },
          { barang_id: brgA, nomor_batch: 'A-02', tanggal_kedaluwarsa: '2027-06-30', jumlah: 10, harga_beli: 7000 },
          { barang_id: brgExp, nomor_batch: 'EXP-01', tanggal_kedaluwarsa: '2026-10-31', jumlah: 5, harga_beli: 3000 },
        ],
      },
    });

    // Pratinjau semua_batch_kedaluwarsa
    const prev = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan/pratinjau',
      headers: { authorization: `Bearer ${tokenKasir}` },
      payload: {
        baris: [
          { barang_id: brgA, jumlah: 5 },
          { barang_id: brgExp, jumlah: 1 },
        ],
      },
    });
    expect(prev.statusCode).toBe(200);
    expect(prev.json().data.dapat_disimpan).toBe(false);
    expect(prev.json().data.baris[0].status).toBe('ok');
    expect(prev.json().data.baris[0].stok_tersedia).toBe(13);
    expect(prev.json().data.baris[1].status).toBe('semua_batch_kedaluwarsa');

    // Suntik galat di tengah transaksi -> harus rollback total + catat audit gagal
    penjualanHooksUji.setelahKurangiStok = () => {
      throw new Error('SIMULASI_GALAT_TENGAH');
    };
    const gagalTengah = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: { authorization: `Bearer ${tokenKasir}`, 'idempotency-key': crypto.randomUUID() },
      payload: { baris: [{ barang_id: brgA, jumlah: 5 }], cara_bayar: 'tunai', uang_diterima: 50000 },
    });
    expect(gagalTengah.statusCode).toBe(500);
    penjualanHooksUji.setelahKurangiStok = null;

    // Pastikan stok A-01 masih 3 (rollback bersih)
    const cekStok = await withApotek(apotekId, async (c) => {
      const r = await c.query<{ stok: number }>(`SELECT stok FROM batch_barang WHERE nomor_batch = 'A-01'`);
      return r.rows[0]?.stok;
    });
    expect(cekStok).toBe(3);

    // Penjualan FEFO lintas 2 batch: beli 5 A -> 3 dari A-01 (@6000) + 2 dari A-02 (@7000), HPP = 32.000
    const jual1 = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: { authorization: `Bearer ${tokenKasir}`, 'idempotency-key': crypto.randomUUID() },
      payload: { baris: [{ barang_id: brgA, jumlah: 5 }], cara_bayar: 'tunai', uang_diterima: 60000 },
    });
    expect(jual1.statusCode).toBe(201);
    const d1 = jual1.json().data;
    expect(d1.total).toBe(50000);
    expect(d1.kembalian).toBe(10000);
    expect(d1.total_hpp).toBeUndefined(); // Kasir tidak boleh melihat HPP
    expect(d1.baris[0].pengambilan.length).toBe(2);
    expect(d1.baris[0].pengambilan[0].nomor_batch).toBe('A-01');
    expect(d1.baris[0].pengambilan[0].jumlah).toBe(3);
    expect(d1.baris[0].pengambilan[1].nomor_batch).toBe('A-02');
    expect(d1.baris[0].pengambilan[1].jumlah).toBe(2);

    // Pemilik melihat HPP = 32.000
    const detailPemilik = await app.inject({
      method: 'GET',
      url: `/api/v1/penjualan/${d1.id}`,
      headers: { authorization: `Bearer ${tokenPemilik}` },
    });
    expect(detailPemilik.statusCode).toBe(200);
    expect(detailPemilik.json().data.total_hpp).toBe(32000);

    // Kasir lain melihat penjualan kasir 1 -> 404
    const kasirLain = await app.inject({
      method: 'GET',
      url: `/api/v1/penjualan/${d1.id}`,
      headers: { authorization: `Bearer ${tokenKasir2}` },
    });
    expect(kasirLain.statusCode).toBe(404);

    // Nontunai + Webhook
    const payRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pembayaran-nontunai',
      headers: { authorization: `Bearer ${tokenKasir}` },
      payload: { cara: 'qris', jumlah: 20000 },
    });
    expect(payRes.statusCode).toBe(201);
    const payData = payRes.json().data;

    // Webhook HMAC
    const payloadWebhook = JSON.stringify({
      referensi: payData.referensi,
      status: 'dibayar',
      jumlah: 20000,
    });
    const sig = crypto
      .createHmac('sha256', getEnv().PEMBAYARAN_WEBHOOK_SECRET)
      .update(payloadWebhook)
      .digest('hex');

    const whRes = await app.inject({
      method: 'POST',
      url: '/api/v1/webhook/pembayaran',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: payloadWebhook,
    });
    expect(whRes.statusCode).toBe(200);
    expect(whRes.json().data.status).toBe('dibayar');

    const jualQris = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: { authorization: `Bearer ${tokenKasir}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        baris: [{ barang_id: brgA, jumlah: 2 }],
        cara_bayar: 'qris',
        pembayaran_nontunai_id: payData.id,
      },
    });
    expect(jualQris.statusCode).toBe(201);
  });

  it('UC-01 Konkurensi: 20 penjualan paralel atas satu batch tidak membuat stok negatif atau deadlock', async () => {
    const { apotekId, tokenPemilik, tokenKasir } = await siapkanApotekDanPengguna();

    const brgId = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/barang',
        headers: { authorization: `Bearer ${tokenPemilik}` },
        payload: {
          kode: 'PAR1',
          nama: 'Obat Paralel',
          kategori: 'generik',
          golongan: 'bebas',
          satuan: 'strip',
          harga_jual: 10000,
        },
      })
    ).json().data.id as number;

    // Stok awal 10
    await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        tanggal: '2026-11-02',
        akun: [{ kode: '1110', saldo: 100_000 }],
        stok: [
          { barang_id: brgId, nomor_batch: 'P-01', tanggal_kedaluwarsa: '2027-12-31', jumlah: 10, harga_beli: 5000 },
        ],
      },
    });

    const reqs = Array.from({ length: 20 }, () =>
      app.inject({
        method: 'POST',
        url: '/api/v1/penjualan',
        headers: { authorization: `Bearer ${tokenKasir}`, 'idempotency-key': crypto.randomUUID() },
        payload: {
          baris: [{ barang_id: brgId, jumlah: 1 }],
          cara_bayar: 'tunai',
          uang_diterima: 10000,
        },
      }),
    );

    const hasil = await Promise.all(reqs);
    const sukses = hasil.filter((r) => r.statusCode === 201);
    const ditolak = hasil.filter((r) => r.statusCode === 422);

    expect(sukses.length).toBe(10);
    expect(ditolak.length).toBe(10);

    const stokAkhir = await withApotek(apotekId, async (c) => {
      const r = await c.query<{ stok: number }>(`SELECT stok FROM batch_barang WHERE barang_id = $1`, [brgId]);
      return r.rows[0]?.stok;
    });
    expect(stokAkhir).toBe(0);

    // Pastikan tidak ada baris negatif di pool
    const neg = await getPool().query(`SELECT 1 FROM batch_barang WHERE stok < 0`);
    expect(neg.rowCount).toBe(0);
  });
});
