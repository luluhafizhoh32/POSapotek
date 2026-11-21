import 'dart:convert';
import 'dart:typed_data';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:dio/dio.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_localizations/flutter_localizations.dart' as fl;
import 'package:material_ui/material_ui.dart' as mui;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:pharmapos_mobile/app/router.dart';
import 'package:pharmapos_mobile/app/tema.dart';
import 'package:pharmapos_mobile/fitur/dev/layar_katalog_komponen.dart';
import 'package:pharmapos_mobile/fitur/penjualan/data/penjualan_repositori.dart';
import 'package:pharmapos_mobile/fitur/penjualan/tampilan/layar_penjualan.dart';
import 'package:pharmapos_mobile/inti/drift_db.dart';
import 'package:pharmapos_mobile/inti/galat.dart';
import 'package:pharmapos_mobile/inti/klien_api.dart';
import 'package:pharmapos_mobile/inti/printer.dart';
import 'package:pharmapos_mobile/inti/sesi.dart';

class _PenyimpanMemori implements PenyimpanAman {
  @override
  Future<void> delete({required String key}) async {}
  @override
  Future<String?> read({required String key}) async => null;
  @override
  Future<void> write({required String key, required String value}) async {}
}

class _AdapterKosong implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({
        'data': <String, dynamic>{},
        'meta': {'total': 0},
      }),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json']
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _RepoPenjualanPalsu implements PenjualanRepositori {
  bool offlineSaatSimpan = false;
  String statusPratinjau = 'ok';

  @override
  Future<List<ItemBarangPos>> cariBarang({String? q, String? barcode}) async =>
      [
        const ItemBarangPos(
          id: 10,
          kode: 'PCT500',
          nama: 'Paracetamol 500 mg',
          satuan: 'strip',
          hargaJual: 10000,
          stokTotal: 20,
        ),
      ];

  @override
  Future<void> segarkanCacheBarang() async {}

  @override
  Future<HasilPratinjau> pratinjau(
      List<({int barangId, int jumlah})> baris) async {
    return HasilPratinjau(
      perBarang: {
        for (final b in baris)
          b.barangId: BarisPratinjau(
            barangId: b.barangId,
            status: statusPratinjau,
            stokTersedia: 1,
            subtotal: 10000 * b.jumlah,
          ),
      },
      total: 10000 * baris.fold(0, (a, b) => a + b.jumlah),
      dapatDisimpan: statusPratinjau == 'ok',
    );
  }

  @override
  Future<HasilSimpanPenjualan> simpanPenjualan({
    required String kunciIdempoten,
    required Map<String, dynamic> payload,
  }) async {
    if (offlineSaatSimpan) {
      throw GalatApi.jaringan();
    }
    return const HasilSimpanPenjualan(
      id: 1,
      nomor: 'PJ-202611-00001',
      waktu: '2026-11-19T10:15:00+07:00',
      total: 10000,
      kembalian: 40000,
      caraBayar: 'tunai',
    );
  }

  @override
  Future<InfoPembayaranNontunai> buatPembayaranNontunai(
          String cara, int jumlah) =>
      throw UnimplementedError();
  @override
  Future<InfoPembayaranNontunai> cekPembayaranNontunai(String id) =>
      throw UnimplementedError();
  @override
  Future<InfoPembayaranNontunai> simulasiBayar(String id) =>
      throw UnimplementedError();
  @override
  Future<List<Map<String, dynamic>>> daftarRiwayat(
          {String? dari, String? sampai}) async =>
      [];
  @override
  Future<DataStruk> ambilStruk(int penjualanId) => throw UnimplementedError();
}

void main() {
  setUpAll(() async {
    await initializeDateFormatting('id_ID', null);
  });

  testWidgets('Alur penjualan tunai lengkap hingga layar berhasil',
      (tester) async {
    final repo = _RepoPenjualanPalsu();
    final db = BasisDataLokal.memori();
    final sesi = SesiNotifier(_PenyimpanMemori());
    await sesi.simpanMasuk(
      tokenAkses: 't',
      tokenSegar: 's',
      pengguna: const PenggunaSesi(
        id: 1,
        username: 'kasir1',
        namaLengkap: 'Sari',
        peran: 'kasir',
        wajibGantiSandi: false,
        apotekId: 1,
        apotekKode: 'DEMO1',
        apotekNama: 'Demo',
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          penjualanRepositoriProvider.overrideWithValue(repo),
          basisDataLokalProvider.overrideWithValue(db),
          sesiProvider.overrideWith((_) => sesi),
        ],
        child: MaterialApp(
          theme: bangunTemaPos(),
          localizationsDelegates: const [
            mui.GlobalMaterialLocalizations.delegate,
            fl.GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
            mui.DefaultMaterialLocalizations.delegate,
          ],
          home: const LayarPenjualan(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Ketuk barang Paracetamol 500 mg
    await tester.tap(find.text('Paracetamol 500 mg'));
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pumpAndSettle();

    // Ketuk Bayar
    await tester.tap(find.text('Bayar'));
    await tester.pumpAndSettle();

    // Pilih cepat Rp50.000 -> Kembalian Rp40.000
    await tester.tap(find.text('Rp50.000'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Kembalian: Rp40.000'), findsOneWidget);

    // Simpan Penjualan
    await tester.tap(find.text('Simpan Penjualan'));
    await tester.pumpAndSettle();

    expect(find.text('Penjualan berhasil disimpan.'), findsOneWidget);
    expect(find.text('Nomor: PJ-202611-00001'), findsOneWidget);

    await db.close();
  });

  testWidgets(
      'Jalur offline penjualan masuk ke antrean dan tampil pesan tertunda',
      (tester) async {
    final repo = _RepoPenjualanPalsu()..offlineSaatSimpan = true;
    final db = BasisDataLokal.memori();
    final sesi = SesiNotifier(_PenyimpanMemori());
    await sesi.simpanMasuk(
      tokenAkses: 't',
      tokenSegar: 's',
      pengguna: const PenggunaSesi(
        id: 1,
        username: 'kasir1',
        namaLengkap: 'Sari',
        peran: 'kasir',
        wajibGantiSandi: false,
        apotekId: 1,
        apotekKode: 'DEMO1',
        apotekNama: 'Demo',
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          penjualanRepositoriProvider.overrideWithValue(repo),
          basisDataLokalProvider.overrideWithValue(db),
          sesiProvider.overrideWith((_) => sesi),
        ],
        child: MaterialApp(
          theme: bangunTemaPos(),
          localizationsDelegates: const [
            mui.GlobalMaterialLocalizations.delegate,
            fl.GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
            mui.DefaultMaterialLocalizations.delegate,
          ],
          home: const LayarPenjualan(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Paracetamol 500 mg'));
    await tester.pump(const Duration(milliseconds: 350));
    await tester.tap(find.text('Bayar'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Uang pas'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Simpan Penjualan'));
    await tester.pumpAndSettle();

    expect(
        find.text('Transaksi tertunda. Akan dikirim otomatis saat tersambung.'),
        findsOneWidget);
    expect(find.text('Printer belum dipilih'), findsOneWidget);

    await db.close();
  });

  testWidgets('Navigasi per peran menampilkan tab yang benar', (tester) async {
    for (final entry in {
      'kasir': ['Penjualan', 'Riwayat', 'Antrean', 'Akun'],
      'staf_gudang': ['Penerimaan', 'Opname', 'Pengajuan', 'Lainnya'],
      'apa': ['Pengesahan', 'Near-expired', 'Laporan', 'Lainnya'],
      'pemilik': ['Beranda', 'Laporan', 'Keuangan', 'Lainnya'],
    }.entries) {
      final db = BasisDataLokal.memori();
      final sesi = SesiNotifier(_PenyimpanMemori());
      await sesi.simpanMasuk(
        tokenAkses: 't',
        tokenSegar: 's',
        pengguna: PenggunaSesi(
          id: 1,
          username: 'u',
          namaLengkap: 'User',
          peran: entry.key,
          wajibGantiSandi: false,
          apotekId: 1,
          apotekKode: 'DEMO1',
          apotekNama: 'Demo',
        ),
      );

      final dio = Dio(BaseOptions(baseUrl: 'http://localhost/api/v1'))
        ..httpClientAdapter = _AdapterKosong();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            basisDataLokalProvider.overrideWithValue(db),
            sesiProvider.overrideWith((_) => sesi),
            klienApiProvider
                .overrideWithValue(KlienApi(sesi: sesi, dioOverride: dio)),
            penjualanRepositoriProvider
                .overrideWithValue(_RepoPenjualanPalsu()),
          ],
          child: MaterialApp(
            theme: bangunTemaPos(),
            localizationsDelegates: const [
              mui.GlobalMaterialLocalizations.delegate,
              fl.GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
              mui.DefaultMaterialLocalizations.delegate,
            ],
            home: const CangkangUtama(),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      for (final tabLabel in entry.value) {
        expect(find.text(tabLabel), findsWidgets);
      }
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(milliseconds: 50));
      await db.close();
    }
  });

  testWidgets(
      'Responsif v2.1: Katalog komponen tampil bersih pada 360x800 dan 1440x900',
      (tester) async {
    for (final size in const [Size(360, 800), Size(1440, 900)]) {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          theme: bangunTemaPos(),
          home: const LayarKatalogKomponen(),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Katalog Komponen PharmaPOS v2.1'), findsOneWidget);
      expect(find.text('Penjualan hari ini'), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
  });
}
