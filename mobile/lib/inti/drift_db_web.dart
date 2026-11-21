import 'drift_db.dart';

class _BasisDataWeb implements BasisDataLokal {
  final List<ItemAntrean> _antrean = [];
  final List<BarangCache> _barang = [];
  int _nextId = 1;

  @override
  Future<int> tambahAntrean({
    required int penggunaId,
    required String jenis,
    required String kunciIdempoten,
    required String payloadJson,
    String? lampiranPath,
    String? lampiranJenis,
  }) async {
    final id = _nextId++;
    _antrean.add(
      ItemAntrean(
        id: id,
        penggunaId: penggunaId,
        jenis: jenis,
        kunciIdempoten: kunciIdempoten,
        payloadJson: payloadJson,
        lampiranPath: lampiranPath,
        lampiranJenis: lampiranJenis,
        status: 'tertunda',
        percobaan: 0,
        dibuatPada: DateTime.now().toIso8601String(),
      ),
    );
    return id;
  }

  @override
  Future<List<ItemAntrean>> daftarAntrean(int penggunaId) async {
    return _antrean.where((e) => e.penggunaId == penggunaId).toList();
  }

  @override
  Future<int> hitungAntreanAktif(int penggunaId) async {
    return _antrean
        .where((e) => e.penggunaId == penggunaId && (e.status == 'tertunda' || e.status == 'gagal'))
        .length;
  }

  @override
  Future<void> tandaiStatusAntrean(
    int id, {
    required String status,
    String? kodeGalat,
    String? pesanGalat,
    int? percobaan,
    String? lampiranIdServer,
  }) async {
    final idx = _antrean.indexWhere((e) => e.id == id);
    if (idx < 0) return;
    final old = _antrean[idx];
    _antrean[idx] = ItemAntrean(
      id: old.id,
      penggunaId: old.penggunaId,
      jenis: old.jenis,
      kunciIdempoten: old.kunciIdempoten,
      payloadJson: old.payloadJson,
      lampiranPath: old.lampiranPath,
      lampiranJenis: old.lampiranJenis,
      lampiranIdServer: lampiranIdServer ?? old.lampiranIdServer,
      status: status,
      kodeGalat: kodeGalat,
      pesanGalat: pesanGalat,
      percobaan: percobaan ?? old.percobaan,
      dibuatPada: old.dibuatPada,
    );
  }

  @override
  Future<void> hapusAntrean(int id) async {
    _antrean.removeWhere((e) => e.id == id);
  }

  @override
  Future<void> hapusSemuaAntreanPengguna(int penggunaId) async {
    _antrean.removeWhere((e) => e.penggunaId == penggunaId);
  }

  @override
  Future<void> simpanCacheBarang(List<Map<String, dynamic>> items) async {
    _barang
      ..clear()
      ..addAll(items.map((b) => BarangCache(
            id: (b['id'] as num).toInt(),
            kode: b['kode'] as String,
            barcode: b['barcode'] as String?,
            nama: b['nama'] as String,
            kategori: b['kategori'] as String,
            golongan: b['golongan'] as String,
            satuan: b['satuan'] as String,
            hargaJual: (b['harga_jual'] as num).toInt(),
            stokMinimum: (b['stok_minimum'] as num).toInt(),
            stokTotal: (b['stok_total'] as num).toInt(),
          )));
  }

  @override
  Future<List<BarangCache>> cariCacheBarang(String q) async {
    final term = q.trim().toLowerCase();
    return _barang
        .where((b) =>
            b.nama.toLowerCase().contains(term) ||
            b.kode.toLowerCase().contains(term) ||
            (b.barcode?.toLowerCase().contains(term) ?? false))
        .take(50)
        .toList();
  }

  @override
  Future<void> close() async {}
}

BasisDataLokal buatBasisDataBerkas() => _BasisDataWeb();
BasisDataLokal buatBasisDataMemori() => _BasisDataWeb();
