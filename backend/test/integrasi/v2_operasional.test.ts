import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { bangunServer } from '../../src/server.js';
import { getPool, tutupSemuaPool } from '../../src/db/pool.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';

describe('PharmaPOS v2.1: Resep Golongan Khusus, SP + TTD APA, Utang AP, Buku Besar, dan Asisten AI', () => {
  let app: FastifyInstance;
  let apotekId = 0;
  let tokenPemilik = '';
  let tokenKasir = '';
  let tokenGudang = '';
  let tokenApa = '';
  let pemasokId = 0;
  let barangPsikoId = 0;

  beforeAll(async () => {
    app = await bangunServer();
    const kodeUnik = `V2${Date.now().toString().slice(-6)}`;
    const dibuat = await buatApotekDenganPemilik({
      kode: kodeUnik,
      nama: 'Apotek Uji v2.1',
      pemilikUsername: `own_${kodeUnik.toLowerCase()}`,
      pemilikNama: 'Pemilik v2',
      pemilikSandi: 'Rahasia1234',
      wajibGantiSandi: false,
    });
    apotekId = dibuat.apotekId;

    const hash = await argon2.hash('Rahasia1234', { type: argon2.argon2id });
    for (const [prefix, peran] of [
      ['kasir', 'kasir'],
      ['gudang', 'staf_gudang'],
      ['apa', 'apa'],
    ] as const) {
      await getPool().query(
        `INSERT INTO pengguna (apotek_id, username, nama_lengkap, kata_sandi_hash, peran, wajib_ganti_sandi)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [apotekId, `${prefix}_${kodeUnik.toLowerCase()}`, `User ${prefix}`, hash, peran],
      );
    }

    const login = async (username: string) => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/masuk',
        payload: { username, kata_sandi: 'Rahasia1234' },
      });
      expect(r.statusCode).toBe(200);
      return r.json().data.token_akses as string;
    };

    tokenPemilik = await login(`own_${kodeUnik.toLowerCase()}`);
    tokenKasir = await login(`kasir_${kodeUnik.toLowerCase()}`);
    tokenGudang = await login(`gudang_${kodeUnik.toLowerCase()}`);
    tokenApa = await login(`apa_${kodeUnik.toLowerCase()}`);

    // Seed 1 pemasok + 1 barang psikotropika + batch
    const pRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pemasok',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: { kode: 'PBF99', nama: 'PT PBF Uji v2' },
    });
    expect(pRes.statusCode).toBe(201);
    pemasokId = pRes.json().data.id;

    const bRes = await app.inject({
      method: 'POST',
      url: '/api/v1/barang',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        kode: 'PSI01',
        nama: 'Alprazolam 0.5 mg',
        kategori: 'generik',
        golongan: 'psikotropika',
        satuan: 'strip',
        harga_jual: 25000,
        stok_minimum: 5,
        pemasok_utama_id: pemasokId,
      },
    });
    expect(bRes.statusCode).toBe(201);
    barangPsikoId = bRes.json().data.id;

    // Masukkan saldo awal stok batch psikotropika (10 strip) + kas
    const saRes = await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        tanggal: '2026-11-01',
        akun: [
          { kode: '1110', saldo: 5000000 },
          { kode: '1120', saldo: 10000000 },
          { kode: '2110', saldo: 1000000 },
        ],
        stok: [
          {
            barang_id: barangPsikoId,
            nomor_batch: 'PSI-B1',
            tanggal_kedaluwarsa: '2028-12-31',
            jumlah: 10,
            harga_beli: 15000,
          },
        ],
      },
    });
    expect(saRes.statusCode).toBe(201);
  });

  afterAll(async () => {
    await app.close();
    await tutupSemuaPool();
  });

  it('Skenario #10: Penjualan psikotropika tanpa resep ditolak, dengan resep berhasil', async () => {
    const gagal = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: {
        authorization: `Bearer ${tokenKasir}`,
        'idempotency-key': crypto.randomUUID(),
      },
      payload: {
        baris: [{ barang_id: barangPsikoId, jumlah: 1 }],
        cara_bayar: 'tunai',
        uang_diterima: 25000,
      },
    });
    expect(gagal.statusCode).toBe(400);

    const sukses = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: {
        authorization: `Bearer ${tokenKasir}`,
        'idempotency-key': crypto.randomUUID(),
      },
      payload: {
        baris: [{ barang_id: barangPsikoId, jumlah: 2 }],
        cara_bayar: 'tunai',
        uang_diterima: 50000,
        resep: {
          nomor_resep: 'RSP-2026-001',
          tanggal_resep: '2026-11-22',
          nama_dokter: 'dr. Rina Kusuma, Sp.PD',
          nama_pasien: 'Pasien Uji',
        },
      },
    });
    expect(sukses.statusCode).toBe(201);
  });

  it('Skenario #1 & #9: Surat Pesanan + TTD APA, Utang Usaha bayar sebagian, dan Buku Besar', async () => {
    const spRes = await app.inject({
      method: 'POST',
      url: '/api/v1/surat-pesanan',
      headers: { authorization: `Bearer ${tokenGudang}` },
      payload: {
        pemasok_id: pemasokId,
        golongan: 'psikotropika',
        baris: [{ barang_id: barangPsikoId, jumlah: 10 }],
      },
    });
    expect(spRes.statusCode).toBe(201);
    const spId = spRes.json().data.id;

    const ttdRes = await app.inject({
      method: 'POST',
      url: `/api/v1/surat-pesanan/${spId}/tandatangani`,
      headers: { authorization: `Bearer ${tokenApa}` },
    });
    expect(ttdRes.statusCode).toBe(200);
    expect(ttdRes.json().data.status).toBe('ditandatangani');

    // Utang usaha + bayar sebagian -> jurnal otomatis & buku besar
    const utangRes = await app.inject({
      method: 'POST',
      url: '/api/v1/utang-pemasok',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        pemasok_id: pemasokId,
        nomor_faktur: 'FKT-AP-001',
        tanggal_faktur: '2026-11-10',
        jatuh_tempo: '2026-12-10',
        total: 1000000,
      },
    });
    expect(utangRes.statusCode).toBe(201);
    const utangId = utangRes.json().data.id;

    const bayarRes = await app.inject({
      method: 'POST',
      url: `/api/v1/utang-pemasok/${utangId}/bayar`,
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        jumlah: 400000,
        akun_bayar_kode: '1120',
        referensi: 'TRF-001',
      },
    });
    expect(bayarRes.statusCode).toBe(200);
    expect(bayarRes.json().data.status).toBe('sebagian');
    expect(bayarRes.json().data.sisa).toBe(600000);

    const bbRes = await app.inject({
      method: 'GET',
      url: '/api/v1/laporan-keuangan/buku-besar-akun?akun_kode=2110',
      headers: { authorization: `Bearer ${tokenPemilik}` },
    });
    expect(bbRes.statusCode).toBe(200);
    expect(bbRes.json().data.saldo_akhir).toBe(600000);
  });

  it('Skenario #15: Asisten AI menjawab berdasarkan data nyata tanpa mengarang', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/tanya',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: { pertanyaan: 'Berapa laba dan omzet bulan ini?' },
    });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.fakta.omzet_bulan_ini).toBe(50000);
    expect(d.fakta.laba_kotor_bulan_ini).toBe(20000);
    expect(d.jawaban).toContain('50.000');
  });
});
