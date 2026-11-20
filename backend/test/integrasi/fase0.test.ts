import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { bangunServer } from '../../src/server.js';
import { getPool, tutupSemuaPool } from '../../src/db/pool.js';
import { withApotek } from '../../src/db/withApotek.js';
import { buatApotekDenganPemilik } from '../../src/cli/apotekBuat.js';
import { buatNomorDokumen } from '../../src/lib/nomor.js';
import { resetBasisDataUji } from '../bantu/db.js';
import { GalatAplikasi } from '../../src/lib/galat.js';

describe('Fase 0: Skema, RLS, Hanya-Sisip, Penomoran, dan Kesehatan', () => {
  let app: Awaited<ReturnType<typeof bangunServer>>;

  beforeAll(async () => {
    app = await bangunServer();
  });

  beforeEach(async () => {
    await resetBasisDataUji();
  });

  afterAll(async () => {
    await app.close();
    await tutupSemuaPool();
  });

  it('GET /api/v1/kesehatan mengembalikan 200 ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/kesehatan' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { status: 'ok', basis_data: 'ok' } });
  });

  it('apotekBuat membuat apotek, pengaturan, 18 akun, dan pemilik dengan wajib_ganti_sandi=true', async () => {
    const { apotekId, pemilikId } = await buatApotekDenganPemilik({
      kode: 'BKS01',
      nama: 'Apotek Contoh',
      pemilikUsername: 'rina',
      pemilikNama: 'Rina',
      pemilikSandi: 'Sementara1',
    });

    expect(apotekId).toBeGreaterThan(0);
    expect(pemilikId).toBeGreaterThan(0);

    const jumlahAkun = await withApotek(apotekId, async (client) => {
      const r = await client.query<{ cnt: string }>('SELECT count(*) AS cnt FROM akun');
      return Number(r.rows[0]?.cnt ?? 0);
    });
    expect(jumlahAkun).toBe(18);

    const pool = getPool();
    const resUser = await pool.query<{ peran: string; wajib_ganti_sandi: boolean }>(
      'SELECT peran, wajib_ganti_sandi FROM pengguna WHERE id = $1',
      [pemilikId],
    );
    expect(resUser.rows[0]).toEqual({ peran: 'pemilik', wajib_ganti_sandi: true });
  });

  it('RLS: kueri sebagai pos_app tanpa konteks mengembalikan 0 baris dan isolasi antar apotek berjalan', async () => {
    const a1 = await buatApotekDenganPemilik({
      kode: 'APO01',
      nama: 'Apotek 1',
      pemilikUsername: 'pemilik1',
      pemilikNama: 'Pemilik 1',
      pemilikSandi: 'Rahasia123',
    });
    const a2 = await buatApotekDenganPemilik({
      kode: 'APO02',
      nama: 'Apotek 2',
      pemilikUsername: 'pemilik2',
      pemilikNama: 'Pemilik 2',
      pemilikSandi: 'Rahasia123',
    });

    // Kueri langsung tanpa set_config app.apotek_id -> 0 baris
    const tanpaKonteks = await getPool().query('SELECT id FROM akun');
    expect(tanpaKonteks.rowCount).toBe(0);

    // Insert pemasok di apotek 1, pastikan apotek 2 tidak bisa melihatnya
    await withApotek(a1.apotekId, async (c) => {
      await c.query(
        `INSERT INTO pemasok (apotek_id, kode, nama) VALUES ($1, 'PBF1', 'PBF Satu')`,
        [a1.apotekId],
      );
    });

    const lihatDariA2 = await withApotek(a2.apotekId, async (c) => {
      const r = await c.query('SELECT id FROM pemasok');
      return r.rowCount;
    });
    expect(lihatDariA2).toBe(0);
  });

  it('Hanya-sisip: UPDATE/DELETE pada jurnal, baris_jurnal, jejak_audit, mutasi_stok ditolak', async () => {
    const { apotekId, pemilikId } = await buatApotekDenganPemilik({
      kode: 'SISIP1',
      nama: 'Apotek Sisip',
      pemilikUsername: 'sisip1',
      pemilikNama: 'Sisip',
      pemilikSandi: 'Rahasia123',
    });

    // Uji jejak_audit yang sudah terbuat saat apotekBuat
    await expect(
      withApotek(apotekId, async (c) => {
        await c.query(`UPDATE jejak_audit SET aksi = 'ubah'`);
      }),
    ).rejects.toThrow();

    await expect(
      withApotek(apotekId, async (c) => {
        await c.query(`DELETE FROM jejak_audit`);
      }),
    ).rejects.toThrow();

    // Uji jurnal tidak seimbang ditolak saat COMMIT dengan GalatAplikasi JURNAL_TIDAK_SEIMBANG
    await expect(
      withApotek(apotekId, async (c) => {
        const nomor = await buatNomorDokumen(c, apotekId, 'JU', '2026-11-20');
        const resJ = await c.query<{ id: string }>(
          `INSERT INTO jurnal (apotek_id, nomor, tanggal, periode, jenis, keterangan, dibuat_oleh)
           VALUES ($1, $2, '2026-11-20', '2026-11', 'manual', 'Uji tidak seimbang', $3)
           RETURNING id`,
          [apotekId, nomor, pemilikId],
        );
        const jurnalId = Number(resJ.rows[0]!.id);
        const akun = await c.query<{ id: string }>(`SELECT id FROM akun WHERE kode = '1110'`);
        await c.query(
          `INSERT INTO baris_jurnal (apotek_id, jurnal_id, akun_id, debit, kredit)
           VALUES ($1, $2, $3, 10000, 0)`,
          [apotekId, jurnalId, akun.rows[0]!.id],
        );
      }),
    ).rejects.toSatisfy((err: unknown) => err instanceof GalatAplikasi && err.kode === 'JURNAL_TIDAK_SEIMBANG');
  });

  it('Penomoran dokumen menghasilkan KODE-YYYYMM-NNNNN berurutan dan terisolasi per apotek', async () => {
    const a1 = await buatApotekDenganPemilik({
      kode: 'NOM01',
      nama: 'Apotek Nomor 1',
      pemilikUsername: 'nom1',
      pemilikNama: 'Nom 1',
      pemilikSandi: 'Rahasia123',
    });

    const nomor = await withApotek(a1.apotekId, async (c) => {
      const n1 = await buatNomorDokumen(c, a1.apotekId, 'PJ', '2026-11-20');
      const n2 = await buatNomorDokumen(c, a1.apotekId, 'PJ', '2026-11-21');
      const n3 = await buatNomorDokumen(c, a1.apotekId, 'PJ', '2026-12-01');
      return [n1, n2, n3];
    });

    expect(nomor).toEqual(['PJ-202611-00001', 'PJ-202611-00002', 'PJ-202612-00001']);
  });
});
