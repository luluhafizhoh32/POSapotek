import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { bangunServer } from '../../src/server.js';
import { getPool, tutupSemuaPool } from '../../src/db/pool.js';
import { withApotek } from '../../src/db/withApotek.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';
import { Jam } from '../../src/lib/jam.js';
import { resetBasisDataUji } from '../bantu/db.js';

describe('Fase 7: Uji Beban Ringan (50 Permintaan Paralel)', () => {
  let app: Awaited<ReturnType<typeof bangunServer>>;

  beforeAll(async () => {
    app = await bangunServer();
  });

  beforeEach(async () => {
    Jam.atur('2026-11-20T10:00:00+07:00');
    await resetBasisDataUji();
  });

  afterEach(() => {
    Jam.reset();
  });

  afterAll(async () => {
    await app.close();
    await tutupSemuaPool();
  });

  it('50 permintaan paralel POST /penjualan pada satu batch: tanpa stok negatif atau deadlock', async () => {
    const { apotekId } = await buatApotekDenganPemilik({
      kode: 'LOAD1',
      nama: 'Apotek Beban',
      pemilikUsername: 'pemilik_load',
      pemilikNama: 'Pemilik Load',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });

    const masuk = async (u: string, s: string, ip: string) =>
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/masuk',
          remoteAddress: ip,
          payload: { username: u, kata_sandi: s },
        })
      ).json().data.token_akses as string;

    const tokenP = await masuk('pemilik_load', 'Rahasia123', '10.7.0.1');

    await app.inject({
      method: 'POST',
      url: '/api/v1/pengguna',
      headers: { authorization: `Bearer ${tokenP}` },
      payload: {
        username: 'kasir_load',
        nama_lengkap: 'Kasir Load',
        peran: 'kasir',
        kata_sandi_awal: 'Rahasia123',
      },
    });
    const tK1 = await masuk('kasir_load', 'Rahasia123', '10.7.0.2');
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/ganti-sandi',
      headers: { authorization: `Bearer ${tK1}` },
      payload: { kata_sandi_lama: 'Rahasia123', kata_sandi_baru: 'KasirLoad1' },
    });
    const tokenK = await masuk('kasir_load', 'KasirLoad1', '10.7.0.3');

    const brgId = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/barang',
        headers: { authorization: `Bearer ${tokenP}` },
        payload: {
          kode: 'LOADBRG',
          nama: 'Obat Uji Beban',
          kategori: 'generik',
          golongan: 'bebas',
          satuan: 'strip',
          harga_jual: 10000,
        },
      })
    ).json().data.id as number;

    // Stok awal 25 unit; 50 permintaan paralel masing-masing 1 unit -> tepat 25 berhasil, 25 ditolak (422)
    await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenP}` },
      payload: {
        tanggal: '2026-11-20',
        akun: [{ kode: '1110', saldo: 100_000 }],
        stok: [
          {
            barang_id: brgId,
            nomor_batch: 'L-01',
            tanggal_kedaluwarsa: '2027-12-31',
            jumlah: 25,
            harga_beli: 6000,
          },
        ],
      },
    });

    const reqs = Array.from({ length: 50 }, () =>
      app.inject({
        method: 'POST',
        url: '/api/v1/penjualan',
        headers: {
          authorization: `Bearer ${tokenK}`,
          'idempotency-key': crypto.randomUUID(),
        },
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
    const error5xx = hasil.filter((r) => r.statusCode >= 500);

    expect(error5xx.length).toBe(0);
    expect(sukses.length).toBe(25);
    expect(ditolak.length).toBe(25);

    const stokAkhir = await withApotek(apotekId, async (c) => {
      const r = await c.query<{ stok: number }>(
        `SELECT stok FROM batch_barang WHERE barang_id = $1`,
        [brgId],
      );
      return r.rows[0]?.stok;
    });
    expect(stokAkhir).toBe(0);

    const neg = await getPool().query(`SELECT 1 FROM batch_barang WHERE stok < 0`);
    expect(neg.rowCount).toBe(0);
  });
});
