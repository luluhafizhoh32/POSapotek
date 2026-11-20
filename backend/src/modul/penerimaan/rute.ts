import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiKunciIdempotensi } from '../../lib/idempotensi.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  ambilPenerimaanLayanan,
  cekFakturLayanan,
  daftarPenerimaanLayanan,
  periksaBarisPenerimaanLayanan,
  simpanPenerimaanLayanan,
  skemaCekFaktur,
  skemaDaftarPenerimaan,
  skemaPeriksaBaris,
  skemaSimpanPenerimaan,
} from './layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });

export async function rutePenerimaan(app: FastifyInstance): Promise<void> {
  const hanyaGudang = [autentikasi, izinkanPeran(['staf_gudang'])];
  const bacaPenerimaan = [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])];

  app.get('/penerimaan/cek-faktur', { preHandler: hanyaGudang }, async (request, reply) => {
    const query = validasiZod(skemaCekFaktur, request.query);
    const data = await cekFakturLayanan(
      request.pengguna!.apotekId,
      query.pemasok_id,
      query.nomor_faktur,
    );
    return reply.status(200).send({ data });
  });

  app.post('/penerimaan/periksa-baris', { preHandler: hanyaGudang }, async (request, reply) => {
    const body = validasiZod(skemaPeriksaBaris, request.body);
    const data = await periksaBarisPenerimaanLayanan(request.pengguna!.apotekId, body);
    return reply.status(200).send({ data });
  });

  app.post('/penerimaan', { preHandler: hanyaGudang }, async (request, reply) => {
    const kunci = validasiKunciIdempotensi(request.headers['idempotency-key']);
    const body = validasiZod(skemaSimpanPenerimaan, request.body);
    const hasil = await simpanPenerimaanLayanan(request.pengguna!, kunci, body);
    if (hasil.replay) {
      return reply.status(200).header('Idempotent-Replay', 'true').send({ data: hasil.data });
    }
    return reply.status(201).send({ data: hasil.data });
  });

  app.get('/penerimaan', { preHandler: bacaPenerimaan }, async (request, reply) => {
    const query = validasiZod(skemaDaftarPenerimaan, request.query);
    const hasil = await daftarPenerimaanLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send(hasil);
  });

  app.get('/penerimaan/:id', { preHandler: bacaPenerimaan }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await ambilPenerimaanLayanan(request.pengguna!.apotekId, id);
    return reply.status(200).send({ data });
  });
}
