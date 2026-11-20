import type { FastifyInstance } from 'fastify';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { skemaPaginasi, validasiZod } from '../../lib/validasi.js';
import {
  nearExpiredLayanan,
  riwayatPemeriksaanNearExpiredLayanan,
  skemaNearExpiredQuery,
} from './layanan.js';

export async function ruteNearExpired(app: FastifyInstance): Promise<void> {
  const peranDiizinkan = [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])];

  app.get('/near-expired', { preHandler: peranDiizinkan }, async (request, reply) => {
    const query = validasiZod(skemaNearExpiredQuery, request.query);
    const data = await nearExpiredLayanan(request.pengguna!.apotekId, query.batas_hari);
    return reply.status(200).send({ data });
  });

  app.get('/pemeriksaan-near-expired', { preHandler: peranDiizinkan }, async (request, reply) => {
    const query = validasiZod(skemaPaginasi, request.query);
    const hasil = await riwayatPemeriksaanNearExpiredLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send(hasil);
  });
}
