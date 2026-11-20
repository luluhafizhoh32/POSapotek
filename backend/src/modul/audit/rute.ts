import type { FastifyInstance } from 'fastify';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiZod } from '../../lib/validasi.js';
import { daftarAuditLayanan, skemaDaftarAudit } from './layanan.js';

export async function ruteAudit(app: FastifyInstance): Promise<void> {
  app.get(
    '/jejak-audit',
    { preHandler: [autentikasi, izinkanPeran(['pemilik'])] },
    async (request, reply) => {
      const query = validasiZod(skemaDaftarAudit, request.query);
      const hasil = await daftarAuditLayanan(request.pengguna!.apotekId, query);
      return reply.status(200).send(hasil);
    },
  );
}
