import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit } from '../../lib/audit.js';
import { autentikasi, izinkanPeran } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam } from '../../lib/jam.js';
import { buatNomorDokumen } from '../../lib/nomor.js';
import { skemaTanggal, skemaUangPositif, validasiZod } from '../../lib/validasi.js';
import { ambilPetaAkun, buatJurnalDiClient } from '../akuntansi/layanan.js';

const skemaIdParam = z.object({ id: z.coerce.number().int().positive() });

const skemaBuatSp = z
  .object({
    pemasok_id: z.number().int().positive(),
    golongan: z.enum(['umum', 'prekursor', 'psikotropika', 'narkotika']).default('umum'),
    catatan: z.string().trim().max(500).optional(),
    baris: z
      .array(
        z.object({
          barang_id: z.number().int().positive(),
          jumlah: z.number().int().positive(),
        }),
      )
      .min(1)
      .max(100),
  })
  .strict();

const skemaBuatUtang = z
  .object({
    pemasok_id: z.number().int().positive(),
    nomor_faktur: z.string().trim().min(1).max(100),
    tanggal_faktur: skemaTanggal,
    jatuh_tempo: skemaTanggal,
    total: skemaUangPositif,
  })
  .strict();

const skemaBayarUtang = z
  .object({
    tanggal: skemaTanggal.optional(),
    jumlah: skemaUangPositif,
    akun_bayar_kode: z.enum(['1110', '1120']).default('1120'),
    referensi: z.string().trim().max(120).optional(),
  })
  .strict();

const skemaBukuBesarQuery = z.object({
  akun_kode: z.string().trim().min(1),
  dari: skemaTanggal.optional(),
  sampai: skemaTanggal.optional(),
});

const skemaBukaPeriode = z
  .object({
    alasan: z.string().trim().min(10, 'Alasan buka kembali minimal 10 karakter.'),
  })
  .strict();

export async function ruteOperasionalV2(app: FastifyInstance): Promise<void> {
  // === 1. SURAT PESANAN (SP) ===
  app.get(
    '/surat-pesanan',
    { preHandler: [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])] },
    async (request, reply) => {
      const data = await withApotek(request.pengguna!.apotekId, async (client) => {
        const res = await client.query(
          `SELECT sp.id, sp.nomor, sp.golongan, sp.status, sp.catatan,
                  sp.ditandatangani_pada, sp.dibagikan_pada, sp.dibuat_pada,
                  p.nama AS pemasok_nama,
                  u.nama_lengkap AS pembuat_nama,
                  (SELECT COUNT(*)::int FROM baris_surat_pesanan b WHERE b.surat_pesanan_id = sp.id) AS jumlah_item
           FROM surat_pesanan sp
           JOIN pemasok p ON p.id = sp.pemasok_id
           JOIN pengguna u ON u.id = sp.dibuat_oleh
           ORDER BY sp.id DESC
           LIMIT 100`,
        );
        return res.rows;
      });
      return reply.status(200).send({ data });
    },
  );

  app.post(
    '/surat-pesanan',
    { preHandler: [autentikasi, izinkanPeran(['staf_gudang', 'pemilik'])] },
    async (request, reply) => {
      const body = validasiZod(skemaBuatSp, request.body);
      const u = request.pengguna!;
      const hariIni = Jam.hariIniWib();

      const data = await withApotek(u.apotekId, async (client) => {
        const nomor = await buatNomorDokumen(client, u.apotekId, 'SP', hariIni);
        const spRes = await client.query<{ id: string }>(
          `INSERT INTO surat_pesanan
             (apotek_id, nomor, pemasok_id, golongan, status, catatan, dibuat_oleh)
           VALUES ($1, $2, $3, $4, 'menunggu_ttd', $5, $6)
           RETURNING id`,
          [u.apotekId, nomor, body.pemasok_id, body.golongan, body.catatan ?? null, u.id],
        );
        const spId = Number(spRes.rows[0]!.id);

        for (const b of body.baris) {
          const brgRes = await client.query<{ satuan: string }>(
            `SELECT satuan FROM barang WHERE id = $1`,
            [b.barang_id],
          );
          if (brgRes.rowCount === 0) {
            throw new GalatAplikasi('TIDAK_DITEMUKAN', { barang_id: b.barang_id });
          }
          await client.query(
            `INSERT INTO baris_surat_pesanan (apotek_id, surat_pesanan_id, barang_id, jumlah, satuan)
             VALUES ($1, $2, $3, $4, $5)`,
            [u.apotekId, spId, b.barang_id, b.jumlah, brgRes.rows[0]!.satuan],
          );
        }

        await catatAudit(client, {
          apotekId: u.apotekId,
          penggunaId: u.id,
          aksi: 'surat_pesanan.buat',
          entitas: 'surat_pesanan',
          entitasId: spId,
          hasil: 'berhasil',
          detail: { nomor, golongan: body.golongan, jumlah_baris: body.baris.length },
        });
        return { id: spId, nomor, status: 'menunggu_ttd' };
      });
      return reply.status(201).send({ data });
    },
  );

  app.post(
    '/surat-pesanan/:id/tandatangani',
    { preHandler: [autentikasi, izinkanPeran(['apa'])] },
    async (request, reply) => {
      const { id } = validasiZod(skemaIdParam, request.params);
      const u = request.pengguna!;
      const data = await withApotek(u.apotekId, async (client) => {
        const cek = await client.query<{ dibuat_oleh: string; status: string; nomor: string }>(
          `SELECT dibuat_oleh, status, nomor FROM surat_pesanan WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (cek.rowCount === 0) throw new GalatAplikasi('TIDAK_DITEMUKAN');
        const sp = cek.rows[0]!;
        if (Number(sp.dibuat_oleh) === u.id) {
          throw new GalatAplikasi('DILARANG', {
            pesan: 'Pembuat Surat Pesanan tidak boleh menandatangani pengajuannya sendiri.',
          });
        }
        await client.query(
          `UPDATE surat_pesanan
           SET status = 'ditandatangani', ditandatangani_oleh = $1, ditandatangani_pada = now()
           WHERE id = $2`,
          [u.id, id],
        );
        await catatAudit(client, {
          apotekId: u.apotekId,
          penggunaId: u.id,
          aksi: 'surat_pesanan.tandatangani',
          entitas: 'surat_pesanan',
          entitasId: id,
          hasil: 'berhasil',
          detail: { nomor: sp.nomor },
        });
        return { id, nomor: sp.nomor, status: 'ditandatangani' };
      });
      return reply.status(200).send({ data });
    },
  );

  app.post(
    '/surat-pesanan/:id/bagikan',
    { preHandler: [autentikasi, izinkanPeran(['staf_gudang', 'apa', 'pemilik'])] },
    async (request, reply) => {
      const { id } = validasiZod(skemaIdParam, request.params);
      const u = request.pengguna!;
      const data = await withApotek(u.apotekId, async (client) => {
        const res = await client.query<{ nomor: string }>(
          `UPDATE surat_pesanan
           SET status = 'dibagikan', dibagikan_pada = now()
           WHERE id = $1
           RETURNING nomor`,
          [id],
        );
        if (res.rowCount === 0) throw new GalatAplikasi('TIDAK_DITEMUKAN');
        await catatAudit(client, {
          apotekId: u.apotekId,
          penggunaId: u.id,
          aksi: 'surat_pesanan.bagikan',
          entitas: 'surat_pesanan',
          entitasId: id,
          hasil: 'berhasil',
          detail: { keterangan: 'Dibagikan oleh pengguna melalui share sheet/WhatsApp' },
        });
        return { id, nomor: res.rows[0]!.nomor, status: 'dibagikan' };
      });
      return reply.status(200).send({ data });
    },
  );

  // === 2. UTANG USAHA (AP SUBLEDGER) ===
  app.get(
    '/utang-pemasok',
    { preHandler: [autentikasi, izinkanPeran(['pemilik', 'staf_gudang'])] },
    async (request, reply) => {
      const data = await withApotek(request.pengguna!.apotekId, async (client) => {
        const res = await client.query(
          `SELECT u.id, u.nomor_faktur, u.tanggal_faktur, u.jatuh_tempo,
                  u.total::text, u.terbayar::text, (u.total - u.terbayar)::text AS sisa,
                  u.status, p.nama AS pemasok_nama
           FROM utang_pemasok u
           JOIN pemasok p ON p.id = u.pemasok_id
           ORDER BY u.jatuh_tempo ASC, u.id DESC`,
        );
        const totalSisa = res.rows.reduce((acc, r) => acc + Number(r.sisa), 0);
        return {
          total_sisa_utang: totalSisa,
          daftar: res.rows.map((r) => ({
            ...r,
            total: Number(r.total),
            terbayar: Number(r.terbayar),
            sisa: Number(r.sisa),
          })),
        };
      });
      return reply.status(200).send({ data });
    },
  );

  app.post(
    '/utang-pemasok',
    { preHandler: [autentikasi, izinkanPeran(['pemilik', 'staf_gudang'])] },
    async (request, reply) => {
      const body = validasiZod(skemaBuatUtang, request.body);
      const u = request.pengguna!;
      const data = await withApotek(u.apotekId, async (client) => {
        const res = await client.query<{ id: string }>(
          `INSERT INTO utang_pemasok
             (apotek_id, pemasok_id, nomor_faktur, tanggal_faktur, jatuh_tempo, total, dibuat_oleh)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            u.apotekId,
            body.pemasok_id,
            body.nomor_faktur,
            body.tanggal_faktur,
            body.jatuh_tempo,
            body.total,
            u.id,
          ],
        );
        return { id: Number(res.rows[0]!.id), status: 'belum' };
      });
      return reply.status(201).send({ data });
    },
  );

  app.post(
    '/utang-pemasok/:id/bayar',
    { preHandler: [autentikasi, izinkanPeran(['pemilik'])] },
    async (request, reply) => {
      const { id } = validasiZod(skemaIdParam, request.params);
      const body = validasiZod(skemaBayarUtang, request.body);
      const u = request.pengguna!;
      const tanggal = body.tanggal ?? Jam.hariIniWib();

      const data = await withApotek(u.apotekId, async (client) => {
        const cek = await client.query<{
          nomor_faktur: string;
          total: string;
          terbayar: string;
        }>(`SELECT nomor_faktur, total::text, terbayar::text FROM utang_pemasok WHERE id = $1 FOR UPDATE`, [
          id,
        ]);
        if (cek.rowCount === 0) throw new GalatAplikasi('TIDAK_DITEMUKAN');
        const row = cek.rows[0]!;
        const total = Number(row.total);
        const terbayarLama = Number(row.terbayar);
        const sisa = total - terbayarLama;
        if (body.jumlah > sisa) {
          throw new GalatAplikasi('VALIDASI_GAGAL', {
            jumlah: [`Jumlah bayar melebihi sisa utang (${sisa}).`],
          });
        }

        const peta = await ambilPetaAkun(client);
        const akunUtang = peta.get('2110');
        const akunBayar = peta.get(body.akun_bayar_kode);
        if (!akunUtang || !akunBayar) {
          throw new GalatAplikasi('GALAT_INTERNAL');
        }

        const jurnal = await buatJurnalDiClient(client, {
          apotekId: u.apotekId,
          tanggal,
          jenis: 'manual',
          keterangan: `Pembayaran utang faktur ${row.nomor_faktur}${body.referensi ? ` (${body.referensi})` : ''}`,
          dibuatOleh: u.id,
          baris: [
            { akunId: akunUtang.id, debit: body.jumlah, kredit: 0 },
            { akunId: akunBayar.id, debit: 0, kredit: body.jumlah },
          ],
        });

        const terbayarBaru = terbayarLama + body.jumlah;
        const statusBaru = terbayarBaru >= total ? 'lunas' : 'sebagian';
        await client.query(
          `UPDATE utang_pemasok SET terbayar = $1, status = $2 WHERE id = $3`,
          [terbayarBaru, statusBaru, id],
        );
        await client.query(
          `INSERT INTO pembayaran_utang
             (apotek_id, utang_id, tanggal, jumlah, akun_bayar_kode, referensi, jurnal_id, dibuat_oleh)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            u.apotekId,
            id,
            tanggal,
            body.jumlah,
            body.akun_bayar_kode,
            body.referensi ?? null,
            jurnal.jurnalId,
            u.id,
          ],
        );
        await catatAudit(client, {
          apotekId: u.apotekId,
          penggunaId: u.id,
          aksi: 'utang.bayar',
          entitas: 'utang_pemasok',
          entitasId: id,
          hasil: 'berhasil',
          detail: { jumlah: body.jumlah, status: statusBaru, jurnal_id: jurnal.jurnalId },
        });
        return {
          id,
          status: statusBaru,
          terbayar: terbayarBaru,
          sisa: total - terbayarBaru,
          jurnal_id: jurnal.jurnalId,
        };
      });
      return reply.status(200).send({ data });
    },
  );

  // === 3. BUKU BESAR RINGKAS BY KODE AKUN ===
  app.get(
    '/laporan-keuangan/buku-besar-akun',
    { preHandler: [autentikasi, izinkanPeran(['pemilik'])] },
    async (request, reply) => {
      const q = validasiZod(skemaBukuBesarQuery, request.query);
      const dari = q.dari ?? `${Jam.hariIniWib().slice(0, 7)}-01`;
      const sampai = q.sampai ?? Jam.hariIniWib();

      const data = await withApotek(request.pengguna!.apotekId, async (client) => {
        const akunRes = await client.query<{
          id: string;
          kode: string;
          nama: string;
          tipe: string;
          saldo_normal: 'debit' | 'kredit';
        }>(`SELECT id::text, kode, nama, tipe, saldo_normal FROM akun WHERE kode = $1`, [
          q.akun_kode,
        ]);
        if (akunRes.rowCount === 0) throw new GalatAplikasi('TIDAK_DITEMUKAN');
        const akun = akunRes.rows[0]!;
        const akunId = Number(akun.id);

        const awalRes = await client.query<{ d: string; k: string }>(
          `SELECT COALESCE(SUM(bj.debit), 0)::text AS d, COALESCE(SUM(bj.kredit), 0)::text AS k
           FROM baris_jurnal bj
           JOIN jurnal j ON j.id = bj.jurnal_id
           WHERE bj.akun_id = $1 AND j.tanggal < $2::date`,
          [akunId, dari],
        );
        const dAwal = Number(awalRes.rows[0]!.d);
        const kAwal = Number(awalRes.rows[0]!.k);
        let saldo = akun.saldo_normal === 'debit' ? dAwal - kAwal : kAwal - dAwal;
        const saldoAwal = saldo;

        const mutRes = await client.query<{
          jurnal_id: string;
          nomor: string;
          tanggal: string;
          jenis: string;
          keterangan: string;
          debit: string;
          kredit: string;
        }>(
          `SELECT j.id::text AS jurnal_id, j.nomor, to_char(j.tanggal, 'YYYY-MM-DD') AS tanggal,
                  j.jenis, j.keterangan, bj.debit::text, bj.kredit::text
           FROM baris_jurnal bj
           JOIN jurnal j ON j.id = bj.jurnal_id
           WHERE bj.akun_id = $1 AND j.tanggal BETWEEN $2::date AND $3::date
           ORDER BY j.tanggal ASC, j.id ASC`,
          [akunId, dari, sampai],
        );

        const baris = mutRes.rows.map((r) => {
          const d = Number(r.debit);
          const k = Number(r.kredit);
          saldo += akun.saldo_normal === 'debit' ? d - k : k - d;
          return {
            jurnal_id: Number(r.jurnal_id),
            nomor: r.nomor,
            tanggal: r.tanggal,
            jenis: r.jenis,
            keterangan: r.keterangan,
            debit: d,
            kredit: k,
            saldo_berjalan: saldo,
          };
        });

        return {
          akun: {
            kode: akun.kode,
            nama: akun.nama,
            tipe: akun.tipe,
            saldo_normal: akun.saldo_normal,
          },
          dari,
          sampai,
          saldo_awal: saldoAwal,
          saldo_akhir: saldo,
          baris,
        };
      });
      return reply.status(200).send({ data });
    },
  );

  // === 4. BUKA KEMBALI PERIODE TERKUNCI (PEMILIK + ALASAN + AUDIT) ===
  app.post(
    '/periode/:periode/buka-kembali',
    { preHandler: [autentikasi, izinkanPeran(['pemilik'])] },
    async (request, reply) => {
      const { periode } = validasiZod(
        z.object({ periode: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }),
        request.params,
      );
      const body = validasiZod(skemaBukaPeriode, request.body);
      const u = request.pengguna!;

      const data = await withApotek(u.apotekId, async (client) => {
        const res = await client.query<{ id: string }>(
          `UPDATE periode_akuntansi
           SET status = 'terbuka', ditutup_oleh = NULL, ditutup_pada = NULL
           WHERE periode = $1 AND status = 'ditutup'
           RETURNING id`,
          [periode],
        );
        if (res.rowCount === 0) {
          throw new GalatAplikasi('TIDAK_DITEMUKAN', {
            pesan: 'Periode tidak ditemukan atau tidak sedang ditutup.',
          });
        }
        await catatAudit(client, {
          apotekId: u.apotekId,
          penggunaId: u.id,
          aksi: 'periode.buka_kembali',
          entitas: 'periode_akuntansi',
          entitasId: Number(res.rows[0]!.id),
          hasil: 'berhasil',
          detail: { periode, alasan: body.alasan },
        });
        return { periode, status: 'terbuka' };
      });
      return reply.status(200).send({ data });
    },
  );
}
