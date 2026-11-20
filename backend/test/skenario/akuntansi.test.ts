import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { bangunServer } from '../../src/server.js';
import { tutupSemuaPool } from '../../src/db/pool.js';
import { withApotek } from '../../src/db/withApotek.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';
import { jalankanJobLaporanBulanan } from '../../src/jobs/laporanBulanan.js';
import { Jam } from '../../src/lib/jam.js';
import { keUangBulat } from '../../src/lib/uang.js';
import { resetBasisDataUji } from '../bantu/db.js';

describe('Skenario Akuntansi Menyeluruh (Bagian 12.2)', () => {
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

  it('Menjalankan seluruh 15 langkah skenario akuntansi dan memverifikasi seluruh invarian 5.5', async () => {
    const { apotekId } = await buatApotekDenganPemilik({
      kode: 'UJI01',
      nama: 'Apotek Skenario 12.2',
      pemilikUsername: 'pemilik_s',
      pemilikNama: 'Pemilik',
      pemilikSandi: 'Rahasia123',
      wajibGantiSandi: false,
    });

    let ipSeq = 1;
    const masuk = async (u: string, s: string) => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/masuk',
        remoteAddress: `10.12.0.${ipSeq++}`,
        payload: { username: u, kata_sandi: s },
      });
      return r.json().data.token_akses as string;
    };

    let tokenP = await masuk('pemilik_s', 'Rahasia123');
    const buatUser = async (username: string, peran: string) => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/pengguna',
        headers: { authorization: `Bearer ${tokenP}` },
        payload: { username, nama_lengkap: username, peran, kata_sandi_awal: 'Rahasia123' },
      });
      const t1 = await masuk(username, 'Rahasia123');
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/ganti-sandi',
        headers: { authorization: `Bearer ${t1}` },
        payload: { kata_sandi_lama: 'Rahasia123', kata_sandi_baru: 'SandiBaru1' },
      });
    };

    await buatUser('apa_s', 'apa');
    await buatUser('gudang_s', 'staf_gudang');
    await buatUser('kasir_s', 'kasir');

    // Master barang A-F & PBF1
    const pbfId = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/pemasok',
        headers: { authorization: `Bearer ${tokenP}` },
        payload: { kode: 'PBF1', nama: 'PBF Satu' },
      })
    ).json().data.id as number;

    const buatBrg = async (
      kode: string,
      kategori: 'generik' | 'paten',
      golongan: 'bebas' | 'bebas_terbatas',
      harga: number,
    ) =>
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/barang',
          headers: { authorization: `Bearer ${tokenP}` },
          payload: {
            kode,
            nama: `Obat ${kode}`,
            kategori,
            golongan,
            satuan: 'strip',
            harga_jual: harga,
          },
        })
      ).json().data.id as number;

    const idA = await buatBrg('A', 'generik', 'bebas', 10000);
    const idB = await buatBrg('B', 'paten', 'bebas_terbatas', 20000);
    const idC = await buatBrg('C', 'generik', 'bebas', 5000);
    const idD = await buatBrg('D', 'generik', 'bebas', 4000);
    const idE = await buatBrg('E', 'generik', 'bebas', 9000);
    const idF = await buatBrg('F', 'paten', 'bebas', 15000);

    // 1. 2026-11-02 08:05 Saldo Awal
    const sa = await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenP}` },
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

    const brgC = await app.inject({
      method: 'GET',
      url: `/api/v1/barang/${idC}`,
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(brgC.json().data.stok_kedaluwarsa).toBe(100);

    const sa2 = await app.inject({
      method: 'POST',
      url: '/api/v1/saldo-awal',
      headers: { authorization: `Bearer ${tokenP}` },
      payload: { tanggal: '2026-11-02', akun: [{ kode: '1110', saldo: 100 }], stok: [] },
    });
    expect(sa2.statusCode).toBe(409);
    expect(sa2.json().galat.kode).toBe('SALDO_AWAL_TIDAK_DAPAT');

    // Helper unggah lampiran
    const unggah = async (tokenG: string, jenis: string) => {
      const boundary = '----FormBoundarySken';
      const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const bodyMultipart = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="jenis"\r\n\r\n${jenis}\r\n`),
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="berkas"; filename="img.png"\r\nContent-Type: image/png\r\n\r\n`,
        ),
        pngBytes,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/lampiran',
        headers: {
          authorization: `Bearer ${tokenG}`,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: bodyMultipart,
      });
      return r.json().data.id as string;
    };

    // 2. 2026-11-03 Penerimaan INV-001
    Jam.atur('2026-11-03T10:00:00+07:00');
    let tokenG = await masuk('gudang_s', 'SandiBaru1');
    const lampFak = await unggah(tokenG, 'faktur');
    const ter = await app.inject({
      method: 'POST',
      url: '/api/v1/penerimaan',
      headers: { authorization: `Bearer ${tokenG}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        pemasok_id: pbfId,
        nomor_faktur: 'INV-001',
        tanggal_faktur: '2026-11-03',
        lampiran_id: lampFak,
        baris: [
          {
            barang_id: idF,
            nomor_batch: 'F-01',
            tanggal_kedaluwarsa: '2028-06-30',
            jumlah: 600,
            harga_beli: 10000,
            gabung_ke_batch_ada: false,
          },
        ],
      },
    });
    expect(ter.statusCode).toBe(201);

    const lampFak2 = await unggah(tokenG, 'faktur');
    const terGanda = await app.inject({
      method: 'POST',
      url: '/api/v1/penerimaan',
      headers: { authorization: `Bearer ${tokenG}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        pemasok_id: pbfId,
        nomor_faktur: 'INV-001',
        tanggal_faktur: '2026-11-03',
        lampiran_id: lampFak2,
        baris: [
          {
            barang_id: idF,
            nomor_batch: 'F-02',
            tanggal_kedaluwarsa: '2028-06-30',
            jumlah: 1,
            harga_beli: 10000,
            gabung_ke_batch_ada: false,
          },
        ],
      },
    });
    expect(terGanda.statusCode).toBe(409);
    expect(terGanda.json().galat.kode).toBe('FAKTUR_SUDAH_ADA');

    // 3. 2026-11-05 Penjualan tunai #1 dan #2
    Jam.atur('2026-11-05T11:00:00+07:00');
    let tokenK = await masuk('kasir_s', 'SandiBaru1');
    const pj1 = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: { authorization: `Bearer ${tokenK}`, 'idempotency-key': crypto.randomUUID() },
      payload: { baris: [{ barang_id: idA, jumlah: 600 }], cara_bayar: 'tunai', uang_diterima: 6_000_000 },
    });
    expect(pj1.statusCode).toBe(201);

    const pj2 = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: { authorization: `Bearer ${tokenK}`, 'idempotency-key': crypto.randomUUID() },
      payload: { baris: [{ barang_id: idA, jumlah: 400 }], cara_bayar: 'tunai', uang_diterima: 5_000_000 },
    });
    expect(pj2.statusCode).toBe(201);
    expect(pj2.json().data.kembalian).toBe(1_000_000);

    // 4. 2026-11-06 Penjualan QRIS B x 200
    Jam.atur('2026-11-06T11:00:00+07:00');
    tokenK = await masuk('kasir_s', 'SandiBaru1');
    const pay = await app.inject({
      method: 'POST',
      url: '/api/v1/pembayaran-nontunai',
      headers: { authorization: `Bearer ${tokenK}` },
      payload: { cara: 'qris', jumlah: 4_000_000 },
    });
    const payId = pay.json().data.id as string;
    await app.inject({
      method: 'POST',
      url: `/api/v1/pembayaran-nontunai/${payId}/simulasi-bayar`,
      headers: { authorization: `Bearer ${tokenK}` },
    });
    const pj3 = await app.inject({
      method: 'POST',
      url: '/api/v1/penjualan',
      headers: { authorization: `Bearer ${tokenK}`, 'idempotency-key': crypto.randomUUID() },
      payload: { baris: [{ barang_id: idB, jumlah: 200 }], cara_bayar: 'qris', pembayaran_nontunai_id: payId },
    });
    expect(pj3.statusCode).toBe(201);

    // 5. 2026-11-09 Pengajuan kedaluwarsa C-01 x 100 -> APA setuju
    Jam.atur('2026-11-09T10:00:00+07:00');
    tokenG = await masuk('gudang_s', 'SandiBaru1');
    let tokenA = await masuk('apa_s', 'SandiBaru1');
    const batchCRes = await app.inject({
      method: 'GET',
      url: `/api/v1/barang/${idC}/batch`,
      headers: { authorization: `Bearer ${tokenG}` },
    });
    const batchCId = batchCRes.json().data[0].id as number;
    const buktiC = await unggah(tokenG, 'bukti_pengurangan');
    const ppC = await app.inject({
      method: 'POST',
      url: '/api/v1/pengajuan-pengurangan',
      headers: { authorization: `Bearer ${tokenG}`, 'idempotency-key': crypto.randomUUID() },
      payload: { alasan: 'kedaluwarsa', lampiran_id: buktiC, baris: [{ batch_id: batchCId, jumlah: 100 }] },
    });
    expect(ppC.statusCode).toBe(201);
    const sahC = await app.inject({
      method: 'POST',
      url: `/api/v1/pengajuan-pengurangan/${ppC.json().data.id}/putuskan`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { keputusan: 'setuju' },
    });
    expect(sahC.statusCode).toBe(200);

    // 6. 2026-11-10 Opname: D=0 (dari 50), E=1000, F=600 -> pengajuan selisih_opname -> APA setuju
    Jam.atur('2026-11-10T10:00:00+07:00');
    tokenG = await masuk('gudang_s', 'SandiBaru1');
    tokenA = await masuk('apa_s', 'SandiBaru1');
    const daftarOp = await app.inject({
      method: 'GET',
      url: '/api/v1/opname/daftar-batch',
      headers: { authorization: `Bearer ${tokenG}` },
    });
    const opItems = daftarOp.json().data as Array<{ batch_id: number; barang: { kode: string } }>;
    expect(opItems.length).toBe(3);

    const bD = opItems.find((x) => x.barang.kode === 'D')!.batch_id;
    const bE = opItems.find((x) => x.barang.kode === 'E')!.batch_id;
    const bF = opItems.find((x) => x.barang.kode === 'F')!.batch_id;

    const op = await app.inject({
      method: 'POST',
      url: '/api/v1/opname',
      headers: { authorization: `Bearer ${tokenG}`, 'idempotency-key': crypto.randomUUID() },
      payload: {
        baris: [
          { batch_id: bD, stok_fisik: 0 },
          { batch_id: bE, stok_fisik: 1000 },
          { batch_id: bF, stok_fisik: 600 },
        ],
      },
    });
    expect(op.statusCode).toBe(201);
    const ppOpId = op.json().data.pengajuan.id as number;
    const sahOp = await app.inject({
      method: 'POST',
      url: `/api/v1/pengajuan-pengurangan/${ppOpId}/putuskan`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { keputusan: 'setuju' },
    });
    expect(sahOp.statusCode).toBe(200);

    // 7-11. Jurnal manual 2026-11-12..2026-11-30
    Jam.atur('2026-11-30T17:00:00+07:00');
    tokenP = await masuk('pemilik_s', 'Rahasia123');
    const kirimJm = async (tanggal: string, jenis: string, ket: string, dKode: string, kKode: string, amt: number) => {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/jurnal-manual',
        headers: { authorization: `Bearer ${tokenP}` },
        payload: {
          tanggal,
          jenis,
          keterangan: ket,
          baris: [
            { akun_kode: dKode, debit: amt, kredit: 0 },
            { akun_kode: kKode, debit: 0, kredit: amt },
          ],
        },
      });
      expect(r.statusCode).toBe(201);
    };

    await kirimJm('2026-11-12', 'bayar_utang', 'Bayar utang PBF', '2110', '1110', 3_000_000);
    await kirimJm('2026-11-15', 'beban', 'Beban gaji', '5210', '1110', 600_000);
    await kirimJm('2026-11-16', 'beban', 'Beban listrik & air', '5220', '1110', 400_000);
    await kirimJm('2026-11-17', 'prive', 'Prive pemilik', '3120', '1110', 1_000_000);
    await kirimJm('2026-11-30', 'penyesuaian', 'Penyusutan peralatan', '5240', '1211', 400_000);
    await kirimJm('2026-11-30', 'penyesuaian', 'Utang gaji', '5210', '2120', 900_000);

    // Pemeriksaan sebelum tutup periode 2026-11
    const nsSebelum = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/laporan-keuangan/neraca-saldo?periode=2026-11',
        headers: { authorization: `Bearer ${tokenP}` },
      })
    ).json().data;
    expect(nsSebelum.total_debit).toBe(53_300_000);
    expect(nsSebelum.total_kredit).toBe(53_300_000);

    const lrSebelum = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/laporan-keuangan/laba-rugi?periode=2026-11',
        headers: { authorization: `Bearer ${tokenP}` },
      })
    ).json().data;
    expect(lrSebelum.total_pendapatan).toBe(14_000_000);
    expect(lrSebelum.laba_kotor).toBe(4_800_000);
    expect(lrSebelum.total_beban).toBe(11_900_000);
    expect(lrSebelum.laba_bersih).toBe(2_100_000);

    const neracaSebelum = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/laporan-keuangan/neraca?periode=2026-11',
        headers: { authorization: `Bearer ${tokenP}` },
      })
    ).json().data;
    expect(neracaSebelum.total_aset).toBe(37_600_000);
    expect(neracaSebelum.total_kewajiban).toBe(3_900_000);
    expect(neracaSebelum.total_ekuitas).toBe(33_700_000);
    expect(neracaSebelum.seimbang).toBe(true);

    // 12-13. 2026-12-02 Tutup periode
    Jam.atur('2026-12-02T10:00:00+07:00');
    tokenP = await masuk('pemilik_s', 'Rahasia123');

    const tutup12 = await app.inject({
      method: 'POST',
      url: '/api/v1/periode/2026-12/tutup',
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(tutup12.statusCode).toBe(422);
    expect(tutup12.json().galat.kode).toBe('PERIODE_BELUM_BERAKHIR');

    const tutup11 = await app.inject({
      method: 'POST',
      url: '/api/v1/periode/2026-11/tutup',
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(tutup11.statusCode).toBe(200);

    const jmTertutup = await app.inject({
      method: 'POST',
      url: '/api/v1/jurnal-manual',
      headers: { authorization: `Bearer ${tokenP}` },
      payload: {
        tanggal: '2026-11-20',
        jenis: 'beban',
        keterangan: 'Terlambat',
        baris: [
          { akun_kode: '5210', debit: 10000, kredit: 0 },
          { akun_kode: '1110', debit: 0, kredit: 10000 },
        ],
      },
    });
    expect(jmTertutup.statusCode).toBe(409);
    expect(jmTertutup.json().galat.kode).toBe('PERIODE_DITUTUP');

    const tutupLagi = await app.inject({
      method: 'POST',
      url: '/api/v1/periode/2026-11/tutup',
      headers: { authorization: `Bearer ${tokenP}` },
    });
    expect(tutupLagi.statusCode).toBe(409);
    expect(tutupLagi.json().galat.kode).toBe('PERIODE_SUDAH_DITUTUP');

    // 14. Neraca, Laba Rugi, Neraca Saldo setelah tutup periode
    const neracaSetelah = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/laporan-keuangan/neraca?periode=2026-11',
        headers: { authorization: `Bearer ${tokenP}` },
      })
    ).json().data;
    expect(neracaSetelah.total_aset).toBe(37_600_000);
    expect(neracaSetelah.total_kewajiban).toBe(3_900_000);
    const modalAkhir = neracaSetelah.ekuitas.find((e: { akun_kode: string | null }) => e.akun_kode === '3110');
    expect(modalAkhir.jumlah).toBe(33_700_000);
    expect(neracaSetelah.seimbang).toBe(true);

    const lrSetelah = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/laporan-keuangan/laba-rugi?periode=2026-11',
        headers: { authorization: `Bearer ${tokenP}` },
      })
    ).json().data;
    expect(lrSetelah.laba_bersih).toBe(2_100_000);

    const nsSetelah = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/laporan-keuangan/neraca-saldo?periode=2026-11',
        headers: { authorization: `Bearer ${tokenP}` },
      })
    ).json().data;
    expect(nsSetelah.total_debit).toBe(53_300_000);

    // 15. 2026-12-03 06:30 Job laporanBulanan
    Jam.atur('2026-12-03T06:30:00+07:00');
    await jalankanJobLaporanBulanan();
    await jalankanJobLaporanBulanan(); // idempoten: tanpa duplikasi

    tokenP = await masuk('pemilik_s', 'Rahasia123');
    const lapBul = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/laporan-bulanan/2026-11',
        headers: { authorization: `Bearer ${tokenP}` },
      })
    ).json().data;
    expect(lapBul.status).toBe('terbit');
    expect(lapBul.isi.omzet).toEqual({
      total: 14_000_000,
      jumlah_transaksi: 3,
      per_cara_bayar: { tunai: 10_000_000, qris: 4_000_000, transfer: 0 },
    });
    expect(lapBul.isi.margin_kategori).toEqual([
      { kategori: 'generik', penjualan: 10_000_000, hpp: 6_500_000, laba_kotor: 3_500_000, persen_margin: 35.0 },
      { kategori: 'paten', penjualan: 4_000_000, hpp: 2_700_000, laba_kotor: 1_300_000, persen_margin: 32.5 },
    ]);

    const notifPemilik = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/notifikasi',
        headers: { authorization: `Bearer ${tokenP}` },
      })
    ).json().data as Array<{ jenis: string }>;
    expect(notifPemilik.filter((n) => n.jenis === 'laporan_bulanan_terbit').length).toBe(1);

    // Verifikasi semua invarian 5.5
    await withApotek(apotekId, async (c) => {
      // Invarian 1: batch_barang.stok = SUM(mutasi_stok.jumlah)
      const inv1 = await c.query(
        `SELECT bb.id, bb.stok, COALESCE(SUM(ms.jumlah), 0) AS sum_mutasi
         FROM batch_barang bb
         LEFT JOIN mutasi_stok ms ON ms.batch_id = bb.id
         GROUP BY bb.id, bb.stok
         HAVING bb.stok <> COALESCE(SUM(ms.jumlah), 0)`,
      );
      expect(inv1.rowCount).toBe(0);

      // Invarian 2: saldo akun 1140 = SUM(stok * harga_beli) = 11.400.000
      const r1140 = await c.query<{ saldo: string }>(
        `SELECT COALESCE(SUM(bj.debit) - SUM(bj.kredit), 0) AS saldo
         FROM baris_jurnal bj
         JOIN akun a ON a.id = bj.akun_id
         WHERE a.kode = '1140'`,
      );
      const rPers = await c.query<{ total: string }>(
        `SELECT COALESCE(SUM(stok * harga_beli), 0) AS total FROM batch_barang`,
      );
      expect(keUangBulat(r1140.rows[0]!.saldo)).toBe(11_400_000);
      expect(keUangBulat(rPers.rows[0]!.total)).toBe(11_400_000);

      // Invarian 3: setiap jurnal debit = kredit
      const inv3 = await c.query(
        `SELECT jurnal_id FROM baris_jurnal GROUP BY jurnal_id HAVING SUM(debit) <> SUM(kredit)`,
      );
      expect(inv3.rowCount).toBe(0);

      // Invarian 4: stok sistem tidak pernah negatif
      const inv4 = await c.query(`SELECT id FROM batch_barang WHERE stok < 0`);
      expect(inv4.rowCount).toBe(0);
    });
  });
});
