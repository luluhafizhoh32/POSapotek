import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'drift_db.dart';
import 'galat.dart';
import 'klien_api.dart';
import 'sesi.dart';

abstract interface class PengirimTransaksiApi {
  Future<String> unggahLampiran(String pathBerkas, String jenis);
  Future<void> kirimTransaksi({
    required String jenis,
    required String kunciIdempoten,
    required Map<String, dynamic> payload,
  });
}

class PengirimTransaksiDio implements PengirimTransaksiApi {
  final KlienApi _klien;
  PengirimTransaksiDio(this._klien);

  @override
  Future<String> unggahLampiran(String pathBerkas, String jenis) async {
    final xfile = XFile(pathBerkas);
    final bytes = await xfile.readAsBytes();
    final form = FormData.fromMap({
      'jenis': jenis,
      'berkas': MultipartFile.fromBytes(bytes, filename: xfile.name.isNotEmpty ? xfile.name : 'lampiran.jpg'),
    });
    final res = await _klien.kirim(() => _klien.dio.post('/lampiran', data: form));
    return (res.data['data'] as Map<String, dynamic>)['id'] as String;
  }

  @override
  Future<void> kirimTransaksi({
    required String jenis,
    required String kunciIdempoten,
    required Map<String, dynamic> payload,
  }) async {
    final path = switch (jenis) {
      'penjualan' => '/penjualan',
      'penerimaan' => '/penerimaan',
      'opname' => '/opname',
      'pengajuan' => '/pengajuan-pengurangan',
      _ => throw ArgumentError('Jenis transaksi antrean tidak dikenal: $jenis'),
    };
    await _klien.kirim(
      () => _klien.dio.post(
        path,
        data: payload,
        options: Options(headers: {'Idempotency-Key': kunciIdempoten}),
      ),
    );
  }
}

/// Mesin status antrean offline (Bagian 10.4).
class PengelolaAntrean extends StateNotifier<List<ItemAntrean>> {
  final BasisDataLokal _db;
  final PengirimTransaksiApi _api;
  final int? Function() _getPenggunaId;
  bool _sedangMengirim = false;

  static const List<int> jadwalBackoffDetik = [30, 60, 120, 300];

  PengelolaAntrean({
    required BasisDataLokal db,
    required PengirimTransaksiApi api,
    required int? Function() getPenggunaId,
  })  : _db = db,
        _api = api,
        _getPenggunaId = getPenggunaId,
        super(const []);

  int hitungJedaDetik(int percobaan) {
    final idx = (percobaan - 1).clamp(0, jadwalBackoffDetik.length - 1);
    return jadwalBackoffDetik[idx];
  }

  Future<void> muat() async {
    final uid = _getPenggunaId();
    if (uid == null) {
      state = const [];
      return;
    }
    state = await _db.daftarAntrean(uid);
  }

  Future<void> masukkan({
    required String jenis,
    required String kunciIdempoten,
    required Map<String, dynamic> payload,
    String? lampiranPath,
    String? lampiranJenis,
  }) async {
    final uid = _getPenggunaId();
    if (uid == null) return;
    await _db.tambahAntrean(
      penggunaId: uid,
      jenis: jenis,
      kunciIdempoten: kunciIdempoten,
      payloadJson: jsonEncode(payload),
      lampiranPath: lampiranPath,
      lampiranJenis: lampiranJenis,
    );
    await muat();
  }

  Future<void> hapus(int id) async {
    await _db.hapusAntrean(id);
    await muat();
  }

  Future<void> cobaLagiItem(int id) async {
    await _db.tandaiStatusAntrean(id, status: 'tertunda', kodeGalat: null, pesanGalat: null);
    await muat();
    await prosesAntrean();
  }

  /// Memproses item `tertunda` satu per satu berurutan FIFO.
  Future<void> prosesAntrean() async {
    if (_sedangMengirim) return;
    final uid = _getPenggunaId();
    if (uid == null) return;

    _sedangMengirim = true;
    try {
      final daftar = await _db.daftarAntrean(uid);
      for (final item in daftar) {
        if (item.status != 'tertunda') continue;

        await _db.tandaiStatusAntrean(item.id, status: 'mengirim');
        await muat();

        try {
          final payload = jsonDecode(item.payloadJson) as Map<String, dynamic>;
          String? lampiranServerId = item.lampiranIdServer;

          if (item.lampiranPath != null &&
              item.lampiranJenis != null &&
              (lampiranServerId == null || lampiranServerId.isEmpty)) {
            lampiranServerId =
                await _api.unggahLampiran(item.lampiranPath!, item.lampiranJenis!);
            await _db.tandaiStatusAntrean(
              item.id,
              status: 'mengirim',
              lampiranIdServer: lampiranServerId,
            );
          }

          if (lampiranServerId != null && lampiranServerId.isNotEmpty) {
            payload['lampiran_id'] = lampiranServerId;
          }

          await _api.kirimTransaksi(
            jenis: item.jenis,
            kunciIdempoten: item.kunciIdempoten,
            payload: payload,
          );

          await _db.hapusAntrean(item.id);
          await muat();
        } on GalatApi catch (g) {
          if (g.adalahGalatJaringan) {
            await _db.tandaiStatusAntrean(
              item.id,
              status: 'tertunda',
              percobaan: item.percobaan + 1,
            );
            await muat();
            break; // Hentikan putaran saat offline
          }

          final statusHttp = g.statusHttp ?? 500;
          if (statusHttp == 401) {
            // Jeda sampai masuk lagi
            await _db.tandaiStatusAntrean(item.id, status: 'tertunda');
            await muat();
            break;
          }

          if (statusHttp >= 500) {
            final percobaanBaru = item.percobaan + 1;
            if (percobaanBaru >= 3) {
              await _db.tandaiStatusAntrean(
                item.id,
                status: 'gagal',
                kodeGalat: 'GALAT_INTERNAL',
                pesanGalat: 'Gagal menyimpan. Coba lagi.',
                percobaan: percobaanBaru,
              );
            } else {
              await _db.tandaiStatusAntrean(
                item.id,
                status: 'tertunda',
                percobaan: percobaanBaru,
              );
            }
            await muat();
            break;
          }

          // 4xx -> gagal tanpa ulang otomatis
          await _db.tandaiStatusAntrean(
            item.id,
            status: 'gagal',
            kodeGalat: g.kode,
            pesanGalat: g.pesan,
            percobaan: item.percobaan + 1,
          );
          await muat();
        }
      }
    } finally {
      _sedangMengirim = false;
    }
  }
}

final antreanProvider = StateNotifierProvider<PengelolaAntrean, List<ItemAntrean>>((ref) {
  final db = ref.watch(basisDataLokalProvider);
  final klien = ref.watch(klienApiProvider);
  return PengelolaAntrean(
    db: db,
    api: PengirimTransaksiDio(klien),
    getPenggunaId: () => ref.read(sesiProvider).pengguna?.id,
  );
});
