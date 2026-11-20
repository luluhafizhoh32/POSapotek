import { z } from 'zod';
import { BATAS_MAKS_UANG, BATAS_MIN_UANG } from './uang.js';
import { GalatAplikasi } from './galat.js';

/**
 * Memangkas teks dan mengubah string kosong menjadi null untuk field opsional.
 */
export const teksOpsional = (maks = 500) =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? null : trimmed;
      }
      return val;
    },
    z.string().max(maks).nullable(),
  );

export const teksWajib = (min = 1, maks = 150) =>
  z.string().trim().min(min).max(maks);

export const skemaKode = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(/^[A-Za-z0-9._-]+$/, 'Kode hanya boleh huruf, angka, titik, garis bawah, atau hubung');

export const skemaUsername = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,30}$/, 'Username harus 3-30 karakter huruf kecil, angka, titik, atau garis bawah');

export const skemaUang = z
  .number()
  .int()
  .min(BATAS_MIN_UANG)
  .max(BATAS_MAKS_UANG);

export const skemaUangPositif = z
  .number()
  .int()
  .min(1)
  .max(BATAS_MAKS_UANG);

export const skemaJumlah = z.number().int().min(1).max(1_000_000);

export const skemaTanggal = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

export const skemaPeriode = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format periode harus YYYY-MM');

export const skemaPaginasi = z.object({
  halaman: z.coerce.number().int().min(1).default(1),
  per_halaman: z.coerce.number().int().min(1).max(100).default(20),
});

export function validasiZod<T extends z.ZodTypeAny>(skema: T, data: unknown): z.infer<T> {
  const hasil = skema.safeParse(data);
  if (!hasil.success) {
    const detail: Record<string, string[]> = {};
    for (const issue of hasil.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_';
      if (!detail[key]) detail[key] = [];
      detail[key].push(issue.message);
    }
    throw new GalatAplikasi('VALIDASI_GAGAL', detail);
  }
  return hasil.data;
}
