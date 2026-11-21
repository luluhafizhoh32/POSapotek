import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiKunciIdempotensi } from '../../lib/idempotensi.js';
import { skemaPaginasi, validasiZod } from '../../lib/validasi.js';
import {
  ambilOpnameLayanan,
  daftarBatchOpnameLayanan,
  daftarOpnameLayanan,
  simpanOpnameLayanan,
  skemaSimpanOpname,
  skemaTinjauOpname,
  tinjauOpnameLayanan,
} from './layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });

export async function ruteOpname(app: FastifyInstance): Promise<void> {
  const hanyaGudang = [autentikasi, izinkanPeran(['staf_gudang'])];
  const bacaOpname = [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])];

  app.get('/opname/daftar-batch', { preHandler: hanyaGudang }, async (request, reply) => {
    const data = await daftarBatchOpnameLayanan(request.pengguna!.apotekId);
    return reply.status(200).send({ data });
  });

  app.post('/opname/tinjau', { preHandler: hanyaGudang }, async (request, reply) => {
    const body = validasiZod(skemaTinjauOpname, request.body);
    const data = await tinjauOpnameLayanan(request.pengguna!.apotekId, body);
    return reply.status(200).send({ data });
  });

  app.post('/opname', { preHandler: hanyaGudang }, async (request, reply) => {
    const kunci = validasiKunciIdempotensi(request.headers['idempotency-key']);
    const body = validasiZod(skemaSimpanOpname, request.body);
    const hasil = await simpanOpnameLayanan(request.pengguna!, kunci, body);
    if (hasil.replay) {
      return reply.status(200).header('Idempotent-Replay', 'true').send({ data: hasil.data });
    }
    return reply.status(201).send({ data: hasil.data });
  });

  app.get('/opname', { preHandler: bacaOpname }, async (request, reply) => {
    const query = validasiZod(skemaPaginasi, request.query);
    const hasil = await daftarOpnameLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send(hasil);
  });

  app.get('/opname/:id', { preHandler: bacaOpname }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await ambilOpnameLayanan(request.pengguna!.apotekId, id);
    return reply.status(200).send({ data });
  });
}
