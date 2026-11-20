import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { bangunServer } from '../../src/server.js';
import { tutupSemuaPool } from '../../src/db/pool.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';
import { Jam } from '../../src/lib/jam.js';
import { resetBasisDataUji } from '../bantu/db.js';

describe('Uji Tambahan Endpoint Daftar, Detail, Ubah, Struk, dan Reset Sandi', () => {
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

  it('Menutup jalur daftar/detail/ubah pada pemasok, barang, pengguna, penjualan/struk, penerimaan, opname, pengajuan, dan pemeriksaan near-expired', async () => {
    await buatApotekDenganPemilik({
      kode: 'CAK01',
      nama: 'Apotek Cakupan',
      pemilikUsername: 'pemilik_c',
      pemilikNama: 'Pemilik C',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });

    let ip = 1;
    const masuk = async (u: string, s: string) =>
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/masuk',
          remoteAddress: `10.99.0.${ip++}`,
          payload: { username: u, kata_sandi: s },
        })
      ).json().data.token_akses as string;

    const tokenP = await masuk('pemilik_c', 'Rahasia123');

    // Pengguna: daftar, ubah, reset-sandi, aktifkan
    const uRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pengguna',
      headers: { authorization: `Bearer ${tokenP}` },
      payload: {
        username: 'staf_c',
        nama_lengkap: 'Staf C',
        peran: 'staf_gudang',
        kata_sandi_awal: 'Rahasia123',
      },
    });
    const stafId = uRes.json().data.id as number;
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/pengguna?aktif=true&q=staf', headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/v1/pengguna/${stafId}`,
          headers: { authorization: `Bearer ${tokenP}` },
          payload: { nama_lengkap: 'Staf C Baru', peran: 'kasir' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/pengguna/${stafId}/reset-sandi`,
          headers: { authorization: `Bearer ${tokenP}` },
          payload: { kata_sandi_baru: 'ResetBaru1' },
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/pengguna/${stafId}/aktifkan`,
          headers: { authorization: `Bearer ${tokenP}` },
        })
      ).statusCode,
    ).toBe(200);

    // Pemasok: daftar, detail, ubah, nonaktifkan, aktifkan
    const pbfId = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/pemasok',
        headers: { authorization: `Bearer ${tokenP}` },
        payload: { kode: 'PBF9', nama: 'PBF Sembilan' },
      })
    ).json().data.id as number;
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/pemasok?q=sembilan', headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: `/api/v1/pemasok/${pbfId}`, headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/v1/pemasok/${pbfId}`,
          headers: { authorization: `Bearer ${tokenP}` },
          payload: { nama: 'PBF Sembilan Jaya', telepon: '081234' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'POST', url: `/api/v1/pemasok/${pbfId}/nonaktifkan`, headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'POST', url: `/api/v1/pemasok/${pbfId}/aktifkan`, headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);

    // Barang: ubah, nonaktifkan, aktifkan, daftar batch
    const brgId = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/barang',
        headers: { authorization: `Bearer ${tokenP}` },
        payload: {
          kode: 'OBT9',
          nama: 'Obat Sembilan',
          kategori: 'generik',
          golongan: 'bebas',
          satuan: 'strip',
          harga_jual: 12000,
        },
      })
    ).json().data.id as number;
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/v1/barang/${brgId}`,
          headers: { authorization: `Bearer ${tokenP}` },
          payload: {
            nama: 'Obat Sembilan Baru',
            kategori: 'generik',
            golongan: 'bebas',
            satuan: 'strip',
            harga_jual: 13000,
            stok_minimum: 5,
          },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'POST', url: `/api/v1/barang/${brgId}/nonaktifkan`, headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'POST', url: `/api/v1/barang/${brgId}/aktifkan`, headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);

    // Saldo awal & penjualan & struk & daftar penjualan
    await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenP}` },
      payload: {
        tanggal: '2026-11-20',
        akun: [{ kode: '1110', saldo: 100000 }],
        stok: [{ barang_id: brgId, nomor_batch: 'B9', tanggal_kedaluwarsa: '2027-12-31', jumlah: 10, harga_beli: 8000 }],
      },
    });

    const tStaf1 = await masuk('staf_c', 'ResetBaru1');
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/ganti-sandi',
      headers: { authorization: `Bearer ${tStaf1}` },
      payload: { kata_sandi_lama: 'ResetBaru1', kata_sandi_baru: 'KasirC999' },
    });
    const tokenK = await masuk('staf_c', 'KasirC999');

    const pj = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: { authorization: `Bearer ${tokenK}`, 'idempotency-key': crypto.randomUUID() },
      payload: { baris: [{ barang_id: brgId, jumlah: 1 }], cara_bayar: 'tunai', uang_diterima: 20000 },
    });
    const pjId = pj.json().data.id as number;
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/penjualan', headers: { authorization: `Bearer ${tokenK}` } })).statusCode,
    ).toBe(200);
    const struk = await app.inject({
      method: 'GET',
      url: `/api/v1/penjualan/${pjId}/struk`,
      headers: { authorization: `Bearer ${tokenK}` },
    });
    expect(struk.statusCode).toBe(200);
    expect(struk.json().data.total).toBe(13000);

    // Daftar penerimaan, opname, pengajuan, pemeriksaan-near-expired, jurnal, periode
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/penerimaan', headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/opname', headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/pengajuan-pengurangan', headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/pemeriksaan-near-expired', headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/jurnal?periode=2026-11', headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/periode', headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/akun', headers: { authorization: `Bearer ${tokenP}` } })).statusCode,
    ).toBe(200);
  });
});
