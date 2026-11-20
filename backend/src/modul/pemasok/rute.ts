import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  ambilPemasokLayanan,
  buatPemasokLayanan,
  daftarPemasokLayanan,
  setAktifPemasokLayanan,
  skemaBuatPemasok,
  skemaDaftarPemasok,
  skemaUbahPemasok,
  ubahPemasokLayanan,
} from './layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });

export async function rutePemasok(app: FastifyInstance): Promise<void> {
  const bacaPeran = [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])];
  const tulisPeran = [autentikasi, izinkanPeran(['staf_gudang', 'pemilik'])];

  app.get('/pemasok', { preHandler: bacaPeran }, async (request, reply) => {
    const query = validasiZod(skemaDaftarPemasok, request.query);
    const hasil = await daftarPemasokLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send(hasil);
  });

  app.post('/pemasok', { preHandler: tulisPeran }, async (request, reply) => {
    const body = validasiZod(skemaBuatPemasok, request.body);
    const data = await buatPemasokLayanan(request.pengguna!, body);
    return reply.status(201).send({ data });
  });

  app.get('/pemasok/:id', { preHandler: bacaPeran }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await ambilPemasokLayanan(request.pengguna!.apotekId, id);
    return reply.status(200).send({ data });
  });

  app.put('/pemasok/:id', { preHandler: tulisPeran }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const body = validasiZod(skemaUbahPemasok, request.body);
    const data = await ubahPemasokLayanan(request.pengguna!, id, body);
    return reply.status(200).send({ data });
  });

  app.post('/pemasok/:id/nonaktifkan', { preHandler: tulisPeran }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await setAktifPemasokLayanan(request.pengguna!, id, false);
    return reply.status(200).send({ data });
  });

  app.post('/pemasok/:id/aktifkan', { preHandler: tulisPeran }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await setAktifPemasokLayanan(request.pengguna!, id, true);
    return reply.status(200).send({ data });
  });
}
