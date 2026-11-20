import crypto from 'node:crypto';
import { z } from 'zod';
import { GalatAplikasi } from './galat.js';

const skemaUuidV4 = z
  .string()
  .trim()
  .uuid();

export function validasiKunciIdempotensi(headerVal: unknown): string {
  if (typeof headerVal !== 'string') {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      'Idempotency-Key': ['Header Idempotency-Key wajib diisi dengan UUID v4.'],
    });
  }
  const res = skemaUuidV4.safeParse(headerVal);
  if (!res.success) {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      'Idempotency-Key': ['Header Idempotency-Key harus berupa UUID yang valid.'],
    });
  }
  return res.data.toLowerCase();
}

function urutkanKunci(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map(urutkanKunci);
  }
  if (val !== null && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const terurut: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      terurut[k] = urutkanKunci(obj[k]);
    }
    return terurut;
  }
  return val;
}

/**
 * Menghitung SHA-256 hex dari badan JSON dengan kunci diurutkan abjad,
 * tanpa menyertakan field `waktu_perangkat`.
 */
export function hitungHashPermintaan(body: Record<string, unknown>): string {
  const salinan: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === 'waktu_perangkat') continue;
    salinan[k] = v;
  }
  const kanonik = JSON.stringify(urutkanKunci(salinan));
  return crypto.createHash('sha256').update(kanonik).digest('hex');
}
