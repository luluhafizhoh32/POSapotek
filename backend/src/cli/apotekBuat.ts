import path from 'node:path';
import { fileURLToPath } from 'node:url';
import argon2 from 'argon2';
import { getPool, tutupSemuaPool } from '../db/pool.js';
import { catatAudit } from '../lib/audit.js';

export const AKUN_AWAL: Array<{
  kode: string;
  nama: string;
  tipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban';
  saldo_normal: 'debit' | 'kredit';
}> = [
  { kode: '1110', nama: 'Kas', tipe: 'aset', saldo_normal: 'debit' },
  { kode: '1120', nama: 'Bank & QRIS', tipe: 'aset', saldo_normal: 'debit' },
  { kode: '1140', nama: 'Persediaan', tipe: 'aset', saldo_normal: 'debit' },
  { kode: '1141', nama: 'Cadangan Kedaluwarsa', tipe: 'aset', saldo_normal: 'kredit' },
  { kode: '1210', nama: 'Peralatan', tipe: 'aset', saldo_normal: 'debit' },
  { kode: '1211', nama: 'Akumulasi Penyusutan', tipe: 'aset', saldo_normal: 'kredit' },
  { kode: '2110', nama: 'Utang Usaha', tipe: 'kewajiban', saldo_normal: 'kredit' },
  { kode: '2120', nama: 'Utang Beban', tipe: 'kewajiban', saldo_normal: 'kredit' },
  { kode: '3110', nama: 'Modal', tipe: 'ekuitas', saldo_normal: 'kredit' },
  { kode: '3120', nama: 'Prive', tipe: 'ekuitas', saldo_normal: 'debit' },
  { kode: '3130', nama: 'Ikhtisar Laba Rugi', tipe: 'ekuitas', saldo_normal: 'kredit' },
  { kode: '4110', nama: 'Penjualan', tipe: 'pendapatan', saldo_normal: 'kredit' },
  { kode: '5110', nama: 'Harga Pokok Penjualan', tipe: 'beban', saldo_normal: 'debit' },
  { kode: '5120', nama: 'Selisih Persediaan', tipe: 'beban', saldo_normal: 'debit' },
  { kode: '5130', nama: 'Kerugian Kedaluwarsa', tipe: 'beban', saldo_normal: 'debit' },
  { kode: '5210', nama: 'Beban Gaji', tipe: 'beban', saldo_normal: 'debit' },
  { kode: '5220', nama: 'Beban Utilitas', tipe: 'beban', saldo_normal: 'debit' },
  { kode: '5240', nama: 'Beban Penyusutan', tipe: 'beban', saldo_normal: 'debit' },
];

export interface InputApotekBuat {
  kode: string;
  nama: string;
  alamat?: string | null;
  telepon?: string | null;
  pemilikUsername: string;
  pemilikNama: string;
  pemilikSandi: string;
  wajibGantiSandi?: boolean;
}

export async function buatApotekDenganPemilik(input: InputApotekBuat): Promise<{
  apotekId: number;
  pemilikId: number;
}> {
  const hash = await argon2.hash(input.pemilikSandi, { type: argon2.argon2id });
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const resApotek = await client.query<{ id: string }>(
      `INSERT INTO apotek (kode, nama, alamat, telepon)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.kode, input.nama, input.alamat ?? null, input.telepon ?? null],
    );
    const apotekId = Number(resApotek.rows[0]!.id);

    // Tetapkan konteks RLS untuk transaksi ini agar insert ke pengaturan_apotek, akun, jejak_audit diizinkan
    await client.query(`SELECT set_config('app.apotek_id', $1, true)`, [String(apotekId)]);

    await client.query(
      `INSERT INTO pengaturan_apotek (apotek_id) VALUES ($1)`,
      [apotekId],
    );

    for (const a of AKUN_AWAL) {
      await client.query(
        `INSERT INTO akun (apotek_id, kode, nama, tipe, saldo_normal)
         VALUES ($1, $2, $3, $4, $5)`,
        [apotekId, a.kode, a.nama, a.tipe, a.saldo_normal],
      );
    }

    const resPemilik = await client.query<{ id: string }>(
      `INSERT INTO pengguna (apotek_id, username, nama_lengkap, kata_sandi_hash, peran, wajib_ganti_sandi)
       VALUES ($1, $2, $3, $4, 'pemilik', $5)
       RETURNING id`,
      [
        apotekId,
        input.pemilikUsername.toLowerCase(),
        input.pemilikNama,
        hash,
        input.wajibGantiSandi ?? true,
      ],
    );
    const pemilikId = Number(resPemilik.rows[0]!.id);

    await catatAudit(client, {
      apotekId,
      penggunaId: pemilikId,
      aksi: 'apotek.buat',
      entitas: 'apotek',
      entitasId: apotekId,
      hasil: 'berhasil',
      detail: { kode: input.kode, pemilik_username: input.pemilikUsername.toLowerCase() },
    });

    await client.query('COMMIT');
    return { apotekId, pemilikId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1];
      if (val !== undefined && !val.startsWith('--')) {
        hasil[key] = val;
        i++;
      } else {
        hasil[key] = 'true';
      }
    }
  }
  return hasil;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const wajib = ['kode', 'nama', 'pemilik-username', 'pemilik-nama', 'pemilik-sandi'];
  for (const k of wajib) {
    if (!args[k]) {
      console.error(`Argumen --${k} wajib diisi.`);
      process.exit(1);
    }
  }
  buatApotekDenganPemilik({
    kode: args['kode']!,
    nama: args['nama']!,
    alamat: args['alamat'] ?? null,
    telepon: args['telepon'] ?? null,
    pemilikUsername: args['pemilik-username']!,
    pemilikNama: args['pemilik-nama']!,
    pemilikSandi: args['pemilik-sandi']!,
  })
    .then(async (res) => {
      console.log(`Apotek berhasil dibuat: id=${res.apotekId}, pemilikId=${res.pemilikId}`);
      await tutupSemuaPool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Gagal membuat apotek:', err);
      await tutupSemuaPool();
      process.exit(1);
    });
}
