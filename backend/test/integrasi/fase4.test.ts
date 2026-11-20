import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { bangunServer } from '../../src/server.js';
import { getPool, tutupSemuaPool } from '../../src/db/pool.js';
import { withApotek } from '../../src/db/withApotek.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';
import { Jam } from '../../src/lib/jam.js';
import { resetBasisDataUji } from '../bantu/db.js';

describe('Fase 4: Opname, Pengajuan & Pengesahan Pengurangan, Near-Expired', () => {
  let app: Awaited<ReturnType<typeof bangunServer>>;

  beforeAll(async () => {
    app = await bangunServer();
  });

  beforeEach(async () => {
    Jam.atur('2026-11-09T10:00:00+07:00');
    await resetBasisDataUji();
  });

  afterEach(() => {
    Jam.reset();
  });

  afterAll(async () => {
    await app.close();
    await tutupSemuaPool();
  });

  async function siapkan() {
    const { apotekId } = await buatApotekDenganPemilik({
      kode: 'UJI04',
      nama: 'Apotek Fase 4',
      pemilikUsername: 'pemilik4',
      pemilikNama: 'Pemilik 4',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });

    let ipSeq = 1;
    const masuk = async (u: string, s: string) => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/masuk',
        remoteAddress: `10.4.0.${ipSeq++}`,
        payload: { username: u, kata_sandi: s },
      });
      return r.json().data.token_akses as string;
    };

    const tokenPemilik = await masuk('pemilik4', 'Rahasia123');
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

    const tokenGudang = await buatUser('gudang4', 'staf_gudang');
    const tokenApa = await buatUser('apa4', 'apa');

    return { apotekId, tokenPemilik, tokenGudang, tokenApa, masuk };
  }

  async function unggahBukti(tokenGudang: string) {
    const boundary = '----FormBoundaryBukti';
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const bodyMultipart = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="jenis"\r\n\r\nbukti_pengurangan\r\n`,
      ),
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="berkas"; filename="bukti.png"\r\nContent-Type: image/png\r\n\r\n`,
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

  it('UC-08/10/12: Opname (tanpa stok sistem), selisih lebih wajib keterangan, selisih kurang -> pengajuan -> pengesahan APA', async () => {
    const { apotekId, tokenPemilik, tokenGudang, tokenApa } = await siapkan();

    const pbfId = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/pemasok',
        headers: { authorization: `Bearer ${tokenPemilik}` },
        payload: { kode: 'PBF1', nama: 'PBF Satu' },
      })
    ).json().data.id as number;

    const buatBrg = async (kode: string, harga: number) =>
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/barang',
          headers: { authorization: `Bearer ${tokenPemilik}` },
          payload: {
            kode,
            nama: `Obat ${kode}`,
            kategori: 'generik',
            golongan: 'bebas',
            satuan: 'strip',
            harga_jual: harga,
          },
        })
      ).json().data.id as number;

    const idC = await buatBrg('C', 5000);
    const idD = await buatBrg('D', 4000);
    const idE = await buatBrg('E', 9000);

    await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenPemilik}` },
      payload: {
        tanggal: '2026-11-02',
        akun: [{ kode: '1110', saldo: 1_000_000 }],
        stok: [
          { barang_id: idC, nomor_batch: 'C-01', tanggal_kedaluwarsa: '2026-10-31', jumlah: 100, harga_beli: 3000 },
          { barang_id: idD, nomor_batch: 'D-01', tanggal_kedaluwarsa: '2026-12-15', jumlah: 50, harga_beli: 2000 },
          { barang_id: idE, nomor_batch: 'E-01', tanggal_kedaluwarsa: '2028-01-31', jumlah: 1000, harga_beli: 5400 },
        ],
      },
    });

    // Near expired check: C-01 sudah kedaluwarsa, D-01 mendekati (36 hari <= 90)
    const neRes = await app.inject({
      method: 'GET',
      url: '/api/v1/near-expired',
      headers: { authorization: `Bearer ${tokenGudang}` },
    });
    expect(neRes.statusCode).toBe(200);
    expect(neRes.json().data.sudah_kedaluwarsa.length).toBe(1);
    expect(neRes.json().data.mendekati.length).toBe(1);
    expect(neRes.json().data.ringkasan.nilai_berisiko).toBe(400_000);

    const batchC = neRes.json().data.sudah_kedaluwarsa[0].batch_id as number;
    const batchD = neRes.json().data.mendekati[0].batch_id as number;

    // Pengajuan kedaluwarsa tanpa lampiran -> 422 LAMPIRAN_WAJIB
    const tanpaLamp = await app.inject({
      method: 'POST',
      url: '/api/v1/pengajuan-pengurangan',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: { alasan: 'kedaluwarsa', baris: [{ batch_id: batchC, jumlah: 100 }] },
    });
    expect(tanpaLamp.statusCode).toBe(422);
    expect(tanpaLamp.json().galat.kode).toBe('LAMPIRAN_WAJIB');

    const buktiId = await unggahBukti(tokenGudang);

    // Alasan kedaluwarsa pada batch belum lewat (D-01) -> 422 ALASAN_TIDAK_SESUAI
    const salahAlasan = await app.inject({
      method: 'POST',
      url: '/api/v1/pengajuan-pengurangan',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        alasan: 'kedaluwarsa',
        lampiran_id: buktiId,
        baris: [{ batch_id: batchD, jumlah: 10 }],
      },
    });
    expect(salahAlasan.statusCode).toBe(422);
    expect(salahAlasan.json().galat.kode).toBe('ALASAN_TIDAK_SESUAI');

    // Pengajuan C-01 kedaluwarsa valid -> disahkan APA -> stok C=0, jurnal Dr 5130 / Cr 1140 = 300.000
    const ppC = await app.inject({
      method: 'POST',
      url: '/api/v1/pengajuan-pengurangan',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        alasan: 'kedaluwarsa',
        lampiran_id: buktiId,
        baris: [{ batch_id: batchC, jumlah: 100 }],
      },
    });
    expect(ppC.statusCode).toBe(201);
    const ppCId = ppC.json().data.id as number;

    // Gudang tidak boleh putuskan -> 403 DILARANG
    const gudangPutuskan = await app.inject({
      method: 'POST',
      url: `/api/v1/pengajuan-pengurangan/${ppCId}/putuskan`,
      headers: { authorization: `Bearer ${tokenGudang}` },
      payload: { keputusan: 'setuju' },
    });
    expect(gudangPutuskan.statusCode).toBe(403);

    const sahC = await app.inject({
      method: 'POST',
      url: `/api/v1/pengajuan-pengurangan/${ppCId}/putuskan`,
      headers: { authorization: `Bearer ${tokenApa}` },
      payload: { keputusan: 'setuju' },
    });
    expect(sahC.statusCode).toBe(200);
    expect(sahC.json().data.status).toBe('disahkan');

    // Putuskan lagi -> 409 STATUS_TIDAK_VALID
    const sahLagi = await app.inject({
      method: 'POST',
      url: `/api/v1/pengajuan-pengurangan/${ppCId}/putuskan`,
      headers: { authorization: `Bearer ${tokenApa}` },
      payload: { keputusan: 'setuju' },
    });
    expect(sahLagi.statusCode).toBe(409);
    expect(sahLagi.json().galat.kode).toBe('STATUS_TIDAK_VALID');

    // Opname daftar-batch: tidak boleh ada stok sistem, sekarang tinggal D-01 dan E-01
    const daftarBatch = await app.inject({
      method: 'GET',
      url: '/api/v1/opname/daftar-batch',
      headers: { authorization: `Bearer ${tokenGudang}` },
    });
    expect(daftarBatch.statusCode).toBe(200);
    const items = daftarBatch.json().data as Array<{ batch_id: number; stok?: number }>;
    expect(items.length).toBe(2);
    expect(items[0]!.stok).toBeUndefined();

    const batchE = items.find((x) => x.batch_id !== batchD)!.batch_id;

    // BATCH_BELUM_DIHITUNG jika kurang 1 batch
    const opKurang = await app.inject({
      method: 'POST',
      url: '/api/v1/opname',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: { baris: [{ batch_id: batchD, stok_fisik: 50 }] },
    });
    expect(opKurang.statusCode).toBe(422);
    expect(opKurang.json().galat.kode).toBe('BATCH_BELUM_DIHITUNG');

    // Selisih lebih tanpa keterangan -> 422 KETERANGAN_WAJIB
    const opLebihTanpaKet = await app.inject({
      method: 'POST',
      url: '/api/v1/opname',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        baris: [
          { batch_id: batchD, stok_fisik: 50 },
          { batch_id: batchE, stok_fisik: 1005 },
        ],
      },
    });
    expect(opLebihTanpaKet.statusCode).toBe(422);
    expect(opLebihTanpaKet.json().galat.kode).toBe('KETERANGAN_WAJIB');

    // Opname valid dengan selisih kurang D=0 (dari 50) dan E=1000
    const opValid = await app.inject({
      method: 'POST',
      url: '/api/v1/opname',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        baris: [
          { batch_id: batchD, stok_fisik: 0 },
          { batch_id: batchE, stok_fisik: 1000 },
        ],
      },
    });
    expect(opValid.statusCode).toBe(201);
    expect(opValid.json().data.pengajuan.status).toBe('menunggu');
    const ppOpId = opValid.json().data.pengajuan.id as number;

    // Stok D masih 50 sebelum pengesahan
    const stokD1 = await withApotek(apotekId, async (c) => {
      const r = await c.query<{ stok: number }>(`SELECT stok FROM batch_barang WHERE id = $1`, [batchD]);
      return r.rows[0]?.stok;
    });
    expect(stokD1).toBe(50);

    // APA sahkan -> stok D = 0, jurnal Dr 5120 / Cr 1140 = 100.000
    const sahOp = await app.inject({
      method: 'POST',
      url: `/api/v1/pengajuan-pengurangan/${ppOpId}/putuskan`,
      headers: { authorization: `Bearer ${tokenApa}` },
      payload: { keputusan: 'setuju' },
    });
    expect(sahOp.statusCode).toBe(200);

    const stokD2 = await withApotek(apotekId, async (c) => {
      const r = await c.query<{ stok: number }>(`SELECT stok FROM batch_barang WHERE id = $1`, [batchD]);
      return r.rows[0]?.stok;
    });
    expect(stokD2).toBe(0);

    // Uji pengesah sama dengan pengaju -> 403 PENGESAH_SAMA_DENGAN_PENGAJU
    const ppRetur = await app.inject({
      method: 'POST',
      url: '/api/v1/pengajuan-pengurangan',
      headers: { authorization: `Bearer ${tokenGudang}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        alasan: 'retur_pbf',
        pemasok_id: pbfId,
        baris: [{ batch_id: batchE, jumlah: 10 }],
      },
    });
    expect(ppRetur.statusCode).toBe(201);
    const ppReturId = ppRetur.json().data.id as number;

    // Ubah peran gudang4 menjadi 'apa' sementara di DB untuk uji PENGESAH_SAMA_DENGAN_PENGAJU
    await getPool().query(`UPDATE pengguna SET peran = 'apa' WHERE username = 'gudang4'`);
    const selfApprove = await app.inject({
      method: 'POST',
      url: `/api/v1/pengajuan-pengurangan/${ppReturId}/putuskan`,
      headers: { authorization: `Bearer ${tokenGudang}` },
      payload: { keputusan: 'setuju' },
    });
    expect(selfApprove.statusCode).toBe(403);
    expect(selfApprove.json().galat.kode).toBe('PENGESAH_SAMA_DENGAN_PENGAJU');
  });
});
