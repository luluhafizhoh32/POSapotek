import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { validasiZod } from '../../lib/validasi.js';
import { ambilLampiranLayanan, unggahLampiranLayanan } from './layanan.js';

const skemaUuidParam = z.object({ id: z.string().uuid() });

export async function ruteLampiran(app: FastifyInstance): Promise<void> {
  app.post(
    '/lampiran',
    { preHandler: [autentikasi, izinkanPeran(['staf_gudang'])] },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        throw new GalatAplikasi('VALIDASI_GAGAL', { berkas: ['Berkas wajib diunggah.'] });
      }
      const fields = file.fields as Record<string, { value?: string } | undefined>;
      const jenis = fields['jenis']?.value ?? '';
      const buffer = await file.toBuffer();

      const data = await unggahLampiranLayanan(
        request.pengguna!,
        jenis,
        file.filename,
        buffer,
      );
      return reply.status(201).send({ data });
    },
  );

  app.get(
    '/lampiran/:id',
    { preHandler: [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])] },
    async (request, reply) => {
      const { id } = validasiZod(skemaUuidParam, request.params);
      const hasil = await ambilLampiranLayanan(request.pengguna!.apotekId, id);
      return reply
        .status(200)
        .header('Content-Type', hasil.tipeMime)
        .header('Cache-Control', 'private, max-age=3600')
        .send(hasil.buffer);
    },
  );
}
