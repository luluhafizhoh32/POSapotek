import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { skemaKode, skemaPeriode, validasiZod } from '../../lib/validasi.js';
import {
  ambilJurnalLayanan,
  buatJurnalManualLayanan,
  buatSaldoAwalLayanan,
  bukuBesarLayanan,
  daftarAkunLayanan,
  daftarJurnalLayanan,
  daftarPeriodeLayanan,
  labaRugiLayanan,
  neracaLayanan,
  neracaSaldoLayanan,
  skemaDaftarJurnal,
  skemaJurnalManual,
  skemaSaldoAwal,
  tutupPeriodeLayanan,
} from './layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });
const skemaPeriodeParam = z.object({ periode: skemaPeriode });
const skemaPeriodeQuery = z.object({ periode: skemaPeriode });
const skemaBukuBesarQuery = z.object({ periode: skemaPeriode, akun_kode: skemaKode });

export async function ruteAkuntansi(app: FastifyInstance): Promise<void> {
  const hanyaPemilik = [autentikasi, izinkanPeran(['pemilik'])];

  app.get('/akun', { preHandler: hanyaPemilik }, async (request, reply) => {
    const data = await daftarAkunLayanan(request.pengguna!.apotekId);
    return reply.status(200).send({ data });
  });

  app.post('/saldo-awal', { preHandler: hanyaPemilik }, async (request, reply) => {
    const body = validasiZod(skemaSaldoAwal, request.body);
    const data = await buatSaldoAwalLayanan(request.pengguna!, body);
    return reply.status(201).send({ data });
  });

  app.post('/jurnal-manual', { preHandler: hanyaPemilik }, async (request, reply) => {
    const body = validasiZod(skemaJurnalManual, request.body);
    const data = await buatJurnalManualLayanan(request.pengguna!, body);
    return reply.status(201).send({ data });
  });

  app.get('/jurnal', { preHandler: hanyaPemilik }, async (request, reply) => {
    const query = validasiZod(skemaDaftarJurnal, request.query);
    const hasil = await daftarJurnalLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send(hasil);
  });

  app.get('/jurnal/:id', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { id } = validasiZod(skemaIdParam, request.params);
    const data = await ambilJurnalLayanan(request.pengguna!.apotekId, id);
    return reply.status(200).send({ data });
  });

  app.get('/periode', { preHandler: hanyaPemilik }, async (request, reply) => {
    const data = await daftarPeriodeLayanan(request.pengguna!.apotekId);
    return reply.status(200).send({ data });
  });

  app.post('/periode/:periode/tutup', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { periode } = validasiZod(skemaPeriodeParam, request.params);
    const data = await tutupPeriodeLayanan(request.pengguna!, periode);
    return reply.status(200).send({ data });
  });

  app.get('/laporan-keuangan/neraca-saldo', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { periode } = validasiZod(skemaPeriodeQuery, request.query);
    const data = await neracaSaldoLayanan(request.pengguna!.apotekId, periode);
    return reply.status(200).send({ data });
  });

  app.get('/laporan-keuangan/laba-rugi', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { periode } = validasiZod(skemaPeriodeQuery, request.query);
    const data = await labaRugiLayanan(request.pengguna!.apotekId, periode);
    return reply.status(200).send({ data });
  });

  app.get('/laporan-keuangan/neraca', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { periode } = validasiZod(skemaPeriodeQuery, request.query);
    const data = await neracaLayanan(request.pengguna!.apotekId, periode);
    return reply.status(200).send({ data });
  });

  app.get('/laporan-keuangan/buku-besar', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { periode, akun_kode } = validasiZod(skemaBukuBesarQuery, request.query);
    const data = await bukuBesarLayanan(request.pengguna!.apotekId, periode, akun_kode);
    return reply.status(200).send({ data });
  });
}
