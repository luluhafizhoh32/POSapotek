import type { FastifyInstance } from 'fastify';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  ambilPengaturanLayanan,
  skemaUbahPengaturan,
  ubahPengaturanLayanan,
} from './layanan.js';

export async function rutePengaturan(app: FastifyInstance): Promise<void> {
  app.get('/pengaturan', { preHandler: [autentikasi] }, async (request, reply) => {
    const data = await ambilPengaturanLayanan(request.pengguna!.apotekId);
    return reply.status(200).send({ data });
  });

  app.put(
    '/pengaturan',
    { preHandler: [autentikasi, izinkanPeran(['pemilik'])] },
    async (request, reply) => {
      const body = validasiZod(skemaUbahPengaturan, request.body);
      const data = await ubahPengaturanLayanan(request.pengguna!, body);
      return reply.status(200).send({ data });
    },
  );
}
