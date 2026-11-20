import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  ambilPembayaranNontunaiLayanan,
  buatPembayaranNontunaiLayanan,
  prosesWebhookPembayaranLayanan,
  simulasiBayarLayanan,
  skemaBuatPembayaran,
  skemaWebhookPembayaran,
} from './layanan.js';

const skemaUuidParam = z.object({ id: z.string().uuid() });

export async function rutePembayaran(app: FastifyInstance): Promise<void> {
  const hanyaKasir = [autentikasi, izinkanPeran(['kasir'])];

  app.post('/pembayaran-nontunai', { preHandler: hanyaKasir }, async (request, reply) => {
    const body = validasiZod(skemaBuatPembayaran, request.body);
    const data = await buatPembayaranNontunaiLayanan(request.pengguna!, body);
    return reply.status(201).send({ data });
  });

  app.get('/pembayaran-nontunai/:id', { preHandler: hanyaKasir }, async (request, reply) => {
    const { id } = validasiZod(skemaUuidParam, request.params);
    const data = await ambilPembayaranNontunaiLayanan(request.pengguna!.apotekId, id);
    return reply.status(200).send({ data });
  });

  app.post(
    '/pembayaran-nontunai/:id/simulasi-bayar',
    { preHandler: hanyaKasir },
    async (request, reply) => {
      const { id } = validasiZod(skemaUuidParam, request.params);
      const data = await simulasiBayarLayanan(request.pengguna!.apotekId, id);
      return reply.status(200).send({ data });
    },
  );

  app.register(async (webhookScope) => {
    webhookScope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_req, body, done) => {
        try {
          const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
          (_req as unknown as { rawBody: Buffer }).rawBody = buf;
          const parsed = buf.length > 0 ? JSON.parse(buf.toString('utf8')) : {};
          done(null, parsed);
        } catch (err) {
          done(err as Error, undefined);
        }
      },
    );

    webhookScope.post('/webhook/pembayaran', async (request, reply) => {
      const rawBody = (request as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);
      const sigHeader = request.headers['x-signature'];
      const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
      const body = validasiZod(skemaWebhookPembayaran, request.body);
      const data = await prosesWebhookPembayaranLayanan(rawBody, sig, body);
      return reply.status(200).send({ data });
    });
  });
}
