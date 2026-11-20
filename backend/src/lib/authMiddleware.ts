import type { FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify } from 'jose';
import { getEnv } from '../config/env.js';
import { getPool } from '../db/pool.js';
import { GalatAplikasi } from './galat.js';
import { Jam } from './jam.js';

export type PeranPengguna = 'kasir' | 'staf_gudang' | 'apa' | 'pemilik';

export interface KonteksPengguna {
  id: number;
  apotekId: number;
  apotekKode: string;
  apotekNama: string;
  username: string;
  namaLengkap: string;
  peran: PeranPengguna;
  wajibGantiSandi: boolean;
  keluargaId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    pengguna?: KonteksPengguna;
  }
}

const RUTE_BEBAS_WAJIB_GANTI_SANDI = new Set([
  '/api/v1/auth/saya',
  '/api/v1/auth/ganti-sandi',
  '/api/v1/auth/keluar',
  '/api/v1/kesehatan',
]);

export async function autentikasi(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new GalatAplikasi('TIDAK_TERAUTENTIKASI');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new GalatAplikasi('TIDAK_TERAUTENTIKASI');
  }

  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  let payload: { sub?: string; apo?: number; kel?: string };
  try {
    const verified = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      currentDate: Jam.sekarang().toJSDate(),
    });
    payload = verified.payload as { sub?: string; apo?: number; kel?: string };
  } catch {
    throw new GalatAplikasi('TOKEN_TIDAK_VALID');
  }

  const penggunaId = Number(payload.sub);
  if (!Number.isInteger(penggunaId) || !payload.kel) {
    throw new GalatAplikasi('TOKEN_TIDAK_VALID');
  }

  const res = await getPool().query<{
    id: string;
    apotek_id: string;
    apotek_kode: string;
    apotek_nama: string;
    username: string;
    nama_lengkap: string;
    peran: PeranPengguna;
    aktif: boolean;
    apotek_aktif: boolean;
    wajib_ganti_sandi: boolean;
  }>(
    `SELECT p.id, p.apotek_id, a.kode AS apotek_kode, a.nama AS apotek_nama,
            p.username, p.nama_lengkap, p.peran, p.aktif, a.aktif AS apotek_aktif,
            p.wajib_ganti_sandi
     FROM pengguna p
     JOIN apotek a ON a.id = p.apotek_id
     WHERE p.id = $1`,
    [penggunaId],
  );

  const row = res.rows[0];
  if (!row) {
    throw new GalatAplikasi('TOKEN_TIDAK_VALID');
  }
  if (!row.aktif || !row.apotek_aktif) {
    throw new GalatAplikasi('AKUN_NONAKTIF');
  }

  request.pengguna = {
    id: Number(row.id),
    apotekId: Number(row.apotek_id),
    apotekKode: row.apotek_kode,
    apotekNama: row.apotek_nama,
    username: row.username,
    namaLengkap: row.nama_lengkap,
    peran: row.peran,
    wajibGantiSandi: row.wajib_ganti_sandi,
    keluargaId: payload.kel,
  };

  const urlPath = request.url.split('?')[0] ?? request.url;
  if (row.wajib_ganti_sandi && !RUTE_BEBAS_WAJIB_GANTI_SANDI.has(urlPath)) {
    throw new GalatAplikasi('WAJIB_GANTI_SANDI');
  }
}

export function izinkanPeran(peranDiizinkan: PeranPengguna[]) {
  return async function periksaPeran(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.pengguna) {
      throw new GalatAplikasi('TIDAK_TERAUTENTIKASI');
    }
    if (!peranDiizinkan.includes(request.pengguna.peran)) {
      throw new GalatAplikasi('DILARANG');
    }
  };
}
