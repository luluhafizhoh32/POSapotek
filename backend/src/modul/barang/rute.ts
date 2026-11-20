import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  ambilBarangLayanan,
  buatBarangLayanan,
  daftarBarangLayanan,
  daftarBatchBarangLayanan,
  setAktifBarangLayanan,
  skemaBuatBarang,
  skemaDaftarBarang,
  skemaDaftarBatch,
  skemaUbahBarang,
  ubahBarangLayanan,
} from './layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });

export async function ruteBarang(app: FastifyInstance): Promise<void> {
  const semuaPeran = [autentikasi];
  const gudangAtauPemilik = [autentikasi, izinkanPeran(['staf_gudang', 'pemilik'])];
  const gudangApaPemilik = [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])];

  app.get('/barang', { preHandler: semuaPeran }, async (request, reply) => {
    const query = validasiZod(skemaDaftarBarang, request.query);
    const hasil = await daftarBarangLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send(hasil);
  });

  app.post('/barang', { preHandler: gudangAtauPemilik }, async (request, reply) => {
    const body = validasiZod(skemaBuatBarang, request.body);
    const data = await buatBarangLayanan(request.pengguna!, body);
    return reply.status(201).send({ data });
  });

  app.get('/barang/:id', { preHandler: semuaPeran }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await ambilBarangLayanan(request.pengguna!.apotekId, id);
    return reply.status(200).send({ data });
  });

  app.put('/barang/:id', { preHandler: gudangAtauPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const body = validasiZod(skemaUbahBarang, request.body);
    const data = await ubahBarangLayanan(request.pengguna!, id, body);
    return reply.status(200).send({ data });
  });

  app.post('/barang/:id/nonaktifkan', { preHandler: gudangAtauPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await setAktifBarangLayanan(request.pengguna!, id, false);
    return reply.status(200).send({ data });
  });

  app.post('/barang/:id/aktifkan', { preHandler: gudangAtauPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await setAktifBarangLayanan(request.pengguna!, id, true);
    return reply.status(200).send({ data });
  });

  app.get('/barang/:id/batch', { preHandler: gudangApaPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const query = validasiZod(skemaDaftarBatch, request.query);
    const data = await daftarBatchBarangLayanan(
      request.pengguna!.apotekId,
      id,
      query.semua ?? false,
    );
    return reply.status(200).send({ data });
  });
}
