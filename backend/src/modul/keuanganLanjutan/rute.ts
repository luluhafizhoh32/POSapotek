import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit } from '../../lib/audit.js';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam } from '../../lib/jam.js';
import { skemaTanggal, skemaUang, skemaUangPositif, validasiZod } from '../../lib/validasi.js';
import { ambilPetaAkun, buatJurnalDiClient } from '../akuntansi/layanan.js';

const skemaBuatAset = z
  .object({
    kode: z.string().trim().min(2).max(40),
    nama: z.string().trim().min(2).max(120),
    tanggal_perolehan: skemaTanggal,
    nilai_perolehan: skemaUangPositif,
    nilai_residu: skemaUang.default(0),
    umur_manfaat_bulan: z.number().int().min(1).max(600),
  })
  .strict();

const skemaPeriodeBody = z
  .object({
    periode: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  })
  .strict();

const skemaSimpanAnggaran = z
  .object({
    periode: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    akun_kode: z.string().trim().min(2).max(10),
    nominal_anggaran: skemaUangPositif,
  })
  .strict();

export async function ruteKeuanganLanjutan(app: FastifyInstance): Promise<void> {
  const hanyaPemilik = [autentikasi, izinkanPeran(['pemilik'])];

  // === ASET TETAP & PENYUSUTAN ===
  app.get('/aset-tetap', { preHandler: hanyaPemilik }, async (request, reply) => {
    const data = await withApotek(request.pengguna!.apotekId, async (client) => {
      const res = await client.query(
        `SELECT id, kode, nama, to_char(tanggal_perolehan, 'YYYY-MM-DD') AS tanggal_perolehan,
                nilai_perolehan::text, nilai_residu::text, umur_manfaat_bulan,
                akumulasi_penyusutan::text, aktif
         FROM aset_tetap
         ORDER BY id DESC`,
      );
      return res.rows.map((r) => {
        const perolehan = Number(r.nilai_perolehan);
        const akum = Number(r.akumulasi_penyusutan);
        return {
          ...r,
          id: Number(r.id),
          nilai_perolehan: perolehan,
          nilai_residu: Number(r.nilai_residu),
          akumulasi_penyusutan: akum,
          nilai_buku: perolehan - akum,
        };
      });
    });
    return reply.status(200).send({ data });
  });

  app.post('/aset-tetap', { preHandler: hanyaPemilik }, async (request, reply) => {
    const body = validasiZod(skemaBuatAset, request.body);
    if (body.nilai_residu >= body.nilai_perolehan) {
      throw new GalatAplikasi('VALIDASI_GAGAL', {
        nilai_residu: ['Nilai residu harus lebih kecil dari nilai perolehan.'],
      });
    }
    const u = request.pengguna!;
    const data = await withApotek(u.apotekId, async (client) => {
      const res = await client.query<{ id: string }>(
        `INSERT INTO aset_tetap
           (apotek_id, kode, nama, tanggal_perolehan, nilai_perolehan, nilai_residu, umur_manfaat_bulan, dibuat_oleh)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          u.apotekId,
          body.kode.toUpperCase(),
          body.nama,
          body.tanggal_perolehan,
          body.nilai_perolehan,
          body.nilai_residu,
          body.umur_manfaat_bulan,
          u.id,
        ],
      );
      return { id: Number(res.rows[0]!.id), kode: body.kode.toUpperCase() };
    });
    return reply.status(201).send({ data });
  });

  app.post('/aset-tetap/susutkan', { preHandler: hanyaPemilik }, async (request, reply) => {
    const { periode } = validasiZod(skemaPeriodeBody, request.body);
    const u = request.pengguna!;
    const tanggal = `${periode}-28`;

    const data = await withApotek(u.apotekId, async (client) => {
      const asetRes = await client.query<{
        id: string;
        kode: string;
        nama: string;
        nilai_perolehan: string;
        nilai_residu: string;
        umur_manfaat_bulan: number;
        akumulasi_penyusutan: string;
      }>(`SELECT id::text, kode, nama, nilai_perolehan::text, nilai_residu::text, umur_manfaat_bulan, akumulasi_penyusutan::text FROM aset_tetap WHERE aktif = true FOR UPDATE`);

      const peta = await ambilPetaAkun(client);
      const akunBeban = peta.get('5240');
      const akunAkum = peta.get('1211');
      if (!akunBeban || !akunAkum) {
        throw new GalatAplikasi('GALAT_INTERNAL');
      }

      let diproses = 0;
      let totalNominal = 0;

      for (const a of asetRes.rows) {
        const asetId = Number(a.id);
        const sudah = await client.query(
          `SELECT 1 FROM penyusutan_bulanan WHERE aset_id = $1 AND periode = $2`,
          [asetId, periode],
        );
        if (sudah.rowCount && sudah.rowCount > 0) continue;

        const dapatDisusutkan = Number(a.nilai_perolehan) - Number(a.nilai_residu);
        const sisaSusut = dapatDisusutkan - Number(a.akumulasi_penyusutan);
        if (sisaSusut <= 0) continue;

        const bulanan = Math.min(
          sisaSusut,
          Math.max(1, Math.floor(dapatDisusutkan / a.umur_manfaat_bulan)),
        );

        const jurnal = await buatJurnalDiClient(client, {
          apotekId: u.apotekId,
          tanggal,
          jenis: 'manual',
          keterangan: `Penyusutan bulanan ${a.kode} (${a.nama}) periode ${periode}`,
          dibuatOleh: u.id,
          baris: [
            { akunId: akunBeban.id, debit: bulanan, kredit: 0 },
            { akunId: akunAkum.id, debit: 0, kredit: bulanan },
          ],
        });

        await client.query(
          `INSERT INTO penyusutan_bulanan (apotek_id, aset_id, periode, nominal, jurnal_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [u.apotekId, asetId, periode, bulanan, jurnal.jurnalId],
        );
        await client.query(
          `UPDATE aset_tetap SET akumulasi_penyusutan = akumulasi_penyusutan + $1 WHERE id = $2`,
          [bulanan, asetId],
        );
        diproses++;
        totalNominal += bulanan;
      }

      if (diproses > 0) {
        await catatAudit(client, {
          apotekId: u.apotekId,
          penggunaId: u.id,
          aksi: 'aset.susutkan',
          entitas: 'penyusutan_bulanan',
          entitasId: 0,
          hasil: 'berhasil',
          detail: { periode, diproses, total_nominal: totalNominal },
        });
      }

      return { periode, jumlah_aset_disusutkan: diproses, total_nominal: totalNominal };
    });

    return reply.status(200).send({ data });
  });

  // === ANGGARAN BEBAN VS REALISASI ===
  app.get('/anggaran', { preHandler: hanyaPemilik }, async (request, reply) => {
    const qPeriode = (request.query as { periode?: string }).periode ?? Jam.hariIniWib().slice(0, 7);
    const data = await withApotek(request.pengguna!.apotekId, async (client) => {
      const res = await client.query<{
        id: string;
        periode: string;
        akun_kode: string;
        akun_nama: string;
        nominal_anggaran: string;
        realisasi: string;
      }>(
        `SELECT ab.id::text, ab.periode, ab.akun_kode, a.nama AS akun_nama,
                ab.nominal_anggaran::text,
                COALESCE((
                  SELECT SUM(bj.debit - bj.kredit)
                  FROM baris_jurnal bj
                  JOIN jurnal j ON j.id = bj.jurnal_id
                  WHERE bj.akun_id = a.id AND j.periode = ab.periode
                ), 0)::text AS realisasi
         FROM anggaran_beban ab
         JOIN akun a ON a.kode = ab.akun_kode AND a.apotek_id = ab.apotek_id
         WHERE ab.periode = $1
         ORDER BY ab.akun_kode ASC`,
        [qPeriode],
      );
      return res.rows.map((r) => {
        const angg = Number(r.nominal_anggaran);
        const real = Number(r.realisasi);
        return {
          id: Number(r.id),
          periode: r.periode,
          akun_kode: r.akun_kode,
          akun_nama: r.akun_nama,
          nominal_anggaran: angg,
          realisasi: real,
          selisih: angg - real,
          melampaui: real > angg,
        };
      });
    });
    return reply.status(200).send({ data });
  });

  app.post('/anggaran', { preHandler: hanyaPemilik }, async (request, reply) => {
    const body = validasiZod(skemaSimpanAnggaran, request.body);
    const u = request.pengguna!;
    const data = await withApotek(u.apotekId, async (client) => {
      const res = await client.query<{ id: string }>(
        `INSERT INTO anggaran_beban (apotek_id, periode, akun_kode, nominal_anggaran, dibuat_oleh)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (apotek_id, periode, akun_kode)
         DO UPDATE SET nominal_anggaran = EXCLUDED.nominal_anggaran
         RETURNING id`,
        [u.apotekId, body.periode, body.akun_kode, body.nominal_anggaran, u.id],
      );
      return { id: Number(res.rows[0]!.id), ...body };
    });
    return reply.status(201).send({ data });
  });
}
