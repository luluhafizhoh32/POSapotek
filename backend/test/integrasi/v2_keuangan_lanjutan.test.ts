import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { bangunServer } from '../../src/server.js';
import { tutupSemuaPool } from '../../src/db/pool.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';

describe('PharmaPOS v2.1 SHOULD: Aset Tetap, Penyusutan Idempoten, dan Anggaran Beban', () => {
  let app: FastifyInstance;
  let tokenPemilik = '';

  beforeAll(async () => {
    app = await bangunServer();
    const kodeUnik = `AS${Date.now().toString().slice(-6)}`;
    await buatApotekDenganPemilik({
      kode: kodeUnik,
      nama: 'Apotek Uji Aset & Anggaran',
      pemilikUsername: `own_${kodeUnik.toLowerCase()}`,
      pemilikNama: 'Pemilik Aset',
      pemilikSandi: 'Rahasia1234',
      wajibGantiSandi: false,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/masuk',
      payload: {
        username: `own_${kodeUnik.toLowerCase()}`,
        kata_sandi: 'Rahasia1234',
      },
    });
    expect(res.statusCode).toBe(200);
    tokenPemilik = res.json().data.token_akses as string;
  });

  afterAll(async () => {
    await app.close();
    await tutupSemuaPool();
  });

  it('Registrasi aset tetap + penyusutan bulanan idempoten + jurnal otomatis', async () => {
    const buat = await app.inject({
      method: 'POST',
      url: '/api/v1/aset-tetap',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        kode: 'AST-001',
        nama: 'Kulkas Vaksin 2-8C',
        tanggal_perolehan: '2026-11-01',
        nilai_perolehan: 12000000,
        nilai_residu: 0,
        umur_manfaat_bulan: 48,
      },
    });
    expect(buat.statusCode).toBe(201);

    // Jalankan penyusutan pertama -> 12.000.000 / 48 = 250.000
    const susut1 = await app.inject({
      method: 'POST',
      url: '/api/v1/aset-tetap/susutkan',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: { periode: '2026-11' },
    });
    expect(susut1.statusCode).toBe(200);
    expect(susut1.json().data.jumlah_aset_disusutkan).toBe(1);
    expect(susut1.json().data.total_nominal).toBe(250000);

    // Jalankan kedua kali untuk periode sama -> idempoten (0 diproses)
    const susut2 = await app.inject({
      method: 'POST',
      url: '/api/v1/aset-tetap/susutkan',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: { periode: '2026-11' },
    });
    expect(susut2.statusCode).toBe(200);
    expect(susut2.json().data.jumlah_aset_disusutkan).toBe(0);
  });

  it('Anggaran beban vs realisasi mendeteksi selisih dan status melampaui', async () => {
    const setAngg = await app.inject({
      method: 'POST',
      url: '/api/v1/anggaran',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        periode: '2026-11',
        akun_kode: '5240',
        nominal_anggaran: 200000,
      },
    });
    expect(setAngg.statusCode).toBe(201);

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/anggaran?periode=2026-11',
      headers: { authorization: `Bearer ${tokenPemilik}` },
    });
    expect(list.statusCode).toBe(200);
    const row = list.json().data[0];
    expect(row.akun_kode).toBe('5240');
    expect(row.realisasi).toBe(250000);
    expect(row.melampaui).toBe(true);
  });
});
