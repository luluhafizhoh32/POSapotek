import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { validasiKunciIdempotensi } from '../../lib/idempotensi.js';
import { validasiZod } from '../../lib/validasi.js';
import {
  ambilPengajuanLayanan,
  buatPengajuanLayanan,
  daftarPengajuanLayanan,
  putuskanPengajuanLayanan,
  skemaBuatPengajuan,
  skemaDaftarPengajuan,
  skemaPutuskanPengajuan,
} from './layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });

export async function rutePengajuan(app: FastifyInstance): Promise<void> {
  const hanyaGudang = [autentikasi, izinkanPeran(['staf_gudang'])];
  const bacaPengajuan = [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])];
  const hanyaApa = [autentikasi, izinkanPeran(['apa'])];

  app.post('/pengajuan-pengurangan', { preHandler: hanyaGudang }, async (request, reply) => {
    const kunci = validasiKunciIdempotensi(request.headers['idempotency-key']);
    const body = validasiZod(skemaBuatPengajuan, request.body);
    const hasil = await buatPengajuanLayanan(request.pengguna!, kunci, body);
    if (hasil.replay) {
      return reply.status(200).header('Idempotent-Replay', 'true').send({ data: hasil.data });
    }
    return reply.status(201).send({ data: hasil.data });
  });

  app.get('/pengajuan-pengurangan', { preHandler: bacaPengajuan }, async (request, reply) => {
    const query = validasiZod(skemaDaftarPengajuan, request.query);
    const hasil = await daftarPengajuanLayanan(request.pengguna!, query);
    return reply.status(200).send(hasil);
  });

  app.get('/pengajuan-pengurangan/:id', { preHandler: bacaPengajuan }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await ambilPengajuanLayanan(request.pengguna!, id);
    return reply.status(200).send({ data });
  });

  app.post('/pengajuan-pengurangan/:id/putuskan', { preHandler: hanyaApa }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const body = validasiZod(skemaPutuskanPengajuan, request.body);
    const data = await putuskanPengajuanLayanan(request.pengguna!, id, body);
    return reply.status(200).send({ data });
  });
}
