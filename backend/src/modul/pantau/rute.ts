import type { FastifyInstance } from 'fastify';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { daftarApotekPantauLayanan } from './layanan.js';

export async function rutePantau(app: FastifyInstance): Promise<void> {
  app.get(
    '/pantau/apotek',
    { preHandler: [autentikasi, izinkanPeran(['pemilik'])] },
    async (request, reply) => {
      const data = await daftarApotekPantauLayanan(request.pengguna!);
      return reply.status(200).send({ data });
    },
  );
}
