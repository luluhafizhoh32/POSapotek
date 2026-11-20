import crypto from 'node:crypto';
import argon2 from 'argon2';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { getEnv } from '../../config/env.js';
import { getPool } from '../../db/pool.js';
import { withTransaksi } from '../../db/withApotek.js';
import { catatAudit, catatAuditGagal } from '../../lib/audit.js';
import type { KonteksPengguna, PeranPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam } from '../../lib/jam.js';
import { skemaUsername, teksOpsional } from '../../lib/validasi.js';

// Hash tiruan untuk menyamakan waktu saat username tidak ditemukan
let _hashTiruan: string | null = null;
async function getHashTiruan(): Promise<string> {
  if (!_hashTiruan) {
    _hashTiruan = await argon2.hash('kata_sandi_tiruan_123', { type: argon2.argon2id });
  }
  return _hashTiruan;
}

export function validasiKebijakanSandi(sandi: string, username: string): string | null {
  if (sandi.length < 8 || sandi.length > 72) {
    return 'Kata sandi harus 8-72 karakter.';
  }
  if (!/[A-Za-z]/.test(sandi) || !/[0-9]/.test(sandi)) {
    return 'Kata sandi harus mengandung minimal 1 huruf dan 1 angka.';
  }
  if (sandi.toLowerCase() === username.toLowerCase()) {
    return 'Kata sandi tidak boleh sama dengan username.';
  }
  return null;
}

export const skemaMasuk = z
  .object({
    username: skemaUsername,
    kata_sandi: z.string().min(1).max(72),
    perangkat: teksOpsional(150).optional(),
  })
  .strict();

export const skemaSegarkan = z
  .object({
    token_segar: z.string().trim().min(1),
  })
  .strict();

export const skemaGantiSandi = z
  .object({
    kata_sandi_lama: z.string().min(1).max(72),
    kata_sandi_baru: z.string().min(8).max(72),
  })
  .strict();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function buatPasanganToken(params: {
  penggunaId: number;
  apotekId: number;
  peran: PeranPengguna;
  keluargaId: string;
}): Promise<{ tokenAkses: string; tokenSegar: string; kedaluwarsaDalamDetik: number }> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const kedaluwarsaDalamDetik = env.JWT_AKSES_MENIT * 60;
  const sekarangDetik = Math.floor(Jam.sekarang().toSeconds());

  const tokenAkses = await new SignJWT({
    apo: params.apotekId,
    per: params.peran,
    kel: params.keluargaId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(params.penggunaId))
    .setIssuedAt(sekarangDetik)
    .setExpirationTime(sekarangDetik + kedaluwarsaDalamDetik)
    .sign(secret);

  const tokenSegar = crypto.randomBytes(32).toString('hex');
  return { tokenAkses, tokenSegar, kedaluwarsaDalamDetik };
}

export async function masukLayanan(input: z.infer<typeof skemaMasuk>) {
  const pool = getPool();
  const res = await pool.query<{
    id: string;
    apotek_id: string;
    apotek_kode: string;
    apotek_nama: string;
    apotek_aktif: boolean;
    username: string;
    nama_lengkap: string;
    kata_sandi_hash: string;
    peran: PeranPengguna;
    aktif: boolean;
    wajib_ganti_sandi: boolean;
    gagal_masuk_berturut: number;
    terkunci_sampai: Date | null;
  }>(
    `SELECT p.id, p.apotek_id, a.kode AS apotek_kode, a.nama AS apotek_nama,
            a.aktif AS apotek_aktif, p.username, p.nama_lengkap, p.kata_sandi_hash,
            p.peran, p.aktif, p.wajib_ganti_sandi, p.gagal_masuk_berturut, p.terkunci_sampai
     FROM pengguna p
     JOIN apotek a ON a.id = p.apotek_id
     WHERE p.username = $1`,
    [input.username],
  );

  const user = res.rows[0];
  if (!user) {
    await argon2.verify(await getHashTiruan(), input.kata_sandi).catch(() => false);
    throw new GalatAplikasi('KREDENSIAL_SALAH');
  }

  const penggunaId = Number(user.id);
  const apotekId = Number(user.apotek_id);
  const sekarang = Jam.sekarang();

  if (user.terkunci_sampai && user.terkunci_sampai.getTime() > sekarang.toMillis()) {
    const terkunciIso = Jam.keIsoWib(user.terkunci_sampai);
    await catatAuditGagal({
      apotekId,
      penggunaId,
      aksi: 'auth.masuk',
      entitas: 'pengguna',
      entitasId: penggunaId,
      kodeGalat: 'AKUN_TERKUNCI',
    });
    throw new GalatAplikasi('AKUN_TERKUNCI', { terkunci_sampai: terkunciIso });
  }

  const cocok = await argon2.verify(user.kata_sandi_hash, input.kata_sandi);
  if (!cocok) {
    const gagalBaru = user.gagal_masuk_berturut + 1;
    if (gagalBaru >= 5) {
      const sampai = sekarang.plus({ minutes: 15 });
      await pool.query(
        `UPDATE pengguna SET gagal_masuk_berturut = 0, terkunci_sampai = $1, diubah_pada = $2 WHERE id = $3`,
        [sampai.toISO(), sekarang.toISO(), penggunaId],
      );
      await catatAuditGagal({
        apotekId,
        penggunaId,
        aksi: 'auth.masuk',
        entitas: 'pengguna',
        entitasId: penggunaId,
        kodeGalat: 'AKUN_TERKUNCI',
      });
      throw new GalatAplikasi('AKUN_TERKUNCI', { terkunci_sampai: Jam.keIsoWib(sampai) });
    } else {
      await pool.query(
        `UPDATE pengguna SET gagal_masuk_berturut = $1, diubah_pada = $2 WHERE id = $3`,
        [gagalBaru, sekarang.toISO(), penggunaId],
      );
      await catatAuditGagal({
        apotekId,
        penggunaId,
        aksi: 'auth.masuk',
        entitas: 'pengguna',
        entitasId: penggunaId,
        kodeGalat: 'KREDENSIAL_SALAH',
      });
      throw new GalatAplikasi('KREDENSIAL_SALAH');
    }
  }

  if (!user.aktif || !user.apotek_aktif) {
    await catatAuditGagal({
      apotekId,
      penggunaId,
      aksi: 'auth.masuk',
      entitas: 'pengguna',
      entitasId: penggunaId,
      kodeGalat: 'AKUN_NONAKTIF',
    });
    throw new GalatAplikasi('AKUN_NONAKTIF');
  }

  const keluargaId = crypto.randomUUID();
  const { tokenAkses, tokenSegar, kedaluwarsaDalamDetik } = await buatPasanganToken({
    penggunaId,
    apotekId,
    peran: user.peran,
    keluargaId,
  });

  const env = getEnv();
  const kedaluwarsaSegar = sekarang.plus({ days: env.TOKEN_SEGAR_HARI });

  await withTransaksi(async (client) => {
    await client.query(`SELECT set_config('app.apotek_id', $1, true)`, [String(apotekId)]);
    await client.query(
      `UPDATE pengguna SET gagal_masuk_berturut = 0, terkunci_sampai = NULL, diubah_pada = $1 WHERE id = $2`,
      [sekarang.toISO(), penggunaId],
    );
    await client.query(
      `INSERT INTO sesi_login (pengguna_id, keluarga_id, hash_token, perangkat, dibuat_pada, kedaluwarsa_pada)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        penggunaId,
        keluargaId,
        hashToken(tokenSegar),
        input.perangkat ?? null,
        sekarang.toISO(),
        kedaluwarsaSegar.toISO(),
      ],
    );
    await catatAudit(client, {
      apotekId,
      penggunaId,
      aksi: 'auth.masuk',
      entitas: 'pengguna',
      entitasId: penggunaId,
      hasil: 'berhasil',
    });
  });

  return {
    token_akses: tokenAkses,
    tipe: 'Bearer' as const,
    kedaluwarsa_dalam_detik: kedaluwarsaDalamDetik,
    token_segar: tokenSegar,
    pengguna: {
      id: penggunaId,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      peran: user.peran,
      wajib_ganti_sandi: user.wajib_ganti_sandi,
      apotek: {
        id: apotekId,
        kode: user.apotek_kode,
        nama: user.apotek_nama,
      },
    },
  };
}

export async function segarkanLayanan(tokenSegarMasuk: string) {
  const hash = hashToken(tokenSegarMasuk);
  const sekarang = Jam.sekarang();

  const res = await getPool().query<{
    sesi_id: string;
    pengguna_id: string;
    keluarga_id: string;
    perangkat: string | null;
    kedaluwarsa_pada: Date;
    dicabut_pada: Date | null;
    apotek_id: string;
    apotek_kode: string;
    apotek_nama: string;
    apotek_aktif: boolean;
    username: string;
    nama_lengkap: string;
    peran: PeranPengguna;
    aktif: boolean;
    wajib_ganti_sandi: boolean;
  }>(
    `SELECT s.id AS sesi_id, s.pengguna_id, s.keluarga_id, s.perangkat,
            s.kedaluwarsa_pada, s.dicabut_pada,
            p.apotek_id, a.kode AS apotek_kode, a.nama AS apotek_nama, a.aktif AS apotek_aktif,
            p.username, p.nama_lengkap, p.peran, p.aktif, p.wajib_ganti_sandi
     FROM sesi_login s
     JOIN pengguna p ON p.id = s.pengguna_id
     JOIN apotek a ON a.id = p.apotek_id
     WHERE s.hash_token = $1`,
    [hash],
  );

  const row = res.rows[0];
  if (!row) {
    throw new GalatAplikasi('TOKEN_TIDAK_VALID');
  }

  const penggunaId = Number(row.pengguna_id);
  const apotekId = Number(row.apotek_id);

  // Jika token yang sudah dicabut dipakai lagi -> cabut seluruh keluarga sesi
  if (row.dicabut_pada !== null) {
    await getPool().query(
      `UPDATE sesi_login SET dicabut_pada = $1 WHERE keluarga_id = $2 AND dicabut_pada IS NULL`,
      [sekarang.toISO(), row.keluarga_id],
    );
    await catatAuditGagal({
      apotekId,
      penggunaId,
      aksi: 'auth.segarkan',
      entitas: 'sesi_login',
      entitasId: row.sesi_id,
      kodeGalat: 'TOKEN_TIDAK_VALID',
      detail: { alasan: 'token_dicabut_dipakai_ulang' },
    });
    throw new GalatAplikasi('TOKEN_TIDAK_VALID');
  }

  if (row.kedaluwarsa_pada.getTime() <= sekarang.toMillis()) {
    throw new GalatAplikasi('TOKEN_TIDAK_VALID');
  }

  if (!row.aktif || !row.apotek_aktif) {
    throw new GalatAplikasi('AKUN_NONAKTIF');
  }

  const { tokenAkses, tokenSegar, kedaluwarsaDalamDetik } = await buatPasanganToken({
    penggunaId,
    apotekId,
    peran: row.peran,
    keluargaId: row.keluarga_id,
  });

  const env = getEnv();
  const kedaluwarsaSegar = sekarang.plus({ days: env.TOKEN_SEGAR_HARI });
  const sesiBaruId = crypto.randomUUID();

  await withTransaksi(async (client) => {
    await client.query(
      `INSERT INTO sesi_login (id, pengguna_id, keluarga_id, hash_token, perangkat, dibuat_pada, kedaluwarsa_pada)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sesiBaruId,
        penggunaId,
        row.keluarga_id,
        hashToken(tokenSegar),
        row.perangkat,
        sekarang.toISO(),
        kedaluwarsaSegar.toISO(),
      ],
    );
    await client.query(
      `UPDATE sesi_login SET dicabut_pada = $1, diganti_oleh = $2 WHERE id = $3`,
      [sekarang.toISO(), sesiBaruId, row.sesi_id],
    );
  });

  return {
    token_akses: tokenAkses,
    tipe: 'Bearer' as const,
    kedaluwarsa_dalam_detik: kedaluwarsaDalamDetik,
    token_segar: tokenSegar,
    pengguna: {
      id: penggunaId,
      username: row.username,
      nama_lengkap: row.nama_lengkap,
      peran: row.peran,
      wajib_ganti_sandi: row.wajib_ganti_sandi,
      apotek: {
        id: apotekId,
        kode: row.apotek_kode,
        nama: row.apotek_nama,
      },
    },
  };
}

export async function keluarLayanan(penggunaId: number, tokenSegar: string): Promise<void> {
  const hash = hashToken(tokenSegar);
  await getPool().query(
    `UPDATE sesi_login SET dicabut_pada = $1
     WHERE hash_token = $2 AND pengguna_id = $3 AND dicabut_pada IS NULL`,
    [Jam.sekarang().toISO(), hash, penggunaId],
  );
}

export async function gantiSandiLayanan(
  pengguna: KonteksPengguna,
  input: z.infer<typeof skemaGantiSandi>,
): Promise<void> {
  if (input.kata_sandi_baru === input.kata_sandi_lama) {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      kata_sandi_baru: ['Kata sandi baru tidak boleh sama dengan kata sandi lama.'],
    });
  }

  const pesanSandi = validasiKebijakanSandi(input.kata_sandi_baru, pengguna.username);
  if (pesanSandi) {
    throw new GalatAplikasi('VALIDASI_GAGAL', { kata_sandi_baru: [pesanSandi] });
  }

  const res = await getPool().query<{ kata_sandi_hash: string }>(
    `SELECT kata_sandi_hash FROM pengguna WHERE id = $1`,
    [pengguna.id],
  );
  const row = res.rows[0];
  if (!row) {
    throw new GalatAplikasi('TIDAK_DITEMUKAN');
  }

  const cocok = await argon2.verify(row.kata_sandi_hash, input.kata_sandi_lama);
  if (!cocok) {
    await catatAuditGagal({
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'auth.ganti_sandi',
      entitas: 'pengguna',
      entitasId: pengguna.id,
      kodeGalat: 'KREDENSIAL_SALAH',
    });
    throw new GalatAplikasi('KREDENSIAL_SALAH');
  }

  const hashBaru = await argon2.hash(input.kata_sandi_baru, { type: argon2.argon2id });
  const sekarang = Jam.sekarang();

  await withTransaksi(async (client) => {
    await client.query(`SELECT set_config('app.apotek_id', $1, true)`, [String(pengguna.apotekId)]);
    await client.query(
      `UPDATE pengguna SET kata_sandi_hash = $1, wajib_ganti_sandi = false, diubah_pada = $2 WHERE id = $3`,
      [hashBaru, sekarang.toISO(), pengguna.id],
    );
    await client.query(
      `UPDATE sesi_login SET dicabut_pada = $1
       WHERE pengguna_id = $2 AND keluarga_id <> $3 AND dicabut_pada IS NULL`,
      [sekarang.toISO(), pengguna.id, pengguna.keluargaId],
    );
    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'auth.ganti_sandi',
      entitas: 'pengguna',
      entitasId: pengguna.id,
      hasil: 'berhasil',
    });
  });
}

export function formatProfilSaya(pengguna: KonteksPengguna) {
  return {
    id: pengguna.id,
    username: pengguna.username,
    nama_lengkap: pengguna.namaLengkap,
    peran: pengguna.peran,
    wajib_ganti_sandi: pengguna.wajibGantiSandi,
    apotek: {
      id: pengguna.apotekId,
      kode: pengguna.apotekKode,
      nama: pengguna.apotekNama,
    },
  };
}
