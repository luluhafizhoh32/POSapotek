import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  ambilPenggunaLayanan,
  buatPenggunaLayanan,
  daftarPenggunaLayanan,
  resetSandiPenggunaLayanan,
  setAktifPenggunaLayanan,
  skemaBuatPengguna,
  skemaDaftarPengguna,
  skemaResetSandi,
  skemaUbahPengguna,
  ubahPenggunaLayanan,
} from './layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });

export async function rutePengguna(app: FastifyInstance): Promise<void> {
  const hanyaPemilik = [autentikasi, izinkanPeran(['pemilik'])];

  app.get('/pengguna', { preHandler: hanyaPemilik }, async (request, reply) => {
    const query = validasiZod(skemaDaftarPengguna, request.query);
    const hasil = await daftarPenggunaLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send(hasil);
  });

  app.post('/pengguna', { preHandler: hanyaPemilik }, async (request, reply) => {
    const body = validasiZod(skemaBuatPengguna, request.body);
    const data = await buatPenggunaLayanan(request.pengguna!, body);
    return reply.status(201).send({ data });
  });

  app.get('/pengguna/:id', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await ambilPenggunaLayanan(request.pengguna!.apotekId, id);
    return reply.status(200).send({ data });
  });

  app.put('/pengguna/:id', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const body = validasiZod(skemaUbahPengguna, request.body);
    const data = await ubahPenggunaLayanan(request.pengguna!, id, body);
    return reply.status(200).send({ data });
  });

  app.post('/pengguna/:id/nonaktifkan', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await setAktifPenggunaLayanan(request.pengguna!, id, false);
    return reply.status(200).send({ data });
  });

  app.post('/pengguna/:id/aktifkan', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await setAktifPenggunaLayanan(request.pengguna!, id, true);
    return reply.status(200).send({ data });
  });

  app.post('/pengguna/:id/reset-sandi', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const body = validasiZod(skemaResetSandi, request.body);
    await resetSandiPenggunaLayanan(request.pengguna!, id, body);
    return reply.status(204).send();
  });
}
