import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:pharmapos_mobile/inti/antrean.dart';
import 'package:pharmapos_mobile/inti/drift_db.dart';
import 'package:pharmapos_mobile/inti/format.dart';
import 'package:pharmapos_mobile/inti/galat.dart';
import 'package:pharmapos_mobile/inti/klien_api.dart';
import 'package:pharmapos_mobile/inti/printer.dart';
import 'package:pharmapos_mobile/inti/sesi.dart';

class _PenyimpanMemori implements PenyimpanAman {
  final Map<String, String> _data = {};
  @override
  Future<void> delete({required String key}) async => _data.remove(key);
  @override
  Future<String?> read({required String key}) async => _data[key];
  @override
  Future<void> write({required String key, required String value}) async =>
      _data[key] = value;
}

class _AdapterMock implements HttpClientAdapter {
  final Future<ResponseBody> Function(RequestOptions options) handler;
  _AdapterMock(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) =>
      handler(options);

  @override
  void close({bool force = false}) {}
}

class _ApiAntreanPalsu implements PengirimTransaksiApi {
  int jumlahUnggah = 0;
  final List<String> urutanKirim = [];
  Future<void> Function(
      String jenis, String kunci, Map<String, dynamic> payload)? onKirim;
  Future<String> Function()? onUnggah;

  @override
  Future<String> unggahLampiran(String pathBerkas, String jenis) async {
    jumlahUnggah++;
    if (onUnggah != null) return onUnggah!();
    return 'lampiran-uuid-1';
  }

  @override
  Future<void> kirimTransaksi({
    required String jenis,
    required String kunciIdempoten,
    required Map<String, dynamic> payload,
  }) async {
    urutanKirim.add(kunciIdempoten);
    if (onKirim != null) {
      await onKirim!(jenis, kunciIdempoten, payload);
    }
  }
}

void main() {
  setUpAll(() async {
    await initializeDateFormatting('id_ID', null);
  });

  test('Format rupiah dan tanggal/jam id_ID', () {
    expect(formatRupiah(12500), 'Rp12.500');
    expect(formatRupiah(-1000), '-Rp1.000');
    expect(formatRupiah(0), 'Rp0');
    expect(formatTanggal('2026-11-19T10:15:00+07:00'), '19 Nov 2026');
  });

  test('StrukFormatter: tepat <= 32 karakter per baris dan ASCII saja', () {
    final lines = StrukFormatter.susunStruk(
      const DataStruk(
        kepala: 'Apotek KADIN Bengkalis',
        nomor: 'PJ-202611-00001',
        waktu: '2026-11-19T10:15:00+07:00',
        kasir: 'Sari',
        baris: [
          (
            nama: 'Paracetamol 500 mg Strip Panjang Sekali',
            jumlah: 2,
            hargaSatuan: 10000,
            subtotal: 20000
          ),
        ],
        total: 20000,
        caraBayar: 'tunai',
        uangDiterima: 30000,
        kembalian: 10000,
        kaki: 'Terima kasih',
      ),
    );
    for (final l in lines) {
      expect(l.length <= 32, true, reason: 'Baris melebihi 32 karakter: "$l"');
      expect(RegExp(r'^[\x20-\x7E]*$').hasMatch(l), true);
    }

    final sementara = StrukFormatter.susunBuktiSementara(
      baris: [
        (nama: 'Paracetamol', jumlah: 1, hargaSatuan: 10000, subtotal: 10000)
      ],
      total: 10000,
    );
    expect(sementara.any((l) => l.contains('BUKTI SEMENTARA')), true);
    expect(sementara.any((l) => l.contains('BUKAN STRUK RESMI')), true);
  });

  test(
      'PengelolaAntrean: FIFO, upload lampiran sekali, 4xx gagal tanpa ulang, 5xx maks 3x, backoff',
      () async {
    final db = BasisDataLokal.memori();
    final api = _ApiAntreanPalsu();
    final pengelola =
        PengelolaAntrean(db: db, api: api, getPenggunaId: () => 1);

    expect(pengelola.hitungJedaDetik(1), 30);
    expect(pengelola.hitungJedaDetik(2), 60);
    expect(pengelola.hitungJedaDetik(3), 120);
    expect(pengelola.hitungJedaDetik(4), 300);

    // 1. Masukkan 2 item berurutan (FIFO) + 1 item berlampiran
    await pengelola.masukkan(
      jenis: 'penjualan',
      kunciIdempoten: 'k1',
      payload: {'total': 10000},
    );
    await pengelola.masukkan(
      jenis: 'penerimaan',
      kunciIdempoten: 'k2',
      payload: {'faktur': 'F1'},
      lampiranPath: '/tmp/f.jpg',
      lampiranJenis: 'faktur',
    );

    // Simulasikan k1 berhasil, k2 gagal jaringan setelah unggah lampiran berhasil
    api.onKirim = (jenis, kunci, payload) async {
      if (kunci == 'k2' &&
          api.urutanKirim.where((x) => x == 'k2').length == 1) {
        throw GalatApi.jaringan();
      }
    };
    await pengelola.prosesAntrean();
    expect(api.urutanKirim, ['k1', 'k2']);
    expect(api.jumlahUnggah, 1);
    expect(pengelola.state.length, 1);
    expect(pengelola.state.first.lampiranIdServer, 'lampiran-uuid-1');
    expect(pengelola.state.first.status, 'tertunda');

    // Proses lagi: lampiran TIDAK diunggah ulang, k2 terkirim & terhapus
    await pengelola.prosesAntrean();
    expect(api.jumlahUnggah, 1);
    expect(pengelola.state, isEmpty);

    // 2. Uji 4xx -> langsung status gagal tanpa ulang
    await pengelola
        .masukkan(jenis: 'penjualan', kunciIdempoten: 'k3', payload: {});
    api.onKirim = (_, __, ___) async {
      throw const GalatApi(
          kode: 'BARIS_DITOLAK', pesan: 'Stok kurang', statusHttp: 422);
    };
    await pengelola.prosesAntrean();
    expect(pengelola.state.first.status, 'gagal');
    expect(pengelola.state.first.kodeGalat, 'BARIS_DITOLAK');

    // 3. Uji 5xx -> ulang maks 3 kali lalu gagal GALAT_INTERNAL
    await pengelola.hapus(pengelola.state.first.id);
    await pengelola
        .masukkan(jenis: 'penjualan', kunciIdempoten: 'k4', payload: {});
    api.onKirim = (_, __, ___) async {
      throw const GalatApi(
          kode: 'GALAT_INTERNAL', pesan: 'Server galat', statusHttp: 500);
    };
    await pengelola.prosesAntrean();
    expect(pengelola.state.first.status, 'tertunda');
    await pengelola.prosesAntrean();
    expect(pengelola.state.first.status, 'tertunda');
    await pengelola.prosesAntrean();
    expect(pengelola.state.first.status, 'gagal');
    expect(pengelola.state.first.kodeGalat, 'GALAT_INTERNAL');

    await db.close();
  });

  test('KlienApi: single-flight refresh untuk banyak 401 bersamaan', () async {
    final sesi = SesiNotifier(_PenyimpanMemori());
    await sesi.simpanMasuk(
      tokenAkses: 'token-lama',
      tokenSegar: 'segar-lama',
      pengguna: const PenggunaSesi(
        id: 1,
        username: 'kasir1',
        namaLengkap: 'Kasir',
        peran: 'kasir',
        wajibGantiSandi: false,
        apotekId: 1,
        apotekKode: 'DEMO1',
        apotekNama: 'Demo',
      ),
    );

    final dio = Dio(BaseOptions(baseUrl: 'http://localhost/api/v1'));
    int jumlahRefresh = 0;

    dio.httpClientAdapter = _AdapterMock((options) async {
      if (options.path == '/auth/segarkan') {
        jumlahRefresh++;
        await Future<void>.delayed(const Duration(milliseconds: 30));
        return ResponseBody.fromString(
          jsonEncode({
            'data': {
              'token_akses': 'token-baru',
              'token_segar': 'segar-baru',
              'pengguna': sesi.saatIni.pengguna!.keJson(),
            },
          }),
          200,
          headers: {
            Headers.contentTypeHeader: ['application/json']
          },
        );
      }
      if (options.headers['Authorization'] == 'Bearer token-lama') {
        return ResponseBody.fromString(
          jsonEncode({
            'galat': {'kode': 'TOKEN_TIDAK_VALID'}
          }),
          401,
          headers: {
            Headers.contentTypeHeader: ['application/json']
          },
        );
      }
      return ResponseBody.fromString(
        jsonEncode({'data': 'ok'}),
        200,
        headers: {
          Headers.contentTypeHeader: ['application/json']
        },
      );
    });

    final klien = KlienApi(sesi: sesi, dioOverride: dio);
    final results = await Future.wait([
      klien.kirim(() => klien.dio.get('/barang')),
      klien.kirim(() => klien.dio.get('/pengaturan')),
      klien.kirim(() => klien.dio.get('/notifikasi')),
    ]);

    expect(results.length, 3);
    expect(jumlahRefresh, 1);
    expect(sesi.saatIni.tokenAkses, 'token-baru');
  });
}
