import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'drift_db_web.dart' if (dart.library.io) 'drift_db_native.dart' as impl;

class ItemAntrean {
  final int id;
  final int penggunaId;
  final String jenis;
  final String kunciIdempoten;
  final String payloadJson;
  final String? lampiranPath;
  final String? lampiranJenis;
  final String? lampiranIdServer;
  final String status;
  final String? kodeGalat;
  final String? pesanGalat;
  final int percobaan;
  final String dibuatPada;

  const ItemAntrean({
    required this.id,
    required this.penggunaId,
    required this.jenis,
    required this.kunciIdempoten,
    required this.payloadJson,
    this.lampiranPath,
    this.lampiranJenis,
    this.lampiranIdServer,
    required this.status,
    this.kodeGalat,
    this.pesanGalat,
    required this.percobaan,
    required this.dibuatPada,
  });
}

class BarangCache {
  final int id;
  final String kode;
  final String? barcode;
  final String nama;
  final String kategori;
  final String golongan;
  final String satuan;
  final int hargaJual;
  final int stokMinimum;
  final int stokTotal;

  const BarangCache({
    required this.id,
    required this.kode,
    this.barcode,
    required this.nama,
    required this.kategori,
    required this.golongan,
    required this.satuan,
    required this.hargaJual,
    required this.stokMinimum,
    required this.stokTotal,
  });
}

abstract interface class BasisDataLokal {
  factory BasisDataLokal.bukaBerkas() => impl.buatBasisDataBerkas();
  factory BasisDataLokal.memori() => impl.buatBasisDataMemori();

  Future<int> tambahAntrean({
    required int penggunaId,
    required String jenis,
    required String kunciIdempoten,
    required String payloadJson,
    String? lampiranPath,
    String? lampiranJenis,
  });
  Future<List<ItemAntrean>> daftarAntrean(int penggunaId);
  Future<int> hitungAntreanAktif(int penggunaId);
  Future<void> tandaiStatusAntrean(
    int id, {
    required String status,
    String? kodeGalat,
    String? pesanGalat,
    int? percobaan,
    String? lampiranIdServer,
  });
  Future<void> hapusAntrean(int id);
  Future<void> hapusSemuaAntreanPengguna(int penggunaId);
  Future<void> simpanCacheBarang(List<Map<String, dynamic>> items);
  Future<List<BarangCache>> cariCacheBarang(String q);
  Future<void> close();
}

final basisDataLokalProvider = Provider<BasisDataLokal>((ref) {
  final db = BasisDataLokal.bukaBerkas();
  ref.onDispose(() => db.close());
  return db;
});
