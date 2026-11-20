import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'galat.dart';
import 'sesi.dart';

const String defaultApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000/api/v1',
);

const bool modeDev = bool.fromEnvironment('MODE_DEV', defaultValue: false);

class KlienApi {
  final Dio dio;
  final SesiNotifier sesi;
  Completer<bool>? _refreshCompleter;

  KlienApi({required this.sesi, String baseUrl = defaultApiBaseUrl, Dio? dioOverride})
      : dio = dioOverride ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl,
                connectTimeout: const Duration(seconds: 10),
                receiveTimeout: const Duration(seconds: 15),
                headers: {'Content-Type': 'application/json'},
              ),
            ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = sesi.saatIni.tokenAkses;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (err, handler) async {
          final status = err.response?.statusCode;
          final data = err.response?.data;
          final kode = (data is Map && data['galat'] is Map)
              ? data['galat']['kode']?.toString()
              : null;

          final sudahCobaUlang = err.requestOptions.extra['_sudah_segarkan'] == true;
          final adalahRuteSegarkan = err.requestOptions.path.contains('/auth/segarkan');

          if (status == 401 &&
              kode == 'TOKEN_TIDAK_VALID' &&
              !sudahCobaUlang &&
              !adalahRuteSegarkan) {
            final berhasil = await _segarkanSekali();
            if (berhasil) {
              final opts = err.requestOptions;
              opts.extra['_sudah_segarkan'] = true;
              opts.headers['Authorization'] = 'Bearer ${sesi.saatIni.tokenAkses}';
              try {
                final res = await dio.fetch(opts);
                return handler.resolve(res);
              } on DioException catch (e2) {
                return handler.next(e2);
              }
            } else {
              await sesi.hapusSesi();
            }
          }
          handler.next(err);
        },
      ),
    );
  }

  /// Single-flight token refresh: banyak 401 bersamaan hanya memicu 1 panggilan /auth/segarkan.
  Future<bool> _segarkanSekali() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    final completer = Completer<bool>();
    _refreshCompleter = completer;

    try {
      final tokenSegar = sesi.saatIni.tokenSegar;
      if (tokenSegar == null || tokenSegar.isEmpty) {
        completer.complete(false);
        return false;
      }

      final res = await dio.post(
        '/auth/segarkan',
        data: {'token_segar': tokenSegar},
        options: Options(headers: {'Authorization': null}),
      );
      final d = res.data['data'] as Map<String, dynamic>;
      await sesi.simpanMasuk(
        tokenAkses: d['token_akses'] as String,
        tokenSegar: d['token_segar'] as String,
        pengguna: PenggunaSesi.dariJson(d['pengguna'] as Map<String, dynamic>),
      );
      completer.complete(true);
      return true;
    } catch (_) {
      completer.complete(false);
      return false;
    } finally {
      _refreshCompleter = null;
    }
  }

  Future<Response<T>> kirim<T>(Future<Response<T>> Function() fn) async {
    try {
      return await fn();
    } on DioException catch (e) {
      if (e.response == null) {
        throw GalatApi.jaringan();
      }
      throw GalatApi.dariRespon(e.response!.statusCode ?? 500, e.response!.data);
    }
  }
}

final klienApiProvider = Provider<KlienApi>((ref) {
  final sesi = ref.read(sesiProvider.notifier);
  return KlienApi(sesi: sesi);
});
