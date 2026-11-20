import type { FastifyInstance } from 'fastify';
import { autentikasi } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  formatProfilSaya,
  gantiSandiLayanan,
  keluarLayanan,
  masukLayanan,
  segarkanLayanan,
  skemaGantiSandi,
  skemaMasuk,
  skemaSegarkan,
} from './layanan.js';

export async function ruteAuth(app: FastifyInstance): Promise<void> {
  app.post(
    '/auth/masuk',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          errorResponseBuilder: () => new GalatAplikasi('TERLALU_BANYAK_PERMINTAAN'),
        },
      },
    },
    async (request, reply) => {
      const body = validasiZod(skemaMasuk, request.body);
      const data = await masukLayanan(body);
      return reply.status(200).send({ data });
    },
  );

  app.post('/auth/segarkan', async (request, reply) => {
    const body = validasiZod(skemaSegarkan, request.body);
    const data = await segarkanLayanan(body.token_segar);
    return reply.status(200).send({ data });
  });

  app.post('/auth/keluar', { preHandler: [autentikasi] }, async (request, reply) => {
    const body = validasiZod(skemaSegarkan, request.body);
    await keluarLayanan(request.pengguna!.id, body.token_segar);
    return reply.status(204).send();
  });

  app.post('/auth/ganti-sandi', { preHandler: [autentikasi] }, async (request, reply) => {
    const body = validasiZod(skemaGantiSandi, request.body);
    await gantiSandiLayanan(request.pengguna!, body);
    return reply.status(204).send();
  });

  app.get('/auth/saya', { preHandler: [autentikasi] }, async (request, reply) => {
    return reply.status(200).send({ data: formatProfilSaya(request.pengguna!) });
  });
}
