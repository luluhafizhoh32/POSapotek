import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiKunciIdempotensi } from '../../lib/idempotensi.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  ambilPenjualanLayanan,
  ambilStrukPenjualanLayanan,
  daftarPenjualanLayanan,
  pratinjauPenjualanLayanan,
  simpanPenjualanLayanan,
  skemaDaftarPenjualan,
  skemaPratinjauPenjualan,
  skemaSimpanPenjualan,
} from './layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });

export async function rutePenjualan(app: FastifyInstance): Promise<void> {
  const hanyaKasir = [autentikasi, izinkanPeran(['kasir'])];
  const bacaPenjualan = [autentikasi, izinkanPeran(['kasir', 'apa', 'pemilik'])];

  app.post('/penjualan/pratinjau', { preHandler: hanyaKasir }, async (request, reply) => {
    const body = validasiZod(skemaPratinjauPenjualan, request.body);
    const data = await pratinjauPenjualanLayanan(request.pengguna!.apotekId, body);
    return reply.status(200).send({ data });
  });

  app.post('/penjualan', { preHandler: hanyaKasir }, async (request, reply) => {
    const kunci = validasiKunciIdempotensi(request.headers['idempotency-key']);
    const body = validasiZod(skemaSimpanPenjualan, request.body);
    const hasil = await simpanPenjualanLayanan(request.pengguna!, kunci, body);
    if (hasil.replay) {
      return reply.status(200).header('Idempotent-Replay', 'true').send({ data: hasil.data });
    }
    return reply.status(201).send({ data: hasil.data });
  });

  app.get('/penjualan', { preHandler: bacaPenjualan }, async (request, reply) => {
    const query = validasiZod(skemaDaftarPenjualan, request.query);
    const hasil = await daftarPenjualanLayanan(request.pengguna!, query);
    return reply.status(200).send(hasil);
  });

  app.get('/penjualan/:id', { preHandler: bacaPenjualan }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await ambilPenjualanLayanan(request.pengguna!, id);
    return reply.status(200).send({ data });
  });

  app.get('/penjualan/:id/struk', { preHandler: bacaPenjualan }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await ambilStrukPenjualanLayanan(request.pengguna!, id);
    return reply.status(200).send({ data });
  });
}
