import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi } from '../../lib/authMiddleware.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  daftarNotifikasiLayanan,
  skemaDaftarNotifikasi,
  tandaiDibacaLayanan,
  tandaiSemuaDibacaLayanan,
} from './layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });

export async function ruteNotifikasi(app: FastifyInstance): Promise<void> {
  app.get('/notifikasi', { preHandler: [autentikasi] }, async (request, reply) => {
    const query = validasiZod(skemaDaftarNotifikasi, request.query);
    const hasil = await daftarNotifikasiLayanan(
      request.pengguna!.apotekId,
      request.pengguna!.id,
      query,
    );
    return reply.status(200).send(hasil);
  });

  app.post('/notifikasi/:id/dibaca', { preHandler: [autentikasi] }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    await tandaiDibacaLayanan(request.pengguna!.apotekId, request.pengguna!.id, id);
    return reply.status(204).send();
  });

  app.post('/notifikasi/dibaca-semua', { preHandler: [autentikasi] }, async (request, reply) => {
    await tandaiSemuaDibacaLayanan(request.pengguna!.apotekId, request.pengguna!.id);
    return reply.status(204).send();
  });
}
