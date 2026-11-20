import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { skemaPeriode, validasiZod } from '../../lib/validasi.js';
import {
  ambilLaporanBulananLayanan,
  daftarLaporanBulananLayanan,
  formatCsvGolonganKhusus,
  laporanDefektaLayanan,
  laporanFastSlowLayanan,
  laporanGolonganKhususLayanan,
  laporanMarginKategoriLayanan,
  laporanOmzetLayanan,
  skemaApotekIdOpsional,
  skemaGolonganKhususQuery,
  skemaOmzetQuery,
  skemaRentangTanggal,
} from './layanan.js';

const skemaPeriodeParam = z.object({ periode: skemaPeriode });

export async function ruteLaporan(app: FastifyInstance): Promise<void> {
  const apaAtauPemilik = [autentikasi, izinkanPeran(['apa', 'pemilik'])];
  const gudangApaPemilik = [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])];
  const hanyaPemilik = [autentikasi, izinkanPeran(['pemilik'])];

  app.get('/laporan/omzet', { preHandler: apaAtauPemilik }, async (request, reply) => {
    const query = validasiZod(skemaOmzetQuery, request.query);
    const data = await laporanOmzetLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send({ data });
  });

  app.get('/laporan/margin-kategori', { preHandler: apaAtauPemilik }, async (request, reply) => {
    const query = validasiZod(skemaRentangTanggal, request.query);
    const data = await laporanMarginKategoriLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send({ data });
  });

  app.get('/laporan/fast-slow', { preHandler: apaAtauPemilik }, async (request, reply) => {
    const query = validasiZod(skemaRentangTanggal, request.query);
    const data = await laporanFastSlowLayanan(request.pengguna!.apotekId, query);
    return reply.status(200).send({ data });
  });

  app.get('/laporan/defekta', { preHandler: gudangApaPemilik }, async (request, reply) => {
    const data = await laporanDefektaLayanan(request.pengguna!.apotekId);
    return reply.status(200).send({ data });
  });

  app.get('/laporan/golongan-khusus', { preHandler: apaAtauPemilik }, async (request, reply) => {
    const query = validasiZod(skemaGolonganKhususQuery, request.query);
    const data = await laporanGolonganKhususLayanan(request.pengguna!.apotekId, query.periode);
    if (query.format === 'csv') {
      const csv = formatCsvGolonganKhusus(data.baris);
      return reply
        .status(200)
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename="golongan-khusus-${query.periode}.csv"`,
        )
        .send(csv);
    }
    return reply.status(200).send({ data });
  });

  app.get('/laporan-bulanan', { preHandler: hanyaPemilik }, async (request, reply) => {
    const query = validasiZod(skemaApotekIdOpsional, request.query);
    const data = await daftarLaporanBulananLayanan(request.pengguna!, query.apotek_id);
    return reply.status(200).send({ data });
  });

  app.get('/laporan-bulanan/:periode', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { periode } = validasiZod(skemaPeriodeParam, request.params);
    const query = validasiZod(skemaApotekIdOpsional, request.query);
    const data = await ambilLaporanBulananLayanan(request.pengguna!, periode, query.apotek_id);
    return reply.status(200).send({ data });
  });
}
