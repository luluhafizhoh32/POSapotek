import { getMigratorPool } from '../../src/db/pool.js';

export async function resetBasisDataUji(): Promise<void> {
  const pool = getMigratorPool();
  await pool.query(`
    TRUNCATE TABLE
      urutan_nomor,
      jejak_audit,
      laporan_bulanan,
      pemeriksaan_near_expired,
      notifikasi,
      mutasi_stok,
      baris_pengajuan,
      pengajuan_pengurangan,
      baris_opname,
      opname,
      baris_penerimaan,
      penerimaan_barang,
      pengambilan_batch,
      baris_penjualan,
      penjualan,
      pembayaran_nontunai,
      baris_jurnal,
      jurnal,
      periode_akuntansi,
      akun,
      lampiran,
      batch_barang,
      barang,
      pemasok,
      sesi_login,
      akses_pantau,
      pengguna,
      pengaturan_apotek,
      apotek
    RESTART IDENTITY CASCADE
  `);
}
