import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { bangunServer } from '../../src/server.js';
import { tutupSemuaPool } from '../../src/db/pool.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';

describe('Modul AI PharmaPOS (Cek Interaksi & AI Insight)', () => {
  let app: FastifyInstance;
  let tokenPemilik = '';

  beforeAll(async () => {
    app = await bangunServer();
    const kodeUnik = `AI${Date.now().toString().slice(-6)}`;
    await buatApotekDenganPemilik({
      kode: kodeUnik,
      nama: 'Apotek Uji AI',
      pemilikUsername: `owner_${kodeUnik.toLowerCase()}`,
      pemilikNama: 'Owner AI',
      pemilikSandi: 'Rahasia1234',
      wajibGantiSandi: false,
    });

    const resMasuk = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/masuk',
      payload: {
        username: `owner_${kodeUnik.toLowerCase()}`,
        kata_sandi: 'Rahasia1234',
      },
    });
    expect(resMasuk.statusCode).toBe(200);
    tokenPemilik = resMasuk.json().data.token_akses as string;
  });

  afterAll(async () => {
    await app.close();
    await tutupSemuaPool();
  });

  it('POST /api/v1/ai/cek-interaksi mendeteksi Simvastatin + Klaritromisin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/cek-interaksi',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        daftar_obat: ['Simvastatin 20 mg', 'Klaritromisin 500 mg', 'Amlodipin 5 mg'],
      },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.status_keamanan).toBe('tinggi');
    expect(data.jumlah_interaksi).toBeGreaterThanOrEqual(1);
    expect(data.peringatan[0].judul).toContain('Simvastatin');
  });

  it('GET /api/v1/ai/insight mengembalikan ringkasan, tren 7 hari, distribusi 5 metode bayar, forecast, dan RFM', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/insight',
      headers: { authorization: `Bearer ${tokenPemilik}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.ringkasan).toBeDefined();
    expect(data.tren_7_hari).toHaveLength(7);
    expect(data.distribusi_pembayaran).toHaveLength(5);
    expect(Array.isArray(data.forecast)).toBe(true);
    expect(data.rfm).toHaveLength(4);
  });
});
