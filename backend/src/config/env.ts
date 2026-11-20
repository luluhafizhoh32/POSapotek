import 'dotenv/config';
import { z } from 'zod';

const skemaEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_MIGRATOR: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  JWT_AKSES_MENIT: z.coerce.number().int().min(1).default(15),
  TOKEN_SEGAR_HARI: z.coerce.number().int().min(1).default(30),
  LAMPIRAN_DIR: z.string().min(1).default('./data/lampiran'),
  ZONA_WAKTU: z.string().min(1).default('Asia/Jakarta'),
  PEMBAYARAN_DRIVER: z.enum(['mock']).default('mock'),
  PEMBAYARAN_BATAS_MENIT: z.coerce.number().int().min(1).default(5),
  PEMBAYARAN_WEBHOOK_SECRET: z.string().min(16).default('rahasia_webhook_pengembangan_32_karakter'),
  JAM_UJI: z.string().optional(),
});

export type Env = z.infer<typeof skemaEnv>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = skemaEnv.parse(process.env);
  }
  return _env;
}

export function resetEnvCache(): void {
  _env = null;
}
