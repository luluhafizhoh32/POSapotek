import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { bangunServer } from '../../src/server.js';
import { tutupSemuaPool } from '../../src/db/pool.js';
import { withApotek } from '../../src/db/withApotek.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';
import { beriAksesPantau } from '../../src/cli/pantauBeri.js';
import { Jam } from '../../src/lib/jam.js';
import { resetBasisDataUji } from '../bantu/db.js';

describe('Fase 1: Auth, Pengguna, Pengaturan, Notifikasi, Pantau, dan Ringkasan', () => {
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

  async function masuk(username: string, kataSandi: string, ip = '127.0.0.1') {
    return app.inject({
      method: 'POST',
      url: '/api/v1/auth/masuk',
      remoteAddress: ip,
      payload: { username, kata_sandi: kataSandi, perangkat: 'Uji' },
    });
  }

  it('Auth: wajib_ganti_sandi memblokir endpoint lain hingga ganti sandi berhasil', async () => {
    await buatApotekDenganPemilik({
      kode: 'A01',
      nama: 'Apotek Satu',
      pemilikUsername: 'rina',
      pemilikNama: 'Rina',
      pemilikSandi: 'Sementara1',
    });

    const resMasuk = await masuk('rina', 'Sementara1', '10.0.0.1');
    expect(resMasuk.statusCode).toBe(200);
    const { token_akses: token1, pengguna } = resMasuk.json().data;
    expect(pengguna.wajib_ganti_sandi).toBe(true);

    // Diblokir saat wajib_ganti_sandi = true
    const resPengguna = await app.inject({
      method: 'GET',
      url: '/api/v1/pengguna',
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(resPengguna.statusCode).toBe(403);
    expect(resPengguna.json().galat.kode).toBe('WAJIB_GANTI_SANDI');

    // /auth/saya tetap boleh
    const resSaya = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/saya',
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(resSaya.statusCode).toBe(200);

    // Ganti sandi
    const resGanti = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/ganti-sandi',
      headers: { authorization: `Bearer ${token1}` },
      payload: { kata_sandi_lama: 'Sementara1', kata_sandi_baru: 'SandiBaru123' },
    });
    expect(resGanti.statusCode).toBe(204);

    // Sekarang /pengguna boleh
    const resPengguna2 = await app.inject({
      method: 'GET',
      url: '/api/v1/pengguna',
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(resPengguna2.statusCode).toBe(200);
  });

  it('Auth: 5 kegagalan mengunci akun 15 menit (423), dan sandi salah/tak ada sama-sama 401', async () => {
    await buatApotekDenganPemilik({
      kode: 'A02',
      nama: 'Apotek Dua',
      pemilikUsername: 'budi',
      pemilikNama: 'Budi',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });

    const resTakAda = await masuk('tidakada', 'Rahasia123', '10.0.0.2');
    expect(resTakAda.statusCode).toBe(401);
    expect(resTakAda.json().galat.kode).toBe('KREDENSIAL_SALAH');

    for (let i = 1; i <= 4; i++) {
      const r = await masuk('budi', 'Salah1234', '10.0.0.3');
      expect(r.statusCode).toBe(401);
      expect(r.json().galat.kode).toBe('KREDENSIAL_SALAH');
    }

    // Kegagalan ke-5 mengunci
    const r5 = await masuk('budi', 'Salah1234', '10.0.0.3');
    expect(r5.statusCode).toBe(423);
    expect(r5.json().galat.kode).toBe('AKUN_TERKUNCI');
    expect(r5.json().galat.detail.terkunci_sampai).toBeTruthy();

    // Walau sandi benar, tetap 423 selama terkunci
    const rBenarSaatTerkunci = await masuk('budi', 'Rahasia123', '10.0.0.4');
    expect(rBenarSaatTerkunci.statusCode).toBe(423);

    // Majukan waktu 16 menit -> bisa masuk lagi
    Jam.atur('2026-11-20T10:16:00+07:00');
    const rSetelahLepas = await masuk('budi', 'Rahasia123', '10.0.0.4');
    expect(rSetelahLepas.statusCode).toBe(200);
  });

  it('Auth: rotasi token segar, deteksi reuse mencabut seluruh keluarga, dan ganti sandi mencabut sesi lain', async () => {
    await buatApotekDenganPemilik({
      kode: 'A03',
      nama: 'Apotek Tiga',
      pemilikUsername: 'andi',
      pemilikNama: 'Andi',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });

    const m1 = await masuk('andi', 'Rahasia123', '10.0.0.5');
    const m2 = await masuk('andi', 'Rahasia123', '10.0.0.6');
    const refresh1 = m1.json().data.token_segar;
    const refresh2 = m2.json().data.token_segar;
    const akses1 = m1.json().data.token_akses;

    // Segarkan token 1
    const s1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/segarkan',
      payload: { token_segar: refresh1 },
    });
    expect(s1.statusCode).toBe(200);
    const refresh1Baru = s1.json().data.token_segar;
    expect(refresh1Baru).not.toBe(refresh1);

    // Pakai ulang refresh1 (yang sudah dicabut) -> harus 401 dan mencabut refresh1Baru juga
    const reuse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/segarkan',
      payload: { token_segar: refresh1 },
    });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json().galat.kode).toBe('TOKEN_TIDAK_VALID');

    const pakaiBaru = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/segarkan',
      payload: { token_segar: refresh1Baru },
    });
    expect(pakaiBaru.statusCode).toBe(401);

    // Ganti sandi pada sesi 1 mencabut sesi 2 (refresh2)
    const ganti = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/ganti-sandi',
      headers: { authorization: `Bearer ${akses1}` },
      payload: { kata_sandi_lama: 'Rahasia123', kata_sandi_baru: 'SandiBaru99' },
    });
    expect(ganti.statusCode).toBe(204);

    const pakaiSesi2 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/segarkan',
      payload: { token_segar: refresh2 },
    });
    expect(pakaiSesi2.statusCode).toBe(401);
  });

  it('Auth: rate limit /auth/masuk membalas 429 setelah 10 permintaan/menit/IP', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await masuk('siapasaja', 'Rahasia123', '10.9.9.9');
      expect(r.statusCode).toBe(401);
    }
    const r11 = await masuk('siapasaja', 'Rahasia123', '10.9.9.9');
    expect(r11.statusCode).toBe(429);
    expect(r11.json().galat.kode).toBe('TERLALU_BANYAK_PERMINTAAN');
  });

  it('Pengguna & Isolasi: CRUD pengguna, duplikat lintas apotek, nonaktif langsung ditolak, dan isolasi antar apotek', async () => {
    const a1 = await buatApotekDenganPemilik({
      kode: 'APO1',
      nama: 'Apotek 1',
      pemilikUsername: 'pemilik1',
      pemilikNama: 'Pemilik 1',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });
    const a2 = await buatApotekDenganPemilik({
      kode: 'APO2',
      nama: 'Apotek 2',
      pemilikUsername: 'pemilik2',
      pemilikNama: 'Pemilik 2',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });

    const tokenP1 = (await masuk('pemilik1', 'Rahasia123', '10.0.1.1')).json().data.token_akses;
    const tokenP2 = (await masuk('pemilik2', 'Rahasia123', '10.0.1.2')).json().data.token_akses;

    // Buat kasir di apotek 1
    const buatKasir = await app.inject({
      method: 'POST',
      url: '/api/v1/pengguna',
      headers: { authorization: `Bearer ${tokenP1}` },
      payload: {
        username: 'kasir_a1',
        nama_lengkap: 'Sari Kasir',
        peran: 'kasir',
        kata_sandi_awal: 'Kasir1234',
      },
    });
    expect(buatKasir.statusCode).toBe(201);
    const kasirId = buatKasir.json().data.id;

    // Username ganda lintas apotek -> 409 DUPLIKAT
    const duplikat = await app.inject({
      method: 'POST',
      url: '/api/v1/pengguna',
      headers: { authorization: `Bearer ${tokenP2}` },
      payload: {
        username: 'kasir_a1',
        nama_lengkap: 'Kasir Duplikat',
        peran: 'kasir',
        kata_sandi_awal: 'Kasir1234',
      },
    });
    expect(duplikat.statusCode).toBe(409);
    expect(duplikat.json().galat.kode).toBe('DUPLIKAT');

    // Apotek 2 tidak boleh lihat pengguna apotek 1 -> 404
    const lihatLintas = await app.inject({
      method: 'GET',
      url: `/api/v1/pengguna/${kasirId}`,
      headers: { authorization: `Bearer ${tokenP2}` },
    });
    expect(lihatLintas.statusCode).toBe(404);

    // Pemilik tidak boleh menonaktifkan akun pemilik atau diri sendiri -> 403
    const nonaktifDiri = await app.inject({
      method: 'POST',
      url: `/api/v1/pengguna/${a1.pemilikId}/nonaktifkan`,
      headers: { authorization: `Bearer ${tokenP1}` },
    });
    expect(nonaktifDiri.statusCode).toBe(403);

    // Kasir masuk dan ganti sandi, lalu dinonaktifkan -> langsung 401 AKUN_NONAKTIF
    const mKasir = await masuk('kasir_a1', 'Kasir1234', '10.0.1.3');
    const tokenKasir = mKasir.json().data.token_akses;
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/ganti-sandi',
      headers: { authorization: `Bearer ${tokenKasir}` },
      payload: { kata_sandi_lama: 'Kasir1234', kata_sandi_baru: 'KasirBaru1' },
    });

    // Kasir tidak boleh akses /pengguna -> 403 DILARANG
    const kasirAksesPengguna = await app.inject({
      method: 'GET',
      url: '/api/v1/pengguna',
      headers: { authorization: `Bearer ${tokenKasir}` },
    });
    expect(kasirAksesPengguna.statusCode).toBe(403);
    expect(kasirAksesPengguna.json().galat.kode).toBe('DILARANG');

    // Nonaktifkan kasir
    const nonaktifkan = await app.inject({
      method: 'POST',
      url: `/api/v1/pengguna/${kasirId}/nonaktifkan`,
      headers: { authorization: `Bearer ${tokenP1}` },
    });
    expect(nonaktifkan.statusCode).toBe(200);
    expect(nonaktifkan.json().data.aktif).toBe(false);

    // Token akses kasir yang masih berlaku langsung ditolak
    const kasirSetelahNonaktif = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/saya',
      headers: { authorization: `Bearer ${tokenKasir}` },
    });
    expect(kasirSetelahNonaktif.statusCode).toBe(401);
    expect(kasirSetelahNonaktif.json().galat.kode).toBe('AKUN_NONAKTIF');

    // Pantau: beri akses pantau pemilik1 ke APO2
    await beriAksesPantau('pemilik1', 'APO2');
    const resPantau = await app.inject({
      method: 'GET',
      url: '/api/v1/pantau/apotek',
      headers: { authorization: `Bearer ${tokenP1}` },
    });
    expect(resPantau.statusCode).toBe(200);
    expect(resPantau.json().data).toEqual([
      { id: a1.apotekId, kode: 'APO1', nama: 'Apotek 1', sendiri: true },
      { id: a2.apotekId, kode: 'APO2', nama: 'Apotek 2', sendiri: false },
    ]);

    // Pengaturan & Ringkasan & Notifikasi
    const resPeng = await app.inject({
      method: 'PUT',
      url: '/api/v1/pengaturan',
      headers: { authorization: `Bearer ${tokenP1}` },
      payload: { batas_near_expired_hari: 60, kaki_struk: 'Semoga lekas sembuh' },
    });
    expect(resPeng.statusCode).toBe(200);
    expect(resPeng.json().data.batas_near_expired_hari).toBe(60);

    await withApotek(a1.apotekId, async (c) => {
      await c.query(
        `INSERT INTO notifikasi (apotek_id, penerima_id, jenis, judul, isi)
         VALUES ($1, $2, 'near_expired', 'Judul Uji', 'Isi Uji')`,
        [a1.apotekId, a1.pemilikId],
      );
    });

    const resRingkasan = await app.inject({
      method: 'GET',
      url: '/api/v1/ringkasan',
      headers: { authorization: `Bearer ${tokenP1}` },
    });
    expect(resRingkasan.statusCode).toBe(200);
    expect(resRingkasan.json().data.notifikasi_belum_dibaca).toBe(1);

    const resNotif = await app.inject({
      method: 'GET',
      url: '/api/v1/notifikasi?belum_dibaca=true',
      headers: { authorization: `Bearer ${tokenP1}` },
    });
    expect(resNotif.statusCode).toBe(200);
    expect(resNotif.json().data.length).toBe(1);
    const notifId = resNotif.json().data[0].id;

    const resBaca = await app.inject({
      method: 'POST',
      url: `/api/v1/notifikasi/${notifId}/dibaca`,
      headers: { authorization: `Bearer ${tokenP1}` },
    });
    expect(resBaca.statusCode).toBe(204);
  });
});
