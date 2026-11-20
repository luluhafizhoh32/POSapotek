import type { FastifyInstance } from 'fastify';
import { autentikasi } from '../../lib/authMiddleware.js';
import { ambilRingkasanLayanan } from './layanan.js';

export async function ruteRingkasan(app: FastifyInstance): Promise<void> {
  app.get('/ringkasan', { preHandler: [autentikasi] }, async (request, reply) => {
    const data = await ambilRingkasanLayanan(request.pengguna!);
    return reply.status(200).send({ data });
  });
}
