import crypto from 'node:crypto';
import { z } from 'zod';
import { getEnv } from '../../config/env.js';
import { getPool } from '../../db/pool.js';
import { withApotek } from '../../db/withApotek.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam } from '../../lib/jam.js';
import { keUangBulat } from '../../lib/uang.js';
import { skemaUangPositif } from '../../lib/validasi.js';

export type CaraNontunai = 'qris' | 'debit' | 'transfer' | 'ewallet';

export interface GerbangPembayaran {
  buat(cara: CaraNontunai, jumlah: number): Promise<{ referensi: string; kode_bayar: string }>;
}

class GerbangMock implements GerbangPembayaran {
  async buat(_cara: CaraNontunai, _jumlah: number) {
    const referensi = `PAY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    return {
      referensi,
      kode_bayar: `MOCK-${referensi}`,
    };
  }
}

function dapatkanGerbang(): GerbangPembayaran {
  const env = getEnv();
  if (env.PEMBAYARAN_DRIVER === 'mock') {
    return new GerbangMock();
  }
  throw new Error(`Driver pembayaran tidak dikenal: ${env.PEMBAYARAN_DRIVER}`);
}

export const skemaBuatPembayaran = z
  .object({
    cara: z.enum(['qris', 'debit', 'transfer', 'ewallet']),
    jumlah: skemaUangPositif,
  })
  .strict();

export const skemaWebhookPembayaran = z
  .object({
    referensi: z.string().trim().min(1),
    status: z.enum(['dibayar', 'gagal']),
    jumlah: skemaUangPositif,
  })
  .strict();

export async function buatPembayaranNontunaiLayanan(
  pengguna: KonteksPengguna,
  input: z.infer<typeof skemaBuatPembayaran>,
) {
  const env = getEnv();
  const gerbang = dapatkanGerbang();
  const { referensi, kode_bayar } = await gerbang.buat(input.cara, input.jumlah);
  const sekarang = Jam.sekarang();
  const kedaluwarsa = sekarang.plus({ minutes: env.PEMBAYARAN_BATAS_MENIT });

  return withApotek(pengguna.apotekId, async (client) => {
    const res = await client.query<{
      id: string;
      cara: CaraNontunai;
      jumlah: string;
      referensi: string;
      kode_bayar: string;
      status: string;
      kedaluwarsa_pada: Date;
    }>(
      `INSERT INTO pembayaran_nontunai
        (apotek_id, cara, jumlah, referensi, kode_bayar, status, kedaluwarsa_pada, dibuat_oleh, dibuat_pada)
       VALUES ($1, $2, $3, $4, $5, 'menunggu', $6, $7, $8)
       RETURNING id, cara, jumlah, referensi, kode_bayar, status, kedaluwarsa_pada`,
      [
        pengguna.apotekId,
        input.cara,
        input.jumlah,
        referensi,
        kode_bayar,
        kedaluwarsa.toISO(),
        pengguna.id,
        sekarang.toISO(),
      ],
    );
    const r = res.rows[0]!;
    return {
      id: r.id,
      cara: r.cara,
      jumlah: keUangBulat(r.jumlah),
      referensi: r.referensi,
      kode_bayar: r.kode_bayar,
      status: r.status,
      kedaluwarsa_pada: Jam.keIsoWib(r.kedaluwarsa_pada),
    };
  });
}

export async function ambilPembayaranNontunaiLayanan(apotekId: number, id: string) {
  const sekarang = Jam.sekarang();

  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      id: string;
      cara: CaraNontunai;
      jumlah: string;
      referensi: string;
      kode_bayar: string;
      status: string;
      kedaluwarsa_pada: Date;
      dibayar_pada: Date | null;
    }>(
      `SELECT id, cara, jumlah, referensi, kode_bayar, status, kedaluwarsa_pada, dibayar_pada
       FROM pembayaran_nontunai WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const r = res.rows[0];
    if (!r) throw new GalatAplikasi('TIDAK_DITEMUKAN');

    let status = r.status;
    if (status === 'menunggu' && r.kedaluwarsa_pada.getTime() <= sekarang.toMillis()) {
      await client.query(`UPDATE pembayaran_nontunai SET status = 'kedaluwarsa' WHERE id = $1`, [id]);
      status = 'kedaluwarsa';
    }

    return {
      id: r.id,
      cara: r.cara,
      jumlah: keUangBulat(r.jumlah),
      referensi: r.referensi,
      kode_bayar: r.kode_bayar,
      status,
      kedaluwarsa_pada: Jam.keIsoWib(r.kedaluwarsa_pada),
      dibayar_pada: r.dibayar_pada ? Jam.keIsoWib(r.dibayar_pada) : null,
    };
  });
}

export async function simulasiBayarLayanan(apotekId: number, id: string) {
  const env = getEnv();
  if (env.PEMBAYARAN_DRIVER !== 'mock' || env.NODE_ENV === 'production') {
    throw new GalatAplikasi('TIDAK_DITEMUKAN');
  }

  const sekarang = Jam.sekarang();

  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      id: string;
      cara: CaraNontunai;
      jumlah: string;
      referensi: string;
      kode_bayar: string;
      status: string;
      kedaluwarsa_pada: Date;
      dibayar_pada: Date | null;
    }>(
      `SELECT id, cara, jumlah, referensi, kode_bayar, status, kedaluwarsa_pada, dibayar_pada
       FROM pembayaran_nontunai WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const r = res.rows[0];
    if (!r) throw new GalatAplikasi('TIDAK_DITEMUKAN');

    if (r.status === 'menunggu' && r.kedaluwarsa_pada.getTime() <= sekarang.toMillis()) {
      await client.query(`UPDATE pembayaran_nontunai SET status = 'kedaluwarsa' WHERE id = $1`, [id]);
      throw new GalatAplikasi('PEMBAYARAN_KEDALUWARSA');
    }
    if (r.status === 'kedaluwarsa') {
      throw new GalatAplikasi('PEMBAYARAN_KEDALUWARSA');
    }
    if (r.status !== 'menunggu') {
      throw new GalatAplikasi('STATUS_TIDAK_VALID');
    }

    const dibayarPada = sekarang.toISO();
    await client.query(
      `UPDATE pembayaran_nontunai SET status = 'dibayar', dibayar_pada = $1 WHERE id = $2`,
      [dibayarPada, id],
    );

    return {
      id: r.id,
      cara: r.cara,
      jumlah: keUangBulat(r.jumlah),
      referensi: r.referensi,
      kode_bayar: r.kode_bayar,
      status: 'dibayar',
      kedaluwarsa_pada: Jam.keIsoWib(r.kedaluwarsa_pada),
      dibayar_pada: dibayarPada,
    };
  });
}

export async function prosesWebhookPembayaranLayanan(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  input: z.infer<typeof skemaWebhookPembayaran>,
) {
  const env = getEnv();
  const expected = crypto
    .createHmac('sha256', env.PEMBAYARAN_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const sig = (signatureHeader ?? '').trim().toLowerCase();
  const expBuf = Buffer.from(expected, 'utf8');
  const sigBuf = Buffer.from(sig, 'utf8');

  if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
    throw new GalatAplikasi('TOKEN_TIDAK_VALID', {}, 'Tanda tangan webhook tidak valid.');
  }

  const apoRes = await getPool().query<{ apotek_id: string | null }>(
    `SELECT apotek_dari_referensi($1) AS apotek_id`,
    [input.referensi],
  );
  const apotekIdRaw = apoRes.rows[0]?.apotek_id;
  if (!apotekIdRaw) {
    throw new GalatAplikasi('TIDAK_DITEMUKAN');
  }
  const apotekId = Number(apotekIdRaw);
  const sekarang = Jam.sekarang();

  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      id: string;
      jumlah: string;
      status: string;
    }>(
      `SELECT id, jumlah, status FROM pembayaran_nontunai WHERE referensi = $1 FOR UPDATE`,
      [input.referensi],
    );
    const r = res.rows[0];
    if (!r) throw new GalatAplikasi('TIDAK_DITEMUKAN');

    if (keUangBulat(r.jumlah) !== input.jumlah) {
      throw new GalatAplikasi('PEMBAYARAN_TIDAK_SESUAI');
    }

    if (r.status === 'dibayar' && input.status === 'dibayar') {
      return { id: r.id, status: 'dibayar' };
    }
    if (r.status !== 'menunggu') {
      return { id: r.id, status: r.status };
    }

    const dibayarPada = input.status === 'dibayar' ? sekarang.toISO() : null;
    await client.query(
      `UPDATE pembayaran_nontunai SET status = $1, dibayar_pada = $2 WHERE id = $3`,
      [input.status, dibayarPada, r.id],
    );

    return { id: r.id, status: input.status };
  });
}
