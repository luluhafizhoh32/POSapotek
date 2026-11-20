import type pg from 'pg';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import { catatAudit } from '../../lib/audit.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam, ZONA_BISNIS } from '../../lib/jam.js';
import { buatNomorDokumen } from '../../lib/nomor.js';
import { keUangBulat } from '../../lib/uang.js';
import {
  skemaJumlah,
  skemaKode,
  skemaPaginasi,
  skemaPeriode,
  skemaTanggal,
  skemaUang,
  teksWajib,
} from '../../lib/validasi.js';

const AKUN_SALDO_AWAL_DIIZINKAN = new Set([
  '1110',
  '1120',
  '1141',
  '1210',
  '1211',
  '2110',
  '2120',
]);

const ATURAN_JURNAL_MANUAL: Record<
  'bayar_utang' | 'beban' | 'prive' | 'peralatan' | 'penyesuaian',
  { debit: Set<string>; kredit: Set<string> }
> = {
  bayar_utang: {
    debit: new Set(['2110', '2120']),
    kredit: new Set(['1110', '1120']),
  },
  beban: {
    debit: new Set(['5210', '5220']),
    kredit: new Set(['1110', '1120', '2120']),
  },
  prive: {
    debit: new Set(['3120']),
    kredit: new Set(['1110', '1120']),
  },
  peralatan: {
    debit: new Set(['1210']),
    kredit: new Set(['1110', '1120', '2110']),
  },
  penyesuaian: {
    debit: new Set(['5130', '5210', '5220', '5240']),
    kredit: new Set(['1141', '1211', '2120']),
  },
};

export const skemaSaldoAwal = z
  .object({
    tanggal: skemaTanggal,
    akun: z.array(
      z
        .object({
          kode: skemaKode,
          saldo: skemaUang,
        })
        .strict(),
    ),
    stok: z.array(
      z
        .object({
          barang_id: z.number().int().positive(),
          nomor_batch: teksWajib(1, 60),
          tanggal_kedaluwarsa: skemaTanggal,
          jumlah: skemaJumlah,
          harga_beli: skemaUang,
        })
        .strict(),
    ),
  })
  .strict();

export const skemaJurnalManual = z
  .object({
    tanggal: skemaTanggal,
    jenis: z.enum(['bayar_utang', 'beban', 'prive', 'peralatan', 'penyesuaian']),
    keterangan: teksWajib(1, 500),
    baris: z
      .array(
        z
          .object({
            akun_kode: skemaKode,
            debit: skemaUang,
            kredit: skemaUang,
          })
          .strict(),
      )
      .min(2),
  })
  .strict();

export const skemaDaftarJurnal = skemaPaginasi.extend({
  periode: skemaPeriode.optional(),
  jenis: z
    .enum([
      'penjualan',
      'penerimaan',
      'pengurangan',
      'saldo_awal',
      'manual',
      'penyesuaian',
      'penutup',
    ])
    .optional(),
});

export interface BarisJurnalInput {
  akunId: number;
  debit: number;
  kredit: number;
}

export async function buatJurnalDiClient(
  client: pg.PoolClient,
  params: {
    apotekId: number;
    tanggal: string;
    jenis: 'penjualan' | 'penerimaan' | 'pengurangan' | 'saldo_awal' | 'manual' | 'penyesuaian' | 'penutup';
    subjenis?: string | null;
    keterangan: string;
    sumberTipe?: string | null;
    sumberId?: number | null;
    dibuatOleh?: number | null;
    baris: BarisJurnalInput[];
  },
): Promise<{ jurnalId: number; nomor: string }> {
  const barisValid = params.baris.filter((b) => b.debit > 0 || b.kredit > 0);
  const totalDebit = barisValid.reduce((acc, b) => acc + b.debit, 0);
  const totalKredit = barisValid.reduce((acc, b) => acc + b.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new GalatAplikasi('JURNAL_TIDAK_SEIMBANG');
  }

  const periode = params.tanggal.slice(0, 7);
  const nomor = await buatNomorDokumen(client, params.apotekId, 'JU', params.tanggal);

  const resJ = await client.query<{ id: string }>(
    `INSERT INTO jurnal
      (apotek_id, nomor, tanggal, periode, jenis, subjenis, keterangan, sumber_tipe, sumber_id, dibuat_oleh, dibuat_pada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      params.apotekId,
      nomor,
      params.tanggal,
      periode,
      params.jenis,
      params.subjenis ?? null,
      params.keterangan,
      params.sumberTipe ?? null,
      params.sumberId ?? null,
      params.dibuatOleh ?? null,
      Jam.sekarang().toISO(),
    ],
  );
  const jurnalId = Number(resJ.rows[0]!.id);

  for (const b of barisValid) {
    await client.query(
      `INSERT INTO baris_jurnal (apotek_id, jurnal_id, akun_id, debit, kredit)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.apotekId, jurnalId, b.akunId, b.debit, b.kredit],
    );
  }

  return { jurnalId, nomor };
}

export async function ambilPetaAkun(client: pg.PoolClient) {
  const res = await client.query<{
    id: string;
    kode: string;
    nama: string;
    tipe: string;
    saldo_normal: 'debit' | 'kredit';
    aktif: boolean;
  }>(`SELECT id, kode, nama, tipe, saldo_normal, aktif FROM akun`);

  const peta = new Map<
    string,
    { id: number; kode: string; nama: string; tipe: string; saldoNormal: 'debit' | 'kredit'; aktif: boolean }
  >();
  for (const r of res.rows) {
    peta.set(r.kode, {
      id: Number(r.id),
      kode: r.kode,
      nama: r.nama,
      tipe: r.tipe,
      saldoNormal: r.saldo_normal,
      aktif: r.aktif,
    });
  }
  return peta;
}

export async function daftarAkunLayanan(apotekId: number) {
  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      kode: string;
      nama: string;
      tipe: string;
      saldo_normal: string;
      aktif: boolean;
    }>(`SELECT kode, nama, tipe, saldo_normal, aktif FROM akun ORDER BY kode ASC`);
    return res.rows;
  });
}

export async function buatSaldoAwalLayanan(
  pengguna: KonteksPengguna,
  input: z.infer<typeof skemaSaldoAwal>,
) {
  const hariIni = Jam.hariIniWib();
  if (input.tanggal > hariIni) {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      tanggal: ['Tanggal tidak boleh melebihi hari ini.'],
    });
  }

  const kodeTerlihat = new Set<string>();
  for (const a of input.akun) {
    if (!AKUN_SALDO_AWAL_DIIZINKAN.has(a.kode)) {
      throw new GalatAplikasi('AKUN_DILARANG', { kode: a.kode });
    }
    if (kodeTerlihat.has(a.kode)) {
      throw new GalatAplikasi('VALIDASI_GAGAL', { akun: [`Kode akun ${a.kode} ganda.`] });
    }
    kodeTerlihat.add(a.kode);
  }

  const batchTerlihat = new Set<string>();
  for (const s of input.stok) {
    const kunci = `${s.barang_id}::${s.nomor_batch}`;
    if (batchTerlihat.has(kunci)) {
      throw new GalatAplikasi('VALIDASI_GAGAL', {
        stok: [`Pasangan barang ${s.barang_id} dan batch ${s.nomor_batch} ganda.`],
      });
    }
    batchTerlihat.add(kunci);
  }

  return withApotek(pengguna.apotekId, async (client) => {
    const cekJurnal = await client.query('SELECT 1 FROM jurnal LIMIT 1');
    if (cekJurnal.rowCount && cekJurnal.rowCount > 0) {
      throw new GalatAplikasi('SALDO_AWAL_TIDAK_DAPAT');
    }

    const petaAkun = await ambilPetaAkun(client);

    let totalDebit = 0;
    let totalKreditLainnya = 0;
    const barisJurnal: BarisJurnalInput[] = [];

    for (const a of input.akun) {
      if (a.saldo === 0) continue;
      const info = petaAkun.get(a.kode);
      if (!info) throw new GalatAplikasi('AKUN_DILARANG', { kode: a.kode });

      if (info.saldoNormal === 'debit') {
        totalDebit += a.saldo;
        barisJurnal.push({ akunId: info.id, debit: a.saldo, kredit: 0 });
      } else {
        totalKreditLainnya += a.saldo;
        barisJurnal.push({ akunId: info.id, debit: 0, kredit: a.saldo });
      }
    }

    let totalPersediaan = 0;
    const batchMutasi: Array<{ batchId: number; barangId: number; jumlah: number }> = [];

    for (const s of input.stok) {
      const cekBarang = await client.query('SELECT 1 FROM barang WHERE id = $1', [s.barang_id]);
      if (!cekBarang.rowCount) {
        throw new GalatAplikasi('TIDAK_DITEMUKAN', { barang_id: s.barang_id });
      }

      const bRes = await client.query<{ id: string }>(
        `INSERT INTO batch_barang
          (apotek_id, barang_id, nomor_batch, tanggal_kedaluwarsa, harga_beli, stok, dibuat_pada)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          pengguna.apotekId,
          s.barang_id,
          s.nomor_batch,
          s.tanggal_kedaluwarsa,
          s.harga_beli,
          s.jumlah,
          Jam.sekarang().toISO(),
        ],
      );
      const batchId = Number(bRes.rows[0]!.id);
      totalPersediaan += s.jumlah * s.harga_beli;
      batchMutasi.push({ batchId, barangId: s.barang_id, jumlah: s.jumlah });
    }

    if (totalPersediaan > 0) {
      const akunPersediaan = petaAkun.get('1140')!;
      totalDebit += totalPersediaan;
      barisJurnal.push({ akunId: akunPersediaan.id, debit: totalPersediaan, kredit: 0 });
    }

    const modal = totalDebit - totalKreditLainnya;
    if (modal < 0) {
      throw new GalatAplikasi('SALDO_AWAL_TIDAK_VALID');
    }
    if (modal > 0) {
      const akunModal = petaAkun.get('3110')!;
      barisJurnal.push({ akunId: akunModal.id, debit: 0, kredit: modal });
    }

    if (barisJurnal.length === 0) {
      throw new GalatAplikasi('VALIDASI_GAGAL', {
        _: ['Minimal satu saldo akun atau stok harus lebih dari nol.'],
      });
    }

    const { jurnalId, nomor } = await buatJurnalDiClient(client, {
      apotekId: pengguna.apotekId,
      tanggal: input.tanggal,
      jenis: 'saldo_awal',
      keterangan: 'Saldo awal',
      dibuatOleh: pengguna.id,
      baris: barisJurnal,
    });

    const waktu = Jam.sekarang().toISO();
    for (const m of batchMutasi) {
      await client.query(
        `INSERT INTO mutasi_stok
          (apotek_id, batch_id, barang_id, jenis, jumlah, waktu, sumber_tipe, sumber_id)
         VALUES ($1, $2, $3, 'saldo_awal', $4, $5, 'jurnal', $6)`,
        [pengguna.apotekId, m.batchId, m.barangId, m.jumlah, waktu, jurnalId],
      );
    }

    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'akuntansi.saldo_awal',
      entitas: 'jurnal',
      entitasId: jurnalId,
      hasil: 'berhasil',
      detail: { nomor, modal, total_persediaan: totalPersediaan },
    });

    return {
      jurnal_id: jurnalId,
      nomor,
      modal,
      total_persediaan: totalPersediaan,
    };
  });
}

export async function buatJurnalManualLayanan(
  pengguna: KonteksPengguna,
  input: z.infer<typeof skemaJurnalManual>,
) {
  const hariIni = Jam.hariIniWib();
  if (input.tanggal > hariIni) {
    throw new GalatAplikasi('VALIDASI_GAGAL', {
      tanggal: ['Tanggal tidak boleh melebihi hari ini.'],
    });
  }

  let totalDebit = 0;
  let totalKredit = 0;
  const aturan = ATURAN_JURNAL_MANUAL[input.jenis];

  for (const b of input.baris) {
    const satuSisi = (b.debit > 0) !== (b.kredit > 0);
    if (!satuSisi) {
      throw new GalatAplikasi('VALIDASI_GAGAL', {
        baris: ['Setiap baris jurnal harus mengisi tepat satu sisi (debit atau kredit).'],
      });
    }
    if (b.debit > 0 && !aturan.debit.has(b.akun_kode)) {
      throw new GalatAplikasi('AKUN_DILARANG', { akun_kode: b.akun_kode, sisi: 'debit' });
    }
    if (b.kredit > 0 && !aturan.kredit.has(b.akun_kode)) {
      throw new GalatAplikasi('AKUN_DILARANG', { akun_kode: b.akun_kode, sisi: 'kredit' });
    }
    totalDebit += b.debit;
    totalKredit += b.kredit;
  }

  if (totalDebit !== totalKredit) {
    throw new GalatAplikasi('JURNAL_TIDAK_SEIMBANG');
  }

  const periode = input.tanggal.slice(0, 7);

  return withApotek(pengguna.apotekId, async (client) => {
    const pRes = await client.query<{ status: string }>(
      `SELECT status FROM periode_akuntansi WHERE periode = $1`,
      [periode],
    );
    if (pRes.rows[0]?.status === 'ditutup') {
      throw new GalatAplikasi('PERIODE_DITUTUP');
    }

    const petaAkun = await ambilPetaAkun(client);
    const barisInput: BarisJurnalInput[] = input.baris.map((b) => {
      const info = petaAkun.get(b.akun_kode);
      if (!info || !info.aktif) {
        throw new GalatAplikasi('AKUN_DILARANG', { akun_kode: b.akun_kode });
      }
      return { akunId: info.id, debit: b.debit, kredit: b.kredit };
    });

    const jenisDb = input.jenis === 'penyesuaian' ? 'penyesuaian' : 'manual';
    const subjenisDb = input.jenis === 'penyesuaian' ? null : input.jenis;

    const { jurnalId, nomor } = await buatJurnalDiClient(client, {
      apotekId: pengguna.apotekId,
      tanggal: input.tanggal,
      jenis: jenisDb,
      subjenis: subjenisDb,
      keterangan: input.keterangan,
      dibuatOleh: pengguna.id,
      baris: barisInput,
    });

    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'akuntansi.jurnal_manual',
      entitas: 'jurnal',
      entitasId: jurnalId,
      hasil: 'berhasil',
      detail: { nomor, jenis: input.jenis, total: totalDebit },
    });

    return { id: jurnalId, nomor, tanggal: input.tanggal, jenis: jenisDb, subjenis: subjenisDb, total: totalDebit };
  });
}

export async function daftarJurnalLayanan(
  apotekId: number,
  query: z.infer<typeof skemaDaftarJurnal>,
) {
  return withApotek(apotekId, async (client) => {
    const kondisi: string[] = [];
    const params: unknown[] = [];

    if (query.periode) {
      params.push(query.periode);
      kondisi.push(`j.periode = $${params.length}`);
    }
    if (query.jenis) {
      params.push(query.jenis);
      kondisi.push(`j.jenis = $${params.length}`);
    }

    const whereSql = kondisi.length > 0 ? `WHERE ${kondisi.join(' AND ')}` : '';
    const totalRes = await client.query<{ cnt: string }>(
      `SELECT count(*) AS cnt FROM jurnal j ${whereSql}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.cnt ?? 0);

    const offset = (query.halaman - 1) * query.per_halaman;
    const rowsRes = await client.query<{
      id: string;
      nomor: string;
      tanggal: Date | string;
      jenis: string;
      subjenis: string | null;
      keterangan: string;
      total: string;
    }>(
      `SELECT j.id, j.nomor, j.tanggal, j.jenis, j.subjenis, j.keterangan,
              COALESCE(SUM(bj.debit), 0) AS total
       FROM jurnal j
       LEFT JOIN baris_jurnal bj ON bj.jurnal_id = j.id
       ${whereSql}
       GROUP BY j.id
       ORDER BY j.tanggal DESC, j.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.per_halaman, offset],
    );

    return {
      data: rowsRes.rows.map((r) => ({
        id: Number(r.id),
        nomor: r.nomor,
        tanggal: Jam.keTanggalWib(r.tanggal),
        jenis: r.jenis,
        subjenis: r.subjenis,
        keterangan: r.keterangan,
        total: keUangBulat(r.total),
      })),
      meta: {
        halaman: query.halaman,
        per_halaman: query.per_halaman,
        total,
      },
    };
  });
}

export async function ambilJurnalLayanan(apotekId: number, id: number) {
  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      id: string;
      nomor: string;
      tanggal: Date | string;
      periode: string;
      jenis: string;
      subjenis: string | null;
      keterangan: string;
      dibuat_oleh: string | null;
    }>(
      `SELECT id, nomor, tanggal, periode, jenis, subjenis, keterangan, dibuat_oleh
       FROM jurnal WHERE id = $1`,
      [id],
    );
    const j = res.rows[0];
    if (!j) throw new GalatAplikasi('TIDAK_DITEMUKAN');

    const barisRes = await client.query<{
      akun_kode: string;
      akun_nama: string;
      debit: string;
      kredit: string;
    }>(
      `SELECT a.kode AS akun_kode, a.nama AS akun_nama, bj.debit, bj.kredit
       FROM baris_jurnal bj
       JOIN akun a ON a.id = bj.akun_id
       WHERE bj.jurnal_id = $1
       ORDER BY bj.id ASC`,
      [id],
    );

    return {
      id: Number(j.id),
      nomor: j.nomor,
      tanggal: Jam.keTanggalWib(j.tanggal),
      periode: j.periode,
      jenis: j.jenis,
      subjenis: j.subjenis,
      keterangan: j.keterangan,
      dibuat_oleh: j.dibuat_oleh ? Number(j.dibuat_oleh) : null,
      baris: barisRes.rows.map((b) => ({
        akun_kode: b.akun_kode,
        akun_nama: b.akun_nama,
        debit: keUangBulat(b.debit),
        kredit: keUangBulat(b.kredit),
      })),
    };
  });
}

function rentangBulan(awal: string, akhir: string): string[] {
  const hasil: string[] = [];
  let cursor = DateTime.fromFormat(awal, 'yyyy-MM', { zone: ZONA_BISNIS });
  const end = DateTime.fromFormat(akhir, 'yyyy-MM', { zone: ZONA_BISNIS });
  while (cursor <= end) {
    hasil.push(cursor.toFormat('yyyy-MM'));
    cursor = cursor.plus({ months: 1 });
  }
  return hasil;
}

export async function daftarPeriodeLayanan(apotekId: number) {
  const bulanBerjalan = Jam.periodeSekarangWib();

  return withApotek(apotekId, async (client) => {
    const minRes = await client.query<{ min_p: string | null }>(
      `SELECT MIN(periode) AS min_p FROM jurnal`,
    );
    const minPeriode = minRes.rows[0]?.min_p;
    if (!minPeriode) {
      return [];
    }

    const pRes = await client.query<{
      periode: string;
      status: 'terbuka' | 'ditutup';
      ditutup_pada: Date | null;
    }>(`SELECT periode, status, ditutup_pada FROM periode_akuntansi`);
    const peta = new Map(pRes.rows.map((r) => [r.periode, r]));

    const akhir = minPeriode > bulanBerjalan ? minPeriode : bulanBerjalan;
    return rentangBulan(minPeriode, akhir).map((p) => {
      const info = peta.get(p);
      return {
        periode: p,
        status: info?.status ?? 'terbuka',
        ditutup_pada: info?.ditutup_pada ? Jam.keIsoWib(info.ditutup_pada) : null,
      };
    });
  });
}

export async function tutupPeriodeLayanan(pengguna: KonteksPengguna, periode: string) {
  const bulanBerjalan = Jam.periodeSekarangWib();
  if (periode >= bulanBerjalan) {
    throw new GalatAplikasi('PERIODE_BELUM_BERAKHIR');
  }

  return withApotek(pengguna.apotekId, async (client) => {
    const cekStatus = await client.query<{ status: string }>(
      `SELECT status FROM periode_akuntansi WHERE periode = $1 FOR UPDATE`,
      [periode],
    );
    if (cekStatus.rows[0]?.status === 'ditutup') {
      throw new GalatAplikasi('PERIODE_SUDAH_DITUTUP');
    }

    const minRes = await client.query<{ min_p: string | null }>(
      `SELECT MIN(periode) AS min_p FROM jurnal`,
    );
    const minPeriode = minRes.rows[0]?.min_p;
    if (minPeriode && minPeriode < periode) {
      const bulanSebelumnya = DateTime.fromFormat(periode, 'yyyy-MM', { zone: ZONA_BISNIS })
        .minus({ months: 1 })
        .toFormat('yyyy-MM');
      const daftarCek = rentangBulan(minPeriode, bulanSebelumnya);
      const pRes = await client.query<{ periode: string; status: string }>(
        `SELECT periode, status FROM periode_akuntansi WHERE periode = ANY($1::text[])`,
        [daftarCek],
      );
      const petaStatus = new Map(pRes.rows.map((r) => [r.periode, r.status]));
      for (const b of daftarCek) {
        if (petaStatus.get(b) !== 'ditutup') {
          throw new GalatAplikasi('PERIODE_SEBELUMNYA_BELUM_DITUTUP', { periode: b });
        }
      }
    }

    const akhirBulan = DateTime.fromFormat(periode, 'yyyy-MM', { zone: ZONA_BISNIS })
      .endOf('month')
      .toFormat('yyyy-MM-dd');

    // Hitung saldo periode P dari jurnal selain penutup
    const saldoRes = await client.query<{
      akun_id: string;
      kode: string;
      tipe: string;
      saldo_normal: 'debit' | 'kredit';
      net: string;
    }>(
      `SELECT a.id AS akun_id, a.kode, a.tipe, a.saldo_normal,
              COALESCE(SUM(bj.debit) - SUM(bj.kredit), 0) AS net
       FROM akun a
       JOIN baris_jurnal bj ON bj.akun_id = a.id
       JOIN jurnal j ON j.id = bj.jurnal_id
       WHERE j.periode = $1 AND j.jenis <> 'penutup'
       GROUP BY a.id, a.kode, a.tipe, a.saldo_normal
       ORDER BY a.kode ASC`,
      [periode],
    );

    const petaAkun = await ambilPetaAkun(client);
    const akunIkhtisar = petaAkun.get('3130')!;
    const akunModal = petaAkun.get('3110')!;

    const pendapatanBaris: Array<{ akunId: number; jumlah: number }> = [];
    let totalPendapatan = 0;
    const bebanBaris: Array<{ akunId: number; jumlah: number }> = [];
    let totalBeban = 0;
    let saldoPrive = 0;

    for (const r of saldoRes.rows) {
      const net = keUangBulat(r.net);
      if (net === 0) continue;
      if (r.tipe === 'pendapatan') {
        const jumlah = -net; // saldo normal kredit
        if (jumlah !== 0) {
          pendapatanBaris.push({ akunId: Number(r.akun_id), jumlah });
          totalPendapatan += jumlah;
        }
      } else if (r.tipe === 'beban') {
        const jumlah = net; // saldo normal debit
        if (jumlah !== 0) {
          bebanBaris.push({ akunId: Number(r.akun_id), jumlah });
          totalBeban += jumlah;
        }
      } else if (r.kode === '3120') {
        saldoPrive = net; // Prive saldo normal debit
      }
    }

    // 1. Tutup pendapatan
    if (totalPendapatan !== 0) {
      const baris: BarisJurnalInput[] = pendapatanBaris.map((p) => ({
        akunId: p.akunId,
        debit: p.jumlah > 0 ? p.jumlah : 0,
        kredit: p.jumlah < 0 ? -p.jumlah : 0,
      }));
      baris.push({
        akunId: akunIkhtisar.id,
        debit: totalPendapatan < 0 ? -totalPendapatan : 0,
        kredit: totalPendapatan > 0 ? totalPendapatan : 0,
      });
      await buatJurnalDiClient(client, {
        apotekId: pengguna.apotekId,
        tanggal: akhirBulan,
        jenis: 'penutup',
        keterangan: `Penutup pendapatan periode ${periode}`,
        dibuatOleh: pengguna.id,
        baris,
      });
    }

    // 2. Tutup beban
    if (totalBeban !== 0) {
      const baris: BarisJurnalInput[] = [
        {
          akunId: akunIkhtisar.id,
          debit: totalBeban > 0 ? totalBeban : 0,
          kredit: totalBeban < 0 ? -totalBeban : 0,
        },
        ...bebanBaris.map((b) => ({
          akunId: b.akunId,
          debit: b.jumlah < 0 ? -b.jumlah : 0,
          kredit: b.jumlah > 0 ? b.jumlah : 0,
        })),
      ];
      await buatJurnalDiClient(client, {
        apotekId: pengguna.apotekId,
        tanggal: akhirBulan,
        jenis: 'penutup',
        keterangan: `Penutup beban periode ${periode}`,
        dibuatOleh: pengguna.id,
        baris,
      });
    }

    // 3. Tutup ikhtisar ke modal
    const labaBersih = totalPendapatan - totalBeban;
    if (labaBersih !== 0) {
      const baris: BarisJurnalInput[] =
        labaBersih > 0
          ? [
              { akunId: akunIkhtisar.id, debit: labaBersih, kredit: 0 },
              { akunId: akunModal.id, debit: 0, kredit: labaBersih },
            ]
          : [
              { akunId: akunModal.id, debit: -labaBersih, kredit: 0 },
              { akunId: akunIkhtisar.id, debit: 0, kredit: -labaBersih },
            ];
      await buatJurnalDiClient(client, {
        apotekId: pengguna.apotekId,
        tanggal: akhirBulan,
        jenis: 'penutup',
        keterangan: `Penutup ikhtisar laba rugi periode ${periode}`,
        dibuatOleh: pengguna.id,
        baris,
      });
    }

    // 4. Tutup prive
    if (saldoPrive !== 0) {
      const akunPrive = petaAkun.get('3120')!;
      const baris: BarisJurnalInput[] =
        saldoPrive > 0
          ? [
              { akunId: akunModal.id, debit: saldoPrive, kredit: 0 },
              { akunId: akunPrive.id, debit: 0, kredit: saldoPrive },
            ]
          : [
              { akunId: akunPrive.id, debit: -saldoPrive, kredit: 0 },
              { akunId: akunModal.id, debit: 0, kredit: -saldoPrive },
            ];
      await buatJurnalDiClient(client, {
        apotekId: pengguna.apotekId,
        tanggal: akhirBulan,
        jenis: 'penutup',
        keterangan: `Penutup prive periode ${periode}`,
        dibuatOleh: pengguna.id,
        baris,
      });
    }

    const sekarang = Jam.sekarang();
    await client.query(
      `INSERT INTO periode_akuntansi (apotek_id, periode, status, ditutup_oleh, ditutup_pada)
       VALUES ($1, $2, 'ditutup', $3, $4)
       ON CONFLICT (apotek_id, periode)
       DO UPDATE SET status = 'ditutup', ditutup_oleh = $3, ditutup_pada = $4`,
      [pengguna.apotekId, periode, pengguna.id, sekarang.toISO()],
    );

    await catatAudit(client, {
      apotekId: pengguna.apotekId,
      penggunaId: pengguna.id,
      aksi: 'periode.tutup',
      entitas: 'periode_akuntansi',
      entitasId: periode,
      hasil: 'berhasil',
      detail: { laba_bersih: labaBersih },
    });

    return {
      periode,
      status: 'ditutup' as const,
      ditutup_pada: Jam.keIsoWib(sekarang),
    };
  });
}

function akhirBulanDariPeriode(periode: string): string {
  return DateTime.fromFormat(periode, 'yyyy-MM', { zone: ZONA_BISNIS })
    .endOf('month')
    .toFormat('yyyy-MM-dd');
}

export async function neracaSaldoLayanan(apotekId: number, periode: string) {
  const akhirBulan = akhirBulanDariPeriode(periode);

  return withApotek(apotekId, async (client) => {
    const pRes = await client.query<{ status: string }>(
      `SELECT status FROM periode_akuntansi WHERE periode = $1`,
      [periode],
    );
    const statusPeriode = pRes.rows[0]?.status ?? 'terbuka';

    const res = await client.query<{
      kode: string;
      nama: string;
      net: string;
    }>(
      `SELECT a.kode, a.nama, COALESCE(SUM(bj.debit) - SUM(bj.kredit), 0) AS net
       FROM akun a
       JOIN baris_jurnal bj ON bj.akun_id = a.id
       JOIN jurnal j ON j.id = bj.jurnal_id
       WHERE j.tanggal <= $1::date
         AND NOT (j.periode = $2 AND j.jenis = 'penutup')
       GROUP BY a.kode, a.nama
       ORDER BY a.kode ASC`,
      [akhirBulan, periode],
    );

    const baris: Array<{ akun_kode: string; akun_nama: string; debit: number; kredit: number }> = [];
    let totalDebit = 0;
    let totalKredit = 0;

    for (const r of res.rows) {
      const net = keUangBulat(r.net);
      if (net === 0) continue;
      if (net > 0) {
        baris.push({ akun_kode: r.kode, akun_nama: r.nama, debit: net, kredit: 0 });
        totalDebit += net;
      } else {
        baris.push({ akun_kode: r.kode, akun_nama: r.nama, debit: 0, kredit: -net });
        totalKredit += -net;
      }
    }

    return {
      periode,
      status_periode: statusPeriode,
      baris,
      total_debit: totalDebit,
      total_kredit: totalKredit,
    };
  });
}

export async function labaRugiLayanan(apotekId: number, periode: string) {
  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      kode: string;
      nama: string;
      tipe: string;
      saldo_normal: 'debit' | 'kredit';
      net: string;
    }>(
      `SELECT a.kode, a.nama, a.tipe, a.saldo_normal,
              COALESCE(SUM(bj.debit) - SUM(bj.kredit), 0) AS net
       FROM akun a
       JOIN baris_jurnal bj ON bj.akun_id = a.id
       JOIN jurnal j ON j.id = bj.jurnal_id
       WHERE j.periode = $1
         AND j.jenis <> 'penutup'
         AND a.tipe IN ('pendapatan', 'beban')
       GROUP BY a.kode, a.nama, a.tipe, a.saldo_normal
       ORDER BY a.kode ASC`,
      [periode],
    );

    const pendapatan: Array<{ akun_kode: string; akun_nama: string; jumlah: number }> = [];
    const beban: Array<{ akun_kode: string; akun_nama: string; jumlah: number }> = [];
    let totalPendapatan = 0;
    let totalBeban = 0;
    let jumlahHpp = 0;

    for (const r of res.rows) {
      const net = keUangBulat(r.net);
      const jumlah = r.saldo_normal === 'debit' ? net : -net;
      if (jumlah === 0) continue;

      if (r.tipe === 'pendapatan') {
        pendapatan.push({ akun_kode: r.kode, akun_nama: r.nama, jumlah });
        totalPendapatan += jumlah;
      } else {
        beban.push({ akun_kode: r.kode, akun_nama: r.nama, jumlah });
        totalBeban += jumlah;
        if (r.kode === '5110') jumlahHpp = jumlah;
      }
    }

    return {
      periode,
      pendapatan,
      total_pendapatan: totalPendapatan,
      beban,
      total_beban: totalBeban,
      laba_kotor: totalPendapatan - jumlahHpp,
      laba_bersih: totalPendapatan - totalBeban,
    };
  });
}

export async function neracaLayanan(apotekId: number, periode: string) {
  const akhirBulan = akhirBulanDariPeriode(periode);

  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      kode: string;
      nama: string;
      tipe: string;
      net: string;
    }>(
      `SELECT a.kode, a.nama, a.tipe,
              COALESCE(SUM(bj.debit) - SUM(bj.kredit), 0) AS net
       FROM akun a
       JOIN baris_jurnal bj ON bj.akun_id = a.id
       JOIN jurnal j ON j.id = bj.jurnal_id
       WHERE j.tanggal <= $1::date
       GROUP BY a.kode, a.nama, a.tipe
       ORDER BY a.kode ASC`,
      [akhirBulan],
    );

    const aset: Array<{ akun_kode: string | null; akun_nama: string; jumlah: number }> = [];
    const kewajiban: Array<{ akun_kode: string | null; akun_nama: string; jumlah: number }> = [];
    const ekuitas: Array<{ akun_kode: string | null; akun_nama: string; jumlah: number }> = [];

    let totalAset = 0;
    let totalKewajiban = 0;
    let totalEkuitas = 0;
    let labaBerjalan = 0;

    for (const r of res.rows) {
      const net = keUangBulat(r.net);
      if (r.tipe === 'pendapatan' || r.tipe === 'beban') {
        labaBerjalan += -net;
        continue;
      }
      if (net === 0) continue;

      if (r.tipe === 'aset') {
        aset.push({ akun_kode: r.kode, akun_nama: r.nama, jumlah: net });
        totalAset += net;
      } else if (r.tipe === 'kewajiban') {
        const jumlah = -net;
        kewajiban.push({ akun_kode: r.kode, akun_nama: r.nama, jumlah });
        totalKewajiban += jumlah;
      } else if (r.tipe === 'ekuitas') {
        const jumlah = -net;
        ekuitas.push({ akun_kode: r.kode, akun_nama: r.nama, jumlah });
        totalEkuitas += jumlah;
      }
    }

    if (labaBerjalan !== 0) {
      ekuitas.push({ akun_kode: null, akun_nama: 'Laba Berjalan', jumlah: labaBerjalan });
      totalEkuitas += labaBerjalan;
    }

    return {
      periode,
      aset,
      total_aset: totalAset,
      kewajiban,
      total_kewajiban: totalKewajiban,
      ekuitas,
      total_ekuitas: totalEkuitas,
      seimbang: totalAset === totalKewajiban + totalEkuitas,
    };
  });
}

export async function bukuBesarLayanan(
  apotekId: number,
  periode: string,
  akunKode: string,
) {
  const awalBulan = `${periode}-01`;

  return withApotek(apotekId, async (client) => {
    const akunRes = await client.query<{
      id: string;
      kode: string;
      nama: string;
      saldo_normal: 'debit' | 'kredit';
    }>(`SELECT id, kode, nama, saldo_normal FROM akun WHERE kode = $1`, [akunKode]);
    const akun = akunRes.rows[0];
    if (!akun) throw new GalatAplikasi('TIDAK_DITEMUKAN');

    const awalRes = await client.query<{ net: string }>(
      `SELECT COALESCE(SUM(bj.debit) - SUM(bj.kredit), 0) AS net
       FROM baris_jurnal bj
       JOIN jurnal j ON j.id = bj.jurnal_id
       WHERE bj.akun_id = $1 AND j.tanggal < $2::date`,
      [akun.id, awalBulan],
    );
    const netAwal = keUangBulat(awalRes.rows[0]?.net ?? 0);
    const saldoAwal = akun.saldo_normal === 'debit' ? netAwal : -netAwal;

    const mutasiRes = await client.query<{
      tanggal: Date | string;
      nomor_jurnal: string;
      keterangan: string;
      debit: string;
      kredit: string;
    }>(
      `SELECT j.tanggal, j.nomor AS nomor_jurnal, j.keterangan, bj.debit, bj.kredit
       FROM baris_jurnal bj
       JOIN jurnal j ON j.id = bj.jurnal_id
       WHERE bj.akun_id = $1 AND j.periode = $2
       ORDER BY j.tanggal ASC, j.id ASC, bj.id ASC`,
      [akun.id, periode],
    );

    let saldoBerjalan = saldoAwal;
    const baris = mutasiRes.rows.map((r) => {
      const debit = keUangBulat(r.debit);
      const kredit = keUangBulat(r.kredit);
      const perubahan = akun.saldo_normal === 'debit' ? debit - kredit : kredit - debit;
      saldoBerjalan += perubahan;
      return {
        tanggal: Jam.keTanggalWib(r.tanggal),
        nomor_jurnal: r.nomor_jurnal,
        keterangan: r.keterangan,
        debit,
        kredit,
        saldo: saldoBerjalan,
      };
    });

    return {
      periode,
      akun: { kode: akun.kode, nama: akun.nama, saldo_normal: akun.saldo_normal },
      saldo_awal: saldoAwal,
      baris,
      saldo_akhir: saldoBerjalan,
    };
  });
}
