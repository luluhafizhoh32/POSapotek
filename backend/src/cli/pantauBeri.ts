import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, tutupSemuaPool } from '../db/pool.js';

export async function beriAksesPantau(username: string, apotekKode: string): Promise<void> {
  const pool = getPool();

  const userRes = await pool.query<{ id: string; peran: string; apotek_id: string }>(
    `SELECT id, peran, apotek_id FROM pengguna WHERE username = $1`,
    [username.toLowerCase()],
  );
  const user = userRes.rows[0];
  if (!user) {
    throw new Error(`Pengguna '${username}' tidak ditemukan.`);
  }
  if (user.peran !== 'pemilik') {
    throw new Error(`Pengguna '${username}' bukan berperan 'pemilik'.`);
  }

  const apotekRes = await pool.query<{ id: string }>(
    `SELECT id FROM apotek WHERE kode = $1`,
    [apotekKode.toUpperCase()],
  );
  const apotek = apotekRes.rows[0];
  if (!apotek) {
    throw new Error(`Apotek berkode '${apotekKode}' tidak ditemukan.`);
  }

  await pool.query(
    `INSERT INTO akses_pantau (pengguna_id, apotek_id)
     VALUES ($1, $2)
     ON CONFLICT (pengguna_id, apotek_id) DO NOTHING`,
    [user.id, apotek.id],
  );
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
      }
    }
  }
  return hasil;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!args['username'] || !args['apotek-kode']) {
    console.error('Argumen --username dan --apotek-kode wajib diisi.');
    process.exit(1);
  }
  beriAksesPantau(args['username'], args['apotek-kode'])
    .then(async () => {
      console.log(`Akses pantau diberikan kepada '${args['username']}' untuk apotek '${args['apotek-kode']}'.`);
      await tutupSemuaPool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Gagal memberi akses pantau:', err);
      await tutupSemuaPool();
      process.exit(1);
    });
}
