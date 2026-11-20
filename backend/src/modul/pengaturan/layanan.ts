import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit } from '../../lib/audit.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { teksOpsional, teksWajib } from '../../lib/validasi.js';

export const skemaUbahPengaturan = z
  .object({
    nama: teksWajib(1, 150).optional(),
    alamat: teksOpsional(500).optional(),
    telepon: teksOpsional(50).optional(),
    batas_near_expired_hari: z.number().int().min(1).max(365).optional(),
    laporan_bulanan_tanggal: z.number().int().min(1).max(28).optional(),
    kepala_struk: z.string().trim().max(200).optional(),
    kaki_struk: z.string().trim().max(200).optional(),
  })
  .strict();

export async function ambilPengaturanLayanan(apotekId: number) {
  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      kode: string;
      nama: string;
      alamat: string | null;
      telepon: string | null;
      batas_near_expired_hari: number;
      laporan_bulanan_tanggal: number;
      kepala_struk: string;
      kaki_struk: string;
    }>(
      `SELECT a.kode, a.nama, a.alamat, a.telepon,
              p.batas_near_expired_hari, p.laporan_bulanan_tanggal,
              p.kepala_struk, p.kaki_struk
       FROM apotek a
       JOIN pengaturan_apotek p ON p.apotek_id = a.id
       WHERE a.id = $1`,
      [apotekId],
    );

    const row = res.rows[0];
    if (!row) {
      throw new GalatAplikasi('TIDAK_DITEMUKAN');
    }

    return {
      apotek: {
        kode: row.kode,
        nama: row.nama,
        alamat: row.alamat,
        telepon: row.telepon,
      },
      batas_near_expired_hari: row.batas_near_expired_hari,
      laporan_bulanan_tanggal: row.laporan_bulanan_tanggal,
      kepala_struk: row.kepala_struk,
      kaki_struk: row.kaki_struk,
    };
  });
}

export async function ubahPengaturanLayanan(
  pengguna: KonteksPengguna,
  input: z.infer<typeof skemaUbahPengaturan>,
) {
  await withApotek(pengguna.apotekId, async (client) => {
    if (
      input.nama !== undefined ||
      input.alamat !== undefined ||
      input.telepon !== undefined
    ) {
      await client.query(
        `UPDATE apotek
         SET nama = COALESCE($1, nama),
             alamat = CASE WHEN $2::boolean THEN $3 ELSE alamat END,
             telepon = CASE WHEN $4::boolean THEN $5 ELSE telepon END
         WHERE id = $6`,
        [
          input.nama ?? null,
          input.alamat !== undefined,
          input.alamat ?? null,
          input.telepon !== undefined,
          input.telepon ?? null,
          pengguna.apotekId,
        ],
      );
    }

    if (
      input.batas_near_expired_hari !== undefined ||
      input.laporan_bulanan_tanggal !== undefined ||
      input.kepala_struk !== undefined ||
      input.kaki_struk !== undefined
    ) {
      await client.query(
        `UPDATE pengaturan_apotek
         SET batas_near_expired_hari = COALESCE($1, batas_near_expired_hari),
             laporan_bulanan_tanggal = COALESCE($2, laporan_bulanan_tanggal),
             kepala_struk = COALESCE($3, kepala_struk),
             kaki_struk = COALESCE($4, kaki_struk)
         WHERE apotek_id = $5`,
        [
          input.batas_near_expired_hari ?? null,
          input.laporan_bulanan_tanggal ?? null,
          input.kepala_struk ?? null,
          input.kaki_struk ?? null,
          pengguna.apotekId,
        ],
      );
    }

    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'pengaturan.ubah',
      entitas: 'pengaturan_apotek',
      entitasId: pengguna.apotekId,
      hasil: 'berhasil',
    });
  });

  return ambilPengaturanLayanan(pengguna.apotekId);
}
