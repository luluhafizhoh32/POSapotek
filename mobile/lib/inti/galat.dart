const Map<String, String> pesanGalatBawaan = {
  'VALIDASI_GAGAL': 'Data yang dikirim tidak valid.',
  'TIDAK_TERAUTENTIKASI': 'Silakan masuk terlebih dahulu.',
  'TOKEN_TIDAK_VALID': 'Sesi tidak valid atau sudah berakhir. Silakan masuk lagi.',
  'KREDENSIAL_SALAH': 'Username atau kata sandi salah.',
  'AKUN_NONAKTIF': 'Akun tidak aktif. Hubungi pemilik apotek.',
  'AKUN_TERKUNCI': 'Akun terkunci sementara karena terlalu banyak percobaan. Coba lagi nanti.',
  'WAJIB_GANTI_SANDI': 'Anda harus mengganti kata sandi terlebih dahulu.',
  'DILARANG': 'Anda tidak berhak melakukan tindakan ini.',
  'PENGESAH_SAMA_DENGAN_PENGAJU': 'Pengesah tidak boleh sama dengan pengaju.',
  'TIDAK_DITEMUKAN': 'Data tidak ditemukan.',
  'DUPLIKAT': 'Data sudah ada.',
  'KUNCI_IDEMPOTEN_BENTROK': 'Permintaan ini bertabrakan dengan permintaan sebelumnya.',
  'FAKTUR_SUDAH_ADA': 'Nomor faktur ini sudah pernah dicatat.',
  'BATCH_SUDAH_ADA': 'Nomor batch ini sudah ada untuk barang tersebut.',
  'PEMBAYARAN_SUDAH_DIPAKAI': 'Pembayaran ini sudah dipakai untuk penjualan lain.',
  'STATUS_TIDAK_VALID': 'Status pengajuan tidak memungkinkan tindakan ini.',
  'PERIODE_DITUTUP': 'Periode ini sudah ditutup.',
  'PERIODE_SUDAH_DITUTUP': 'Periode ini sudah ditutup sebelumnya.',
  'SALDO_AWAL_TIDAK_DAPAT': 'Saldo awal hanya bisa dibuat sebelum ada jurnal.',
  'BARIS_DITOLAK': 'Ada barang yang tidak bisa dijual. Periksa stok.',
  'UANG_KURANG': 'Uang yang diterima kurang dari total.',
  'PEMBAYARAN_BELUM_DIBAYAR': 'Pembayaran belum diterima.',
  'PEMBAYARAN_TIDAK_SESUAI': 'Pembayaran tidak sesuai dengan total atau cara bayar.',
  'PEMBAYARAN_KEDALUWARSA': 'Kode pembayaran sudah kedaluwarsa.',
  'TANGGAL_KEDALUWARSA_LEWAT': 'Tanggal kedaluwarsa sudah lewat.',
  'BATCH_BEDA_DATA': 'Batch sudah ada dengan tanggal kedaluwarsa atau harga beli berbeda.',
  'LAMPIRAN_WAJIB': 'Foto lampiran wajib diunggah.',
  'JUMLAH_MELEBIHI_STOK': 'Jumlah melebihi stok yang ada.',
  'ALASAN_TIDAK_SESUAI': 'Alasan tidak sesuai dengan kondisi batch.',
  'TIDAK_ADA_BATCH': 'Tidak ada batch berstok untuk dihitung.',
  'BATCH_BELUM_DIHITUNG': 'Masih ada batch yang belum dihitung.',
  'KETERANGAN_WAJIB': 'Keterangan wajib diisi.',
  'STOK_BERUBAH': 'Stok berubah sejak pengajuan dibuat.',
  'JURNAL_TIDAK_SEIMBANG': 'Total debit dan kredit tidak sama.',
  'AKUN_DILARANG': 'Akun ini tidak boleh dipakai untuk jenis jurnal tersebut.',
  'SALDO_AWAL_TIDAK_VALID': 'Saldo awal tidak valid (Modal tidak boleh negatif).',
  'PERIODE_BELUM_BERAKHIR': 'Periode belum berakhir.',
  'PERIODE_SEBELUMNYA_BELUM_DITUTUP': 'Tutup periode sebelumnya terlebih dahulu.',
  'TERLALU_BANYAK_PERMINTAAN': 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
  'GALAT_INTERNAL': 'Terjadi kesalahan pada server.',
};

class GalatApi implements Exception {
  final String kode;
  final String pesan;
  final int? statusHttp;
  final Map<String, dynamic> detail;
  final bool adalahGalatJaringan;

  const GalatApi({
    required this.kode,
    required this.pesan,
    this.statusHttp,
    this.detail = const {},
    this.adalahGalatJaringan = false,
  });

  factory GalatApi.jaringan() => const GalatApi(
        kode: 'JARINGAN',
        pesan: 'Tidak ada koneksi internet atau server tidak merespons.',
        adalahGalatJaringan: true,
      );

  factory GalatApi.dariRespon(int status, dynamic data) {
    if (data is Map && data['galat'] is Map) {
      final g = data['galat'] as Map;
      final kode = (g['kode'] ?? 'GALAT_INTERNAL').toString();
      final pesan = (g['pesan'] ?? pesanGalatBawaan[kode] ?? 'Terjadi kesalahan.').toString();
      final detail = g['detail'] is Map<String, dynamic>
          ? g['detail'] as Map<String, dynamic>
          : <String, dynamic>{};
      return GalatApi(kode: kode, pesan: pesan, statusHttp: status, detail: detail);
    }
    if (status >= 500) {
      return GalatApi(
        kode: 'GALAT_INTERNAL',
        pesan: 'Gagal menyimpan. Coba lagi.',
        statusHttp: status,
      );
    }
    return GalatApi(
      kode: 'GALAT_INTERNAL',
      pesan: 'Terjadi kesalahan pada server.',
      statusHttp: status,
    );
  }

  @override
  String toString() => pesan;
}
