import path from 'node:path';
import { fileURLToPath } from 'node:url';
import argon2 from 'argon2';
import { getEnv } from '../config/env.js';
import { getPool, tutupSemuaPool } from '../db/pool.js';
import { buatNomorDokumen } from '../lib/nomor.js';
import { Jam } from '../lib/jam.js';
import { buatApotekDenganPemilik } from './apotekBuat.js';

export async function jalankanSeedDemo(): Promise<void> {
  const env = getEnv();
  if (env.NODE_ENV === 'production') {
    throw new Error('seed:demo DILARANG dijalankan di production.');
  }

  const pool = getPool();
  const cek = await pool.query(`SELECT id FROM apotek WHERE kode = 'DEMO1'`);
  if (cek.rowCount && cek.rowCount > 0) {
    console.log('Apotek DEMO1 sudah ada. Melewati seed.');
    return;
  }

  const { apotekId, pemilikId } = await buatApotekDenganPemilik({
    kode: 'DEMO1',
    nama: 'Apotek Demo KADIN Bengkalis',
    alamat: 'Jl. Ahmad Yani No. 1, Bengkalis',
    telepon: '081200000001',
    pemilikUsername: 'pemilik1',
    pemilikNama: 'Pemilik Demo',
    pemilikSandi: 'Demo12345',
    wajibGantiSandi: false,
  });

  const sandiHash = await argon2.hash('Demo12345', { type: argon2.argon2id });
  const penggunaTambahan = [
    { username: 'apoteker1', nama: 'Apoteker Demo', peran: 'apa' },
    { username: 'gudang1', nama: 'Staf Gudang Demo', peran: 'staf_gudang' },
    { username: 'kasir1', nama: 'Kasir Demo', peran: 'kasir' },
  ];

  for (const u of penggunaTambahan) {
    await pool.query(
      `INSERT INTO pengguna (apotek_id, username, nama_lengkap, kata_sandi_hash, peran, wajib_ganti_sandi)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [apotekId, u.username, u.nama, sandiHash, u.peran],
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.apotek_id', $1, true)`, [String(apotekId)]);

    const pbf1 = await client.query<{ id: string }>(
      `INSERT INTO pemasok (apotek_id, kode, nama, nama_kontak, telepon, alamat)
       VALUES ($1, 'PBF01', 'PT Bina San Prima', 'Budi', '081211112222', 'Pekanbaru')
       RETURNING id`,
      [apotekId],
    );
    const pbf2 = await client.query<{ id: string }>(
      `INSERT INTO pemasok (apotek_id, kode, nama, nama_kontak, telepon, alamat)
       VALUES ($1, 'PBF02', 'PT Enseval Putera Megatrading', 'Siti', '081233334444', 'Pekanbaru')
       RETURNING id`,
      [apotekId],
    );
    const pbf1Id = Number(pbf1.rows[0]!.id);
    const pbf2Id = Number(pbf2.rows[0]!.id);

    const daftarBarang = [
      { kode: 'PCT500', barcode: '899000100001', nama: 'Paracetamol 500 mg', kategori: 'generik', golongan: 'bebas', satuan: 'strip', harga: 10000, min: 20, pbf: pbf1Id, beli: 6500, stok: 100, exp: '2027-06-30' },
      { kode: 'AMX500', barcode: '899000100002', nama: 'Amoxicillin 500 mg', kategori: 'generik', golongan: 'keras', satuan: 'strip', harga: 15000, min: 15, pbf: pbf1Id, beli: 10000, stok: 80, exp: '2027-08-31' },
      { kode: 'OBH100', barcode: '899000100003', nama: 'OBH Combi 100 ml', kategori: 'paten', golongan: 'bebas_terbatas', satuan: 'botol', harga: 22000, min: 10, pbf: pbf2Id, beli: 15500, stok: 50, exp: '2027-05-31' },
      { kode: 'ANT01', barcode: '899000100004', nama: 'Antasida Doen', kategori: 'generik', golongan: 'bebas', satuan: 'strip', harga: 6000, min: 20, pbf: pbf1Id, beli: 3500, stok: 120, exp: '2027-09-30' },
      { kode: 'CTM04', barcode: '899000100005', nama: 'CTM 4 mg', kategori: 'generik', golongan: 'bebas_terbatas', satuan: 'strip', harga: 4000, min: 25, pbf: pbf1Id, beli: 2000, stok: 150, exp: '2027-12-31' },
      { kode: 'OMZ20', barcode: '899000100006', nama: 'Omeprazole 20 mg', kategori: 'generik', golongan: 'keras', satuan: 'strip', harga: 18000, min: 10, pbf: pbf2Id, beli: 12000, stok: 60, exp: '2027-07-31' },
      { kode: 'VITC500', barcode: '899000100007', nama: 'Vitamin C 500 mg', kategori: 'paten', golongan: 'bebas', satuan: 'botol', harga: 35000, min: 10, pbf: pbf2Id, beli: 25000, stok: 40, exp: '2028-01-31' },
      { kode: 'PAN500', barcode: '899000100008', nama: 'Panadol Extra', kategori: 'paten', golongan: 'bebas', satuan: 'strip', harga: 14000, min: 15, pbf: pbf2Id, beli: 10500, stok: 90, exp: '2027-10-31' },
      { kode: 'PSE30', barcode: '899000100009', nama: 'Rhinos SR', kategori: 'paten', golongan: 'prekursor', satuan: 'strip', harga: 45000, min: 5, pbf: pbf2Id, beli: 33000, stok: 30, exp: '2027-11-30' },
      { kode: 'CEF500', barcode: '899000100010', nama: 'Cefadroxil 500 mg', kategori: 'generik', golongan: 'keras', satuan: 'strip', harga: 24000, min: 10, pbf: pbf1Id, beli: 17000, stok: 50, exp: '2027-04-30' },
    ];

    const hariIni = Jam.hariIniWib();
    const periode = hariIni.slice(0, 7);
    const waktu = Jam.sekarang().toISO();
    let totalPersediaan = 0;

    const batchMutasi: Array<{ batchId: number; barangId: number; jumlah: number }> = [];

    for (const b of daftarBarang) {
      const brgRes = await client.query<{ id: string }>(
        `INSERT INTO barang
          (apotek_id, kode, barcode, nama, kategori, golongan, satuan, harga_jual, stok_minimum, pemasok_utama_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [apotekId, b.kode, b.barcode, b.nama, b.kategori, b.golongan, b.satuan, b.harga, b.min, b.pbf],
      );
      const barangId = Number(brgRes.rows[0]!.id);

      const batchRes = await client.query<{ id: string }>(
        `INSERT INTO batch_barang
          (apotek_id, barang_id, nomor_batch, tanggal_kedaluwarsa, harga_beli, stok)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [apotekId, barangId, `${b.kode}-01`, b.exp, b.beli, b.stok],
      );
      const batchId = Number(batchRes.rows[0]!.id);
      totalPersediaan += b.beli * b.stok;
      batchMutasi.push({ batchId, barangId, jumlah: b.stok });
    }

    const nomorJu = await buatNomorDokumen(client, apotekId, 'JU', hariIni);
    const jRes = await client.query<{ id: string }>(
      `INSERT INTO jurnal (apotek_id, nomor, tanggal, periode, jenis, keterangan, dibuat_oleh)
       VALUES ($1, $2, $3, $4, 'saldo_awal', 'Saldo awal demo', $5)
       RETURNING id`,
      [apotekId, nomorJu, hariIni, periode, pemilikId],
    );
    const jurnalId = Number(jRes.rows[0]!.id);

    for (const m of batchMutasi) {
      await client.query(
        `INSERT INTO mutasi_stok (apotek_id, batch_id, barang_id, jenis, jumlah, waktu, sumber_tipe, sumber_id)
         VALUES ($1, $2, $3, 'saldo_awal', $4, $5, 'jurnal', $6)`,
        [apotekId, m.batchId, m.barangId, m.jumlah, waktu, jurnalId],
      );
    }

    const akunRes = await client.query<{ id: string; kode: string }>(
      `SELECT id, kode FROM akun WHERE kode IN ('1110', '1140', '3110')`,
    );
    const petaAkun = new Map(akunRes.rows.map((r) => [r.kode, Number(r.id)]));

    const kasAwal = 10_000_000;
    const modalAwal = kasAwal + totalPersediaan;

    await client.query(
      `INSERT INTO baris_jurnal (apotek_id, jurnal_id, akun_id, debit, kredit) VALUES
       ($1, $2, $3, $4, 0),
       ($1, $2, $5, $6, 0),
       ($1, $2, $7, 0, $8)`,
      [
        apotekId,
        jurnalId,
        petaAkun.get('1110'),
        kasAwal,
        petaAkun.get('1140'),
        totalPersediaan,
        petaAkun.get('3110'),
        modalAwal,
      ],
    );

    await client.query('COMMIT');
    console.log('Seed demo selesai untuk apotek DEMO1 (sandi semua akun: Demo12345).');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  jalankanSeedDemo()
    .then(async () => {
      await tutupSemuaPool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seed demo gagal:', err);
      await tutupSemuaPool();
      process.exit(1);
    });
}
