export type KodeGalat =
  | 'VALIDASI_GAGAL'
  | 'TIDAK_TERAUTENTIKASI'
  | 'TOKEN_TIDAK_VALID'
  | 'KREDENSIAL_SALAH'
  | 'AKUN_NONAKTIF'
  | 'AKUN_TERKUNCI'
  | 'WAJIB_GANTI_SANDI'
  | 'DILARANG'
  | 'PENGESAH_SAMA_DENGAN_PENGAJU'
  | 'TIDAK_DITEMUKAN'
  | 'DUPLIKAT'
  | 'KUNCI_IDEMPOTEN_BENTROK'
  | 'FAKTUR_SUDAH_ADA'
  | 'BATCH_SUDAH_ADA'
  | 'PEMBAYARAN_SUDAH_DIPAKAI'
  | 'STATUS_TIDAK_VALID'
  | 'PERIODE_DITUTUP'
  | 'PERIODE_SUDAH_DITUTUP'
  | 'SALDO_AWAL_TIDAK_DAPAT'
  | 'BARIS_DITOLAK'
  | 'UANG_KURANG'
  | 'PEMBAYARAN_BELUM_DIBAYAR'
  | 'PEMBAYARAN_TIDAK_SESUAI'
  | 'PEMBAYARAN_KEDALUWARSA'
  | 'TANGGAL_KEDALUWARSA_LEWAT'
  | 'BATCH_BEDA_DATA'
  | 'LAMPIRAN_WAJIB'
  | 'JUMLAH_MELEBIHI_STOK'
  | 'ALASAN_TIDAK_SESUAI'
  | 'TIDAK_ADA_BATCH'
  | 'BATCH_BELUM_DIHITUNG'
  | 'KETERANGAN_WAJIB'
  | 'STOK_BERUBAH'
  | 'JURNAL_TIDAK_SEIMBANG'
  | 'AKUN_DILARANG'
  | 'SALDO_AWAL_TIDAK_VALID'
  | 'PERIODE_BELUM_BERAKHIR'
  | 'PERIODE_SEBELUMNYA_BELUM_DITUTUP'
  | 'TERLALU_BANYAK_PERMINTAAN'
  | 'GALAT_INTERNAL';

export const PETA_GALAT: Record<KodeGalat, { status: number; pesan: string }> = {
  VALIDASI_GAGAL: { status: 400, pesan: 'Data yang dikirim tidak valid.' },
  TIDAK_TERAUTENTIKASI: { status: 401, pesan: 'Silakan masuk terlebih dahulu.' },
  TOKEN_TIDAK_VALID: { status: 401, pesan: 'Sesi tidak valid atau sudah berakhir. Silakan masuk lagi.' },
  KREDENSIAL_SALAH: { status: 401, pesan: 'Username atau kata sandi salah.' },
  AKUN_NONAKTIF: { status: 401, pesan: 'Akun tidak aktif. Hubungi pemilik apotek.' },
  AKUN_TERKUNCI: { status: 423, pesan: 'Akun terkunci sementara karena terlalu banyak percobaan. Coba lagi nanti.' },
  WAJIB_GANTI_SANDI: { status: 403, pesan: 'Anda harus mengganti kata sandi terlebih dahulu.' },
  DILARANG: { status: 403, pesan: 'Anda tidak berhak melakukan tindakan ini.' },
  PENGESAH_SAMA_DENGAN_PENGAJU: { status: 403, pesan: 'Pengesah tidak boleh sama dengan pengaju.' },
  TIDAK_DITEMUKAN: { status: 404, pesan: 'Data tidak ditemukan.' },
  DUPLIKAT: { status: 409, pesan: 'Data sudah ada.' },
  KUNCI_IDEMPOTEN_BENTROK: { status: 409, pesan: 'Permintaan ini bertabrakan dengan permintaan sebelumnya.' },
  FAKTUR_SUDAH_ADA: { status: 409, pesan: 'Nomor faktur ini sudah pernah dicatat.' },
  BATCH_SUDAH_ADA: { status: 409, pesan: 'Nomor batch ini sudah ada untuk barang tersebut.' },
  PEMBAYARAN_SUDAH_DIPAKAI: { status: 409, pesan: 'Pembayaran ini sudah dipakai untuk penjualan lain.' },
  STATUS_TIDAK_VALID: { status: 409, pesan: 'Status pengajuan tidak memungkinkan tindakan ini.' },
  PERIODE_DITUTUP: { status: 409, pesan: 'Periode ini sudah ditutup.' },
  PERIODE_SUDAH_DITUTUP: { status: 409, pesan: 'Periode ini sudah ditutup sebelumnya.' },
  SALDO_AWAL_TIDAK_DAPAT: { status: 409, pesan: 'Saldo awal hanya bisa dibuat sebelum ada jurnal.' },
  BARIS_DITOLAK: { status: 422, pesan: 'Ada barang yang tidak bisa dijual. Periksa stok.' },
  UANG_KURANG: { status: 422, pesan: 'Uang yang diterima kurang dari total.' },
  PEMBAYARAN_BELUM_DIBAYAR: { status: 422, pesan: 'Pembayaran belum diterima.' },
  PEMBAYARAN_TIDAK_SESUAI: { status: 422, pesan: 'Pembayaran tidak sesuai dengan total atau cara bayar.' },
  PEMBAYARAN_KEDALUWARSA: { status: 422, pesan: 'Kode pembayaran sudah kedaluwarsa.' },
  TANGGAL_KEDALUWARSA_LEWAT: { status: 422, pesan: 'Tanggal kedaluwarsa sudah lewat.' },
  BATCH_BEDA_DATA: { status: 422, pesan: 'Batch sudah ada dengan tanggal kedaluwarsa atau harga beli berbeda.' },
  LAMPIRAN_WAJIB: { status: 422, pesan: 'Foto lampiran wajib diunggah.' },
  JUMLAH_MELEBIHI_STOK: { status: 422, pesan: 'Jumlah melebihi stok yang ada.' },
  ALASAN_TIDAK_SESUAI: { status: 422, pesan: 'Alasan tidak sesuai dengan kondisi batch.' },
  TIDAK_ADA_BATCH: { status: 422, pesan: 'Tidak ada batch berstok untuk dihitung.' },
  BATCH_BELUM_DIHITUNG: { status: 422, pesan: 'Masih ada batch yang belum dihitung.' },
  KETERANGAN_WAJIB: { status: 422, pesan: 'Keterangan wajib diisi.' },
  STOK_BERUBAH: { status: 422, pesan: 'Stok berubah sejak pengajuan dibuat.' },
  JURNAL_TIDAK_SEIMBANG: { status: 422, pesan: 'Total debit dan kredit tidak sama.' },
  AKUN_DILARANG: { status: 422, pesan: 'Akun ini tidak boleh dipakai untuk jenis jurnal tersebut.' },
  SALDO_AWAL_TIDAK_VALID: { status: 422, pesan: 'Saldo awal tidak valid (Modal tidak boleh negatif).' },
  PERIODE_BELUM_BERAKHIR: { status: 422, pesan: 'Periode belum berakhir.' },
  PERIODE_SEBELUMNYA_BELUM_DITUTUP: { status: 422, pesan: 'Tutup periode sebelumnya terlebih dahulu.' },
  TERLALU_BANYAK_PERMINTAAN: { status: 429, pesan: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' },
  GALAT_INTERNAL: { status: 500, pesan: 'Terjadi kesalahan pada server.' },
};

export class GalatAplikasi extends Error {
  public readonly kode: KodeGalat;
  public readonly status: number;
  public readonly detail: Record<string, unknown>;

  constructor(
    kode: KodeGalat,
    detail: Record<string, unknown> = {},
    pesanKustom?: string,
  ) {
    const info = PETA_GALAT[kode];
    super(pesanKustom ?? info.pesan);
    this.name = 'GalatAplikasi';
    this.kode = kode;
    this.status = info.status;
    this.detail = detail;
  }

  keJson(): { galat: { kode: KodeGalat; pesan: string; detail: Record<string, unknown> } } {
    return {
      galat: {
        kode: this.kode,
        pesan: this.message,
        detail: this.detail,
      },
    };
  }
}
