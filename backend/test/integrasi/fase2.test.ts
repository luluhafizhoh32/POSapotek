import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { bangunServer } from '../../src/server.js';
import { tutupSemuaPool } from '../../src/db/pool.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';
import { Jam } from '../../src/lib/jam.js';
import { resetBasisDataUji } from '../bantu/db.js';

describe('Fase 2: Master Barang/Pemasok, Lampiran, Saldo Awal, Jurnal Manual, Tutup Periode, Laporan Keuangan', () => {
  let app: Awaited<ReturnType<typeof bangunServer>>;

  beforeAll(async () => {
    app = await bangunServer();
  });

  beforeEach(async () => {
    Jam.atur('2026-11-02T08:05:00+07:00');
    await resetBasisDataUji();
  });

  afterEach(() => {
    Jam.reset();
  });

  afterAll(async () => {
    await app.close();
    await tutupSemuaPool();
  });

  async function masuk(username: string, sandi: string) {
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/masuk',
      payload: { username, kata_sandi: sandi },
    });
    return r.json().data.token_akses as string;
  }

  it('Master pemasok, barang, batch, dan lampiran dengan validasi magic bytes serta isolasi', async () => {
    await buatApotekDenganPemilik({
      kode: 'M01',
      nama: 'Apotek Master 1',
      pemilikUsername: 'pemilik_m1',
      pemilikNama: 'Pemilik M1',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });
    await buatApotekDenganPemilik({
      kode: 'M02',
      nama: 'Apotek Master 2',
      pemilikUsername: 'pemilik_m2',
      pemilikNama: 'Pemilik M2',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });

    const token1 = await masuk('pemilik_m1', 'Rahasia123');
    const token2 = await masuk('pemilik_m2', 'Rahasia123');

    // Buat staf gudang untuk uji unggah lampiran
    await app.inject({
      method: 'POST',
      url: '/api/v1/pengguna',
      headers: { authorization: `Bearer ${token1}` },
      payload: {
        username: 'gudang_m1',
        nama_lengkap: 'Gudang M1',
        peran: 'staf_gudang',
        kata_sandi_awal: 'Rahasia123',
      },
    });
    const tokenGudang = await masuk('gudang_m1', 'Rahasia123');
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/ganti-sandi',
      headers: { authorization: `Bearer ${tokenGudang}` },
      payload: { kata_sandi_lama: 'Rahasia123', kata_sandi_baru: 'GudangBaru1' },
    });

    // Pemasok
    const pbf = await app.inject({
      method: 'POST',
      url: '/api/v1/pemasok',
      headers: { authorization: `Bearer ${token1}` },
      payload: { kode: 'PBF1', nama: 'PT PBF Satu' },
    });
    expect(pbf.statusCode).toBe(201);
    const pbfId = pbf.json().data.id;

    // Barang
    const brg = await app.inject({
      method: 'POST',
      url: '/api/v1/barang',
      headers: { authorization: `Bearer ${token1}` },
      payload: {
        kode: 'PCT500',
        barcode: '8990001',
        nama: 'Paracetamol 500 mg',
        kategori: 'generik',
        golongan: 'bebas',
        satuan: 'strip',
        harga_jual: 10000,
        stok_minimum: 10,
        pemasok_utama_id: pbfId,
      },
    });
    expect(brg.statusCode).toBe(201);
    const brgId = brg.json().data.id;

    // Daftar barang defekta=true -> muncul karena stok_total 0 <= stok_minimum 10
    const defekta = await app.inject({
      method: 'GET',
      url: '/api/v1/barang?defekta=true',
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(defekta.statusCode).toBe(200);
    expect(defekta.json().data.length).toBe(1);

    // Isolasi apotek 2 tidak bisa akses barang apotek 1
    const lintas = await app.inject({
      method: 'GET',
      url: `/api/v1/barang/${brgId}`,
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(lintas.statusCode).toBe(404);

    // Lampiran: unggah PNG valid
    const boundary = '----FormBoundaryUji123';
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const bodyMultipart = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="jenis"\r\n\r\nfaktur\r\n`),
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="berkas"; filename="faktur.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      pngBytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const upRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lampiran',
      headers: {
        authorization: `Bearer ${tokenGudang}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: bodyMultipart,
    });
    expect(upRes.statusCode).toBe(201);
    const lampiranId = upRes.json().data.id;

    const getLampiran = await app.inject({
      method: 'GET',
      url: `/api/v1/lampiran/${lampiranId}`,
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(getLampiran.statusCode).toBe(200);
    expect(getLampiran.headers['content-type']).toBe('image/png');

    // Apotek lain -> 404
    const getLampiran2 = await app.inject({
      method: 'GET',
      url: `/api/v1/lampiran/${lampiranId}`,
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(getLampiran2.statusCode).toBe(404);
  });

  it('Akuntansi: saldo awal, jurnal manual, validasi akun/seimbang, tutup periode berurutan, dan laporan keuangan', async () => {
    await buatApotekDenganPemilik({
      kode: 'UJI01',
      nama: 'Apotek Uji Akuntansi',
      pemilikUsername: 'pemilik_ak',
      pemilikNama: 'Pemilik Akuntansi',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });
    let token = await masuk('pemilik_ak', 'Rahasia123');

    // Buat master barang A-E sesuai skenario 12.2
    const buatBrg = async (kode: string, kategori: 'generik' | 'paten', harga: number) => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/barang',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          kode,
          nama: `Obat ${kode}`,
          kategori,
          golongan: 'bebas',
          satuan: 'strip',
          harga_jual: harga,
        },
      });
      return r.json().data.id as number;
    };

    const idA = await buatBrg('A', 'generik', 10000);
    const idB = await buatBrg('B', 'paten', 20000);
    const idC = await buatBrg('C', 'generik', 5000);
    const idD = await buatBrg('D', 'generik', 4000);
    const idE = await buatBrg('E', 'generik', 9000);

    // Langkah 1 Skenario 12.2: Saldo awal 2026-11-02
    const sa = await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tanggal: '2026-11-02',
        akun: [
          { kode: '1110', saldo: 8_000_000 },
          { kode: '1210', saldo: 12_000_000 },
          { kode: '1211', saldo: 2_400_000 },
        ],
        stok: [
          { barang_id: idA, nomor_batch: 'A-01', tanggal_kedaluwarsa: '2027-06-30', jumlah: 1000, harga_beli: 6500 },
          { barang_id: idB, nomor_batch: 'B-01', tanggal_kedaluwarsa: '2027-06-30', jumlah: 200, harga_beli: 13500 },
          { barang_id: idC, nomor_batch: 'C-01', tanggal_kedaluwarsa: '2026-10-31', jumlah: 100, harga_beli: 3000 },
          { barang_id: idD, nomor_batch: 'D-01', tanggal_kedaluwarsa: '2027-12-31', jumlah: 50, harga_beli: 2000 },
          { barang_id: idE, nomor_batch: 'E-01', tanggal_kedaluwarsa: '2028-01-31', jumlah: 1000, harga_beli: 5400 },
        ],
      },
    });
    expect(sa.statusCode).toBe(201);
    expect(sa.json().data.total_persediaan).toBe(15_000_000);
    expect(sa.json().data.modal).toBe(32_600_000);

    // Saldo awal kedua kali -> 409 SALDO_AWAL_TIDAK_DAPAT
    const sa2 = await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${token}` },
      payload: { tanggal: '2026-11-02', akun: [{ kode: '1110', saldo: 1000 }], stok: [] },
    });
    expect(sa2.statusCode).toBe(409);
    expect(sa2.json().galat.kode).toBe('SALDO_AWAL_TIDAK_DAPAT');

    // Cek stok_kedaluwarsa C = 100
    const brgC = await app.inject({
      method: 'GET',
      url: `/api/v1/barang/${idC}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(brgC.json().data.stok_kedaluwarsa).toBe(100);
    expect(brgC.json().data.stok_total).toBe(0);

    // Jurnal manual tak seimbang -> 422
    const takSeimbang = await app.inject({
      method: 'POST',
      url: '/api/v1/jurnal-manual',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tanggal: '2026-11-02',
        jenis: 'beban',
        keterangan: 'Gaji tidak seimbang',
        baris: [
          { akun_kode: '5210', debit: 500000, kredit: 0 },
          { akun_kode: '1110', debit: 0, kredit: 400000 },
        ],
      },
    });
    expect(takSeimbang.statusCode).toBe(422);
    expect(takSeimbang.json().galat.kode).toBe('JURNAL_TIDAK_SEIMBANG');

    // Akun terlarang (1140) -> 422 AKUN_DILARANG
    const akunTerlarang = await app.inject({
      method: 'POST',
      url: '/api/v1/jurnal-manual',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tanggal: '2026-11-02',
        jenis: 'beban',
        keterangan: 'Akun terlarang',
        baris: [
          { akun_kode: '1140', debit: 500000, kredit: 0 },
          { akun_kode: '1110', debit: 0, kredit: 500000 },
        ],
      },
    });
    expect(akunTerlarang.statusCode).toBe(422);
    expect(akunTerlarang.json().galat.kode).toBe('AKUN_DILARANG');

    // Langkah 8-11 (subset manual) pada 2026-11-30
    Jam.atur('2026-11-30T17:00:00+07:00');
    token = await masuk('pemilik_ak', 'Rahasia123');
    await app.inject({
      method: 'POST',
      url: '/api/v1/jurnal-manual',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tanggal: '2026-11-15',
        jenis: 'beban',
        keterangan: 'Beban gaji',
        baris: [
          { akun_kode: '5210', debit: 600_000, kredit: 0 },
          { akun_kode: '1110', debit: 0, kredit: 600_000 },
        ],
      },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/jurnal-manual',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tanggal: '2026-11-17',
        jenis: 'prive',
        keterangan: 'Prive pemilik',
        baris: [
          { akun_kode: '3120', debit: 1_000_000, kredit: 0 },
          { akun_kode: '1110', debit: 0, kredit: 1_000_000 },
        ],
      },
    });

    // Neraca seimbang
    const neraca = await app.inject({
      method: 'GET',
      url: '/api/v1/laporan-keuangan/neraca?periode=2026-11',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(neraca.statusCode).toBe(200);
    expect(neraca.json().data.seimbang).toBe(true);

    // Buku besar 1110
    const bb = await app.inject({
      method: 'GET',
      url: '/api/v1/laporan-keuangan/buku-besar?periode=2026-11&akun_kode=1110',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(bb.statusCode).toBe(200);
    expect(bb.json().data.saldo_akhir).toBe(6_400_000);

    // Tutup periode 2026-11 saat masih November -> 422 PERIODE_BELUM_BERAKHIR
    const tutupDini = await app.inject({
      method: 'POST',
      url: '/api/v1/periode/2026-11/tutup',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(tutupDini.statusCode).toBe(422);
    expect(tutupDini.json().galat.kode).toBe('PERIODE_BELUM_BERAKHIR');

    // Majukan ke 2027-01-02 -> tutup 2026-12 sebelum 2026-11 -> 422 PERIODE_SEBELUMNYA_BELUM_DITUTUP
    Jam.atur('2027-01-02T09:00:00+07:00');
    token = await masuk('pemilik_ak', 'Rahasia123');
    const tutupLompat = await app.inject({
      method: 'POST',
      url: '/api/v1/periode/2026-12/tutup',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(tutupLompat.statusCode).toBe(422);
    expect(tutupLompat.json().galat.kode).toBe('PERIODE_SEBELUMNYA_BELUM_DITUTUP');
    expect(tutupLompat.json().galat.detail.periode).toBe('2026-11');

    // Tutup 2026-11 berhasil
    const tutup11 = await app.inject({
      method: 'POST',
      url: '/api/v1/periode/2026-11/tutup',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(tutup11.statusCode).toBe(200);
    expect(tutup11.json().data.status).toBe('ditutup');

    // Jurnal manual ke 2026-11 yang sudah ditutup -> 409 PERIODE_DITUTUP
    const jurnalTertutup = await app.inject({
      method: 'POST',
      url: '/api/v1/jurnal-manual',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tanggal: '2026-11-20',
        jenis: 'beban',
        keterangan: 'Terlambat',
        baris: [
          { akun_kode: '5210', debit: 100_000, kredit: 0 },
          { akun_kode: '1110', debit: 0, kredit: 100_000 },
        ],
      },
    });
    expect(jurnalTertutup.statusCode).toBe(409);
    expect(jurnalTertutup.json().galat.kode).toBe('PERIODE_DITUTUP');

    // Tutup 2026-11 lagi -> 409 PERIODE_SUDAH_DITUTUP
    const tutupLagi = await app.inject({
      method: 'POST',
      url: '/api/v1/periode/2026-11/tutup',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(tutupLagi.statusCode).toBe(409);
    expect(tutupLagi.json().galat.kode).toBe('PERIODE_SUDAH_DITUTUP');
  });
});
