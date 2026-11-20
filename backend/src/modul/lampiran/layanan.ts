import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getEnv } from '../../config/env.js';
import { withApotek } from '../../db/withApotek.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam } from '../../lib/jam.js';

const MAKS_UKURAN = 5 * 1024 * 1024; // 5 MB

export function deteksiTipeGambar(buf: Buffer): { mime: 'image/jpeg' | 'image/png' | 'image/webp'; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

export async function unggahLampiranLayanan(
  pengguna: KonteksPengguna,
  jenis: string,
  namaBerkas: string,
  buffer: Buffer,
) {
  if (jenis !== 'faktur' && jenis !== 'bukti_pengurangan') {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      jenis: ["Jenis lampiran harus 'faktur' atau 'bukti_pengurangan'."],
    });
  }
  if (buffer.length === 0 || buffer.length > MAKS_UKURAN) {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      berkas: ['Ukuran berkas harus antara 1 byte hingga 5 MB.'],
    });
  }

  const tipe = deteksiTipeGambar(buffer);
  if (!tipe) {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      berkas: ['Format berkas harus JPEG, PNG, atau WebP yang valid.'],
    });
  }

  const uuid = crypto.randomUUID();
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const env = getEnv();
  const relPath = path.join(String(pengguna.apotekId), `${uuid}.${tipe.ext}`);
  const fullPath = path.resolve(env.LAMPIRAN_DIR, relPath);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);

  const namaAman = path.basename(namaBerkas || `${uuid}.${tipe.ext}`).slice(0, 150);

  try {
    await withApotek(pengguna.apotekId, async (client) => {
      await client.query(
        `INSERT INTO lampiran
          (id, apotek_id, jenis, nama_berkas, tipe_mime, ukuran, sha256, path, diunggah_oleh, dibuat_pada)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          uuid,
          pengguna.apotekId,
          jenis,
          namaAman,
          tipe.mime,
          buffer.length,
          sha256,
          relPath,
          pengguna.id,
          Jam.sekarang().toISO(),
        ],
      );
    });
  } catch (err) {
    await fs.unlink(fullPath).catch(() => {});
    throw err;
  }

  return {
    id: uuid,
    jenis,
    nama_berkas: namaAman,
    ukuran: buffer.length,
  };
}

export async function ambilLampiranLayanan(apotekId: number, id: string) {
  const row = await withApotek(apotekId, async (client) => {
    const res = await client.query<{
      tipe_mime: string;
      path: string;
      nama_berkas: string;
    }>(
      `SELECT tipe_mime, path, nama_berkas FROM lampiran WHERE id = $1`,
      [id],
    );
    return res.rows[0];
  });

  if (!row) {
    throw new GalatAplikasi('TIDAK_DITEMUKAN');
  }

  const fullPath = path.resolve(getEnv().LAMPIRAN_DIR, row.path);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(fullPath);
  } catch {
    throw new GalatAplikasi('TIDAK_DITEMUKAN');
  }

  return {
    tipeMime: row.tipe_mime,
    namaBerkas: row.nama_berkas,
    buffer,
  };
}
