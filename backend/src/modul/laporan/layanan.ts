import { DateTime } from 'luxon';
import { z } from 'zod';
import { withApotek } from '../../db/withApotek.js';
import type { KonteksPengguna } from '../../lib/authMiddleware.js';
import { GalatAplikasi } from '../../lib/galat.js';
import { Jam, ZONA_BISNIS } from '../../lib/jam.js';
import { keUangBulat } from '../../lib/uang.js';
import { skemaPeriode, skemaTanggal } from '../../lib/validasi.js';
import { verifikasiAksesPantau } from '../pantau/layanan.js';

export const skemaRentangTanggal = z.object({
  dari: skemaTanggal.optional(),
  sampai: skemaTanggal.optional(),
});

export const skemaOmzetQuery = skemaRentangTanggal.extend({
  kelompok: z.enum(['hari', 'bulan']).default('hari'),
});

export const skemaGolonganKhususQuery = z.object({
  periode: skemaPeriode,
  format: z.enum(['json', 'csv']).default('json'),
});

export const skemaApotekIdOpsional = z.object({
  apotek_id: z.coerce.number().int().positive().optional(),
});

function defaultRentang(hariMundur: number, dari?: string, sampai?: string) {
  const sekarang = Jam.sekarang();
  const s = sampai ?? sekarang.toFormat('yyyy-MM-dd');
  const d =
    dari ??
    DateTime.fromISO(s, { zone: ZONA_BISNIS })
      .minus({ days: hariMundur - 1 })
      .toFormat('yyyy-MM-dd');
  return { dari: d, sampai: s };
}

export async function laporanOmzetLayanan(
  apotekId: number,
  query: z.infer<typeof skemaOmzetQuery>,
) {
  const { dari, sampai } = defaultRentang(30, query.dari, query.sampai);
  const formatSql = query.kelompok === 'bulan' ? 'YYYY-MM' : 'YYYY-MM-DD';

  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      periode: string;
      jumlah_transaksi: string;
      omzet: string;
      hpp: string;
      tunai: string;
      qris: string;
      transfer: string;
    }>(
      `SELECT to_char(waktu AT TIME ZONE 'Asia/Jakarta', $1) AS periode,
              count(*) AS jumlah_transaksi,
              COALESCE(SUM(total), 0) AS omzet,
              COALESCE(SUM(total_hpp), 0) AS hpp,
              COALESCE(SUM(total) FILTER (WHERE cara_bayar = 'tunai'), 0) AS tunai,
              COALESCE(SUM(total) FILTER (WHERE cara_bayar = 'qris'), 0) AS qris,
              COALESCE(SUM(total) FILTER (WHERE cara_bayar = 'transfer'), 0) AS transfer
       FROM penjualan
       WHERE waktu >= $2 AND waktu <= $3
       GROUP BY 1
       ORDER BY 1 ASC`,
      [formatSql, `${dari}T00:00:00+07:00`, `${sampai}T23:59:59.999+07:00`],
    );

    const total = {
      jumlah_transaksi: 0,
      omzet: 0,
      hpp: 0,
      laba_kotor: 0,
      tunai: 0,
      qris: 0,
      transfer: 0,
    };

    const baris = res.rows.map((r) => {
      const omzet = keUangBulat(r.omzet);
      const hpp = keUangBulat(r.hpp);
      const labaKotor = omzet - hpp;
      const item = {
        periode: r.periode,
        jumlah_transaksi: Number(r.jumlah_transaksi),
        omzet,
        hpp,
        laba_kotor: labaKotor,
        tunai: keUangBulat(r.tunai),
        qris: keUangBulat(r.qris),
        transfer: keUangBulat(r.transfer),
      };
      total.jumlah_transaksi += item.jumlah_transaksi;
      total.omzet += item.omzet;
      total.hpp += item.hpp;
      total.laba_kotor += item.laba_kotor;
      total.tunai += item.tunai;
      total.qris += item.qris;
      total.transfer += item.transfer;
      return item;
    });

    return { dari, sampai, kelompok: query.kelompok, baris, total };
  });
}

export async function hitungMarginKategoriDiClient(
  client: import('pg').PoolClient,
  dari: string,
  sampai: string,
) {
  const res = await client.query<{
    kategori: 'generik' | 'paten';
    penjualan: string;
    hpp: string;
  }>(
    `SELECT b.kategori,
            COALESCE(SUM(bp.subtotal), 0) AS penjualan,
            COALESCE(SUM(pb_agg.hpp), 0) AS hpp
     FROM baris_penjualan bp
     JOIN penjualan p ON p.id = bp.penjualan_id
     JOIN barang b ON b.id = bp.barang_id
     LEFT JOIN (
       SELECT baris_penjualan_id, SUM(jumlah * harga_beli_satuan) AS hpp
       FROM pengambilan_batch
       GROUP BY baris_penjualan_id
     ) pb_agg ON pb_agg.baris_penjualan_id = bp.id
     WHERE p.waktu >= $1 AND p.waktu <= $2
     GROUP BY b.kategori`,
    [`${dari}T00:00:00+07:00`, `${sampai}T23:59:59.999+07:00`],
  );

  const peta = new Map(
    res.rows.map((r) => [
      r.kategori,
      { penjualan: keUangBulat(r.penjualan), hpp: keUangBulat(r.hpp) },
    ]),
  );

  const kategoriList: Array<'generik' | 'paten'> = ['generik', 'paten'];
  return kategoriList.map((kat) => {
    const val = peta.get(kat) ?? { penjualan: 0, hpp: 0 };
    const labaKotor = val.penjualan - val.hpp;
    const persenMargin =
      val.penjualan === 0
        ? 0
        : Math.round((labaKotor * 1000) / val.penjualan) / 10;
    return {
      kategori: kat,
      penjualan: val.penjualan,
      hpp: val.hpp,
      laba_kotor: labaKotor,
      persen_margin: persenMargin,
    };
  });
}

export async function laporanMarginKategoriLayanan(
  apotekId: number,
  query: z.infer<typeof skemaRentangTanggal>,
) {
  const { dari, sampai } = defaultRentang(30, query.dari, query.sampai);
  return withApotek(apotekId, (client) => hitungMarginKategoriDiClient(client, dari, sampai));
}

export async function hitungFastSlowDiClient(
  client: import('pg').PoolClient,
  dari: string,
  sampai: string,
  maksItem?: number,
) {
  const hariIni = Jam.hariIniWib();

  const res = await client.query<{
    barang_id: string;
    kode: string;
    nama: string;
    satuan: string;
    jumlah_terjual: string;
    stok_total: string;
  }>(
    `SELECT b.id AS barang_id, b.kode, b.nama, b.satuan,
            COALESCE(j.terjual, 0) AS jumlah_terjual,
            COALESCE(s.stok_total, 0) AS stok_total
     FROM barang b
     LEFT JOIN (
       SELECT bp.barang_id, SUM(bp.jumlah) AS terjual
       FROM baris_penjualan bp
       JOIN penjualan p ON p.id = bp.penjualan_id
       WHERE p.waktu >= $1 AND p.waktu <= $2
       GROUP BY bp.barang_id
     ) j ON j.barang_id = b.id
     LEFT JOIN (
       SELECT barang_id, SUM(stok) AS stok_total
       FROM batch_barang
       WHERE tanggal_kedaluwarsa >= $3::date
       GROUP BY barang_id
     ) s ON s.barang_id = b.id
     WHERE b.aktif = true
     ORDER BY COALESCE(j.terjual, 0) DESC, b.kode ASC`,
    [`${dari}T00:00:00+07:00`, `${sampai}T23:59:59.999+07:00`, hariIni],
  );

  const semua = res.rows.map((r) => ({
    barang_id: Number(r.barang_id),
    kode: r.kode,
    nama: r.nama,
    satuan: r.satuan,
    jumlah_terjual: Number(r.jumlah_terjual),
    stok_total: Number(r.stok_total),
  }));

  const n = semua.length;
  const k = Math.ceil(n * 0.2);

  const fast = semua.slice(0, k).filter((x) => x.jumlah_terjual > 0);
  const fastIds = new Set(fast.map((x) => x.barang_id));

  const slowKandidat = semua.slice(Math.max(0, n - k)).filter((x) => !fastIds.has(x.barang_id));
  const jumlahSedang = n - fast.length - slowKandidat.length;

  return {
    dari,
    sampai,
    fast: maksItem ? fast.slice(0, maksItem) : fast,
    slow: maksItem ? slowKandidat.slice(0, maksItem) : slowKandidat,
    jumlah_sedang: jumlahSedang,
  };
}

export async function laporanFastSlowLayanan(
  apotekId: number,
  query: z.infer<typeof skemaRentangTanggal>,
) {
  const { dari, sampai } = defaultRentang(90, query.dari, query.sampai);
  return withApotek(apotekId, (client) => hitungFastSlowDiClient(client, dari, sampai));
}

export async function hitungDefektaDiClient(client: import('pg').PoolClient) {
  const hariIni = Jam.hariIniWib();
  const res = await client.query<{
    barang_id: string;
    kode: string;
    nama: string;
    satuan: string;
    stok_total: string;
    stok_minimum: number;
    pemasok_id: string | null;
    pemasok_nama: string | null;
  }>(
    `SELECT b.id AS barang_id, b.kode, b.nama, b.satuan,
            COALESCE(s.stok_total, 0) AS stok_total,
            b.stok_minimum,
            pm.id AS pemasok_id, pm.nama AS pemasok_nama
     FROM barang b
     LEFT JOIN pemasok pm ON pm.id = b.pemasok_utama_id
     LEFT JOIN (
       SELECT barang_id, SUM(stok) AS stok_total
       FROM batch_barang
       WHERE tanggal_kedaluwarsa >= $1::date
       GROUP BY barang_id
     ) s ON s.barang_id = b.id
     WHERE b.aktif = true
       AND b.stok_minimum > 0
       AND COALESCE(s.stok_total, 0) <= b.stok_minimum
     ORDER BY (b.stok_minimum - COALESCE(s.stok_total, 0)) DESC, b.nama ASC`,
    [hariIni],
  );

  return res.rows.map((r) => {
    const stokTotal = Number(r.stok_total);
    return {
      barang_id: Number(r.barang_id),
      kode: r.kode,
      nama: r.nama,
      satuan: r.satuan,
      stok_total: stokTotal,
      stok_minimum: r.stok_minimum,
      jumlah_kurang: r.stok_minimum - stokTotal,
      pemasok_utama: r.pemasok_id ? { id: Number(r.pemasok_id), nama: r.pemasok_nama! } : null,
    };
  });
}

export async function laporanDefektaLayanan(apotekId: number) {
  return withApotek(apotekId, (client) => hitungDefektaDiClient(client));
}

export async function laporanGolonganKhususLayanan(
  apotekId: number,
  periode: string,
) {
  const awalBulan = `${periode}-01T00:00:00+07:00`;
  const akhirBulan =
    DateTime.fromFormat(periode, 'yyyy-MM', { zone: ZONA_BISNIS })
      .endOf('month')
      .toFormat('yyyy-MM-dd') + 'T23:59:59.999+07:00';

  return withApotek(apotekId, async (client) => {
    const res = await client.query<{
      kode: string;
      nama: string;
      golongan: string;
      satuan: string;
      stok_awal: string;
      masuk: string;
      keluar_penjualan: string;
      keluar_pengurangan: string;
    }>(
      `SELECT b.kode, b.nama, b.golongan, b.satuan,
              COALESCE(SUM(ms.jumlah) FILTER (WHERE ms.waktu < $1::timestamptz), 0) AS stok_awal,
              COALESCE(SUM(ms.jumlah) FILTER (WHERE ms.waktu >= $1::timestamptz AND ms.waktu <= $2::timestamptz AND ms.jenis IN ('penerimaan', 'saldo_awal')), 0) AS masuk,
              COALESCE(-SUM(ms.jumlah) FILTER (WHERE ms.waktu >= $1::timestamptz AND ms.waktu <= $2::timestamptz AND ms.jenis = 'penjualan'), 0) AS keluar_penjualan,
              COALESCE(-SUM(ms.jumlah) FILTER (WHERE ms.waktu >= $1::timestamptz AND ms.waktu <= $2::timestamptz AND ms.jenis = 'pengurangan'), 0) AS keluar_pengurangan
       FROM barang b
       LEFT JOIN mutasi_stok ms ON ms.barang_id = b.id
       WHERE b.golongan IN ('narkotika', 'psikotropika', 'prekursor')
       GROUP BY b.id, b.kode, b.nama, b.golongan, b.satuan
       ORDER BY b.kode ASC`,
      [awalBulan, akhirBulan],
    );

    const baris = res.rows
      .map((r) => {
        const stokAwal = Number(r.stok_awal);
        const masuk = Number(r.masuk);
        const keluarPenjualan = Number(r.keluar_penjualan);
        const keluarPengurangan = Number(r.keluar_pengurangan);
        const stokAkhir = stokAwal + masuk - keluarPenjualan - keluarPengurangan;
        return {
          kode: r.kode,
          nama: r.nama,
          golongan: r.golongan,
          satuan: r.satuan,
          stok_awal: stokAwal,
          masuk,
          keluar_penjualan: keluarPenjualan,
          keluar_pengurangan: keluarPengurangan,
          stok_akhir: stokAkhir,
        };
      })
      .filter(
        (x) =>
          x.stok_awal !== 0 ||
          x.masuk !== 0 ||
          x.keluar_penjualan !== 0 ||
          x.keluar_pengurangan !== 0 ||
          x.stok_akhir !== 0,
      );

    return {
      periode,
      catatan: 'Bukan format resmi Dinkes/BPOM',
      baris,
    };
  });
}

export function formatCsvGolonganKhusus(
  baris: Array<{
    kode: string;
    nama: string;
    golongan: string;
    satuan: string;
    stok_awal: number;
    masuk: number;
    keluar_penjualan: number;
    keluar_pengurangan: number;
    stok_akhir: number;
  }>,
): string {
  const escapeCsv = (val: string | number) => {
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header =
    'kode,nama,golongan,satuan,stok_awal,masuk,keluar_penjualan,keluar_pengurangan,stok_akhir';
  const lines = baris.map((b) =>
    [
      b.kode,
      b.nama,
      b.golongan,
      b.satuan,
      b.stok_awal,
      b.masuk,
      b.keluar_penjualan,
      b.keluar_pengurangan,
      b.stok_akhir,
    ]
      .map(escapeCsv)
      .join(','),
  );

  return '\uFEFF' + [header, ...lines].join('\r\n');
}

export async function daftarLaporanBulananLayanan(
  pengguna: KonteksPengguna,
  apotekIdParam?: number,
) {
  const targetApotekId = apotekIdParam ?? pengguna.apotekId;
  await verifikasiAksesPantau(pengguna, targetApotekId);

  return withApotek(targetApotekId, async (client) => {
    const res = await client.query<{
      periode: string;
      status: string;
      diterbitkan_pada: Date | null;
    }>(
      `SELECT periode, status, diterbitkan_pada
       FROM laporan_bulanan
       ORDER BY periode DESC`,
    );
    return res.rows.map((r) => ({
      periode: r.periode,
      status: r.status,
      diterbitkan_pada: r.diterbitkan_pada ? Jam.keIsoWib(r.diterbitkan_pada) : null,
    }));
  });
}

export async function ambilLaporanBulananLayanan(
  pengguna: KonteksPengguna,
  periode: string,
  apotekIdParam?: number,
) {
  const targetApotekId = apotekIdParam ?? pengguna.apotekId;
  await verifikasiAksesPantau(pengguna, targetApotekId);

  return withApotek(targetApotekId, async (client) => {
    const res = await client.query<{
      periode: string;
      status: string;
      diterbitkan_pada: Date | null;
      isi: unknown;
    }>(
      `SELECT periode, status, diterbitkan_pada, isi
       FROM laporan_bulanan
       WHERE periode = $1`,
      [periode],
    );
    const r = res.rows[0];
    if (!r) throw new GalatAplikasi('TIDAK_DITEMUKAN');

    return {
      periode: r.periode,
      status: r.status,
      diterbitkan_pada: r.diterbitkan_pada ? Jam.keIsoWib(r.diterbitkan_pada) : null,
      isi: r.isi,
    };
  });
}
