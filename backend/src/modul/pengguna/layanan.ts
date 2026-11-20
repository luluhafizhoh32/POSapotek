import argon2 from 'argon2';
import { z } from 'zod';
import { getPool } from '../../db/pool.js';
import { withTransaksi } from '../../db/withApotek.js';
import { catatAudit } from '../../lib/audit.js';
import type { KonteksPengguna, PeranPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam } from '../../lib/jam.js';
import { skemaPaginasi, skemaUsername, teksWajib } from '../../lib/validasi.js';
import { validasiKebijakanSandi } from '../auth/layanan.js';

export const skemaDaftarPengguna = skemaPaginasi.extend({
  peran: z.enum(['kasir', 'staf_gudang', 'apa', 'pemilik']).optional(),
  aktif: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().trim().max(100).optional(),
});

export const skemaBuatPengguna = z
  .object({
    username: skemaUsername,
    nama_lengkap: teksWajib(1, 150),
    peran: z.enum(['kasir', 'staf_gudang', 'apa']),
    kata_sandi_awal: z.string().min(8).max(72),
  })
  .strict();

export const skemaUbahPengguna = z
  .object({
    nama_lengkap: teksWajib(1, 150),
    peran: z.enum(['kasir', 'staf_gudang', 'apa']),
  })
  .strict();

export const skemaResetSandi = z
  .object({
    kata_sandi_baru: z.string().min(8).max(72),
  })
  .strict();

interface BarisPengguna {
  id: string;
  username: string;
  nama_lengkap: string;
  peran: PeranPengguna;
  aktif: boolean;
  wajib_ganti_sandi: boolean;
  dibuat_pada: Date;
}

function petakanPengguna(row: BarisPengguna) {
  return {
    id: Number(row.id),
    username: row.username,
    nama_lengkap: row.nama_lengkap,
    peran: row.peran,
    aktif: row.aktif,
    wajib_ganti_sandi: row.wajib_ganti_sandi,
    dibuat_pada: Jam.keIsoWib(row.dibuat_pada),
  };
}

export async function daftarPenggunaLayanan(
  apotekId: number,
  query: z.infer<typeof skemaDaftarPengguna>,
) {
  const kondisi: string[] = ['apotek_id = $1'];
  const params: unknown[] = [apotekId];

  if (query.peran) {
    params.push(query.peran);
    kondisi.push(`peran = $${params.length}`);
  }
  if (query.aktif !== undefined) {
    params.push(query.aktif);
    kondisi.push(`aktif = $${params.length}`);
  }
  if (query.q && query.q.length > 0) {
    params.push(`%${query.q.toLowerCase()}%`);
    kondisi.push(`(lower(nama_lengkap) LIKE $${params.length} OR lower(username) LIKE $${params.length})`);
  }

  const whereSql = kondisi.join(' AND ');
  const pool = getPool();

  const totalRes = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt FROM pengguna WHERE ${whereSql}`,
    params,
  );
  const total = Number(totalRes.rows[0]?.cnt ?? 0);

  const offset = (query.halaman - 1) * query.per_halaman;
  const rowsRes = await pool.query<BarisPengguna>(
    `SELECT id, username, nama_lengkap, peran, aktif, wajib_ganti_sandi, dibuat_pada
     FROM pengguna
     WHERE ${whereSql}
     ORDER BY nama_lengkap ASC, id ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, query.per_halaman, offset],
  );

  return {
    data: rowsRes.rows.map(petakanPengguna),
    meta: {
      halaman: query.halaman,
      per_halaman: query.per_halaman,
      total,
    },
  };
}

export async function buatPenggunaLayanan(
  pembuat: KonteksPengguna,
  input: z.infer<typeof skemaBuatPengguna>,
) {
  const pesanSandi = validasiKebijakanSandi(input.kata_sandi_awal, input.username);
  if (pesanSandi) {
    throw new GalatAplikasi('VALIDASI_GAGAL', { kata_sandi_awal: [pesanSandi] });
  }

  const pool = getPool();
  const cek = await pool.query('SELECT 1 FROM pengguna WHERE username = $1', [input.username]);
  if (cek.rowCount && cek.rowCount > 0) {
    throw new GalatAplikasi('DUPLIKAT', { field: 'username' });
  }

  const hash = await argon2.hash(input.kata_sandi_awal, { type: argon2.argon2id });
  const sekarang = Jam.sekarang();

  const row = await withTransaksi(async (client) => {
    await client.query(`SELECT set_config('app.apotek_id', $1, true)`, [String(pembuat.apotekId)]);
    let inserted: BarisPengguna;
    try {
      const res = await client.query<BarisPengguna>(
        `INSERT INTO pengguna
          (apotek_id, username, nama_lengkap, kata_sandi_hash, peran, wajib_ganti_sandi, dibuat_pada, diubah_pada)
         VALUES ($1, $2, $3, $4, $5, true, $6, $6)
         RETURNING id, username, nama_lengkap, peran, aktif, wajib_ganti_sandi, dibuat_pada`,
        [pembuat.apotekId, input.username, input.nama_lengkap, hash, input.peran, sekarang.toISO()],
      );
      inserted = res.rows[0]!;
    } catch (err) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new GalatAplikasi('DUPLIKAT', { field: 'username' });
      }
      throw err;
    }

    await catatAudit(client, {
      apotekId: pembuat.apotekId,
      penggunaId: pembuat.id,
      aksi: 'pengguna.buat',
      entitas: 'pengguna',
      entitasId: inserted.id,
      hasil: 'berhasil',
      detail: { username: inserted.username, peran: inserted.peran },
    });

    return inserted;
  });

  return petakanPengguna(row);
}

export async function ambilPenggunaLayanan(apotekId: number, targetId: number) {
  const res = await getPool().query<BarisPengguna>(
    `SELECT id, username, nama_lengkap, peran, aktif, wajib_ganti_sandi, dibuat_pada
     FROM pengguna
     WHERE id = $1 AND apotek_id = $2`,
    [targetId, apotekId],
  );
  const row = res.rows[0];
  if (!row) {
    throw new GalatAplikasi('TIDAK_DITEMUKAN');
  }
  return petakanPengguna(row);
}

export async function ubahPenggunaLayanan(
  pembuat: KonteksPengguna,
  targetId: number,
  input: z.infer<typeof skemaUbahPengguna>,
) {
  if (targetId === pembuat.id) {
    throw new GalatAplikasi('DILARANG');
  }

  const sekarang = Jam.sekarang();

  const row = await withTransaksi(async (client) => {
    await client.query(`SELECT set_config('app.apotek_id', $1, true)`, [String(pembuat.apotekId)]);
    const existingRes = await client.query<BarisPengguna>(
      `SELECT id, username, nama_lengkap, peran, aktif, wajib_ganti_sandi, dibuat_pada
       FROM pengguna WHERE id = $1 AND apotek_id = $2 FOR UPDATE`,
      [targetId, pembuat.apotekId],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new GalatAplikasi('TIDAK_DITEMUKAN');
    }
    if (existing.peran === 'pemilik') {
      throw new GalatAplikasi('DILARANG');
    }

    const updatedRes = await client.query<BarisPengguna>(
      `UPDATE pengguna SET nama_lengkap = $1, peran = $2, diubah_pada = $3
       WHERE id = $4 AND apotek_id = $5
       RETURNING id, username, nama_lengkap, peran, aktif, wajib_ganti_sandi, dibuat_pada`,
      [input.nama_lengkap, input.peran, sekarang.toISO(), targetId, pembuat.apotekId],
    );
    const updated = updatedRes.rows[0]!;

    if (existing.peran !== input.peran) {
      await client.query(
        `UPDATE sesi_login SET dicabut_pada = $1 WHERE pengguna_id = $2 AND dicabut_pada IS NULL`,
        [sekarang.toISO(), targetId],
      );
    }

    await catatAudit(client, {
      apotekId: pembuat.apotekId,
      penggunaId: pembuat.id,
      aksi: 'pengguna.ubah',
      entitas: 'pengguna',
      entitasId: targetId,
      hasil: 'berhasil',
      detail: { peran_lama: existing.peran, peran_baru: input.peran },
    });

    return updated;
  });

  return petakanPengguna(row);
}

export async function setAktifPenggunaLayanan(
  pembuat: KonteksPengguna,
  targetId: number,
  aktif: boolean,
) {
  if (!aktif && targetId === pembuat.id) {
    throw new GalatAplikasi('DILARANG');
  }

  const sekarang = Jam.sekarang();

  const row = await withTransaksi(async (client) => {
    await client.query(`SELECT set_config('app.apotek_id', $1, true)`, [String(pembuat.apotekId)]);
    const existingRes = await client.query<BarisPengguna>(
      `SELECT id, username, nama_lengkap, peran, aktif, wajib_ganti_sandi, dibuat_pada
       FROM pengguna WHERE id = $1 AND apotek_id = $2 FOR UPDATE`,
      [targetId, pembuat.apotekId],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new GalatAplikasi('TIDAK_DITEMUKAN');
    }
    if (!aktif && existing.peran === 'pemilik') {
      throw new GalatAplikasi('DILARANG');
    }

    const updatedRes = await client.query<BarisPengguna>(
      `UPDATE pengguna SET aktif = $1, diubah_pada = $2
       WHERE id = $3 AND apotek_id = $4
       RETURNING id, username, nama_lengkap, peran, aktif, wajib_ganti_sandi, dibuat_pada`,
      [aktif, sekarang.toISO(), targetId, pembuat.apotekId],
    );

    if (!aktif) {
      await client.query(
        `UPDATE sesi_login SET dicabut_pada = $1 WHERE pengguna_id = $2 AND dicabut_pada IS NULL`,
        [sekarang.toISO(), targetId],
      );
    }

    await catatAudit(client, {
      apotekId: pembuat.apotekId,
      penggunaId: pembuat.id,
      aksi: aktif ? 'pengguna.aktifkan' : 'pengguna.nonaktifkan',
      entitas: 'pengguna',
      entitasId: targetId,
      hasil: 'berhasil',
    });

    return updatedRes.rows[0]!;
  });

  return petakanPengguna(row);
}

export async function resetSandiPenggunaLayanan(
  pembuat: KonteksPengguna,
  targetId: number,
  input: z.infer<typeof skemaResetSandi>,
): Promise<void> {
  const sekarang = Jam.sekarang();

  await withTransaksi(async (client) => {
    await client.query(`SELECT set_config('app.apotek_id', $1, true)`, [String(pembuat.apotekId)]);
    const existingRes = await client.query<{ id: string; username: string; peran: PeranPengguna }>(
      `SELECT id, username, peran FROM pengguna WHERE id = $1 AND apotek_id = $2 FOR UPDATE`,
      [targetId, pembuat.apotekId],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new GalatAplikasi('TIDAK_DITEMUKAN');
    }
    if (existing.peran === 'pemilik') {
      throw new GalatAplikasi('DILARANG');
    }

    const pesanSandi = validasiKebijakanSandi(input.kata_sandi_baru, existing.username);
    if (pesanSandi) {
      throw new GalatAplikasi('VALIDASI_GAGAL', { kata_sandi_baru: [pesanSandi] });
    }

    const hash = await argon2.hash(input.kata_sandi_baru, { type: argon2.argon2id });
    await client.query(
      `UPDATE pengguna
       SET kata_sandi_hash = $1, wajib_ganti_sandi = true,
           gagal_masuk_berturut = 0, terkunci_sampai = NULL, diubah_pada = $2
       WHERE id = $3 AND apotek_id = $4`,
      [hash, sekarang.toISO(), targetId, pembuat.apotekId],
    );
    await client.query(
      `UPDATE sesi_login SET dicabut_pada = $1 WHERE pengguna_id = $2 AND dicabut_pada IS NULL`,
      [sekarang.toISO(), targetId],
    );

    await catatAudit(client, {
      apotekId: pembuat.apotekId,
      penggunaId: pembuat.id,
      aksi: 'pengguna.reset_sandi',
      entitas: 'pengguna',
      entitasId: targetId,
      hasil: 'berhasil',
    });
  });
}
