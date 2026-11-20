import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class PenggunaSesi {
  final int id;
  final String username;
  final String namaLengkap;
  final String peran;
  final bool wajibGantiSandi;
  final int apotekId;
  final String apotekKode;
  final String apotekNama;

  const PenggunaSesi({
    required this.id,
    required this.username,
    required this.namaLengkap,
    required this.peran,
    required this.wajibGantiSandi,
    required this.apotekId,
    required this.apotekKode,
    required this.apotekNama,
  });

  factory PenggunaSesi.dariJson(Map<String, dynamic> json) {
    final apotek = json['apotek'] as Map<String, dynamic>;
    return PenggunaSesi(
      id: (json['id'] as num).toInt(),
      username: json['username'] as String,
      namaLengkap: json['nama_lengkap'] as String,
      peran: json['peran'] as String,
      wajibGantiSandi: json['wajib_ganti_sandi'] as bool,
      apotekId: (apotek['id'] as num).toInt(),
      apotekKode: apotek['kode'] as String,
      apotekNama: apotek['nama'] as String,
    );
  }

  Map<String, dynamic> keJson() => {
        'id': id,
        'username': username,
        'nama_lengkap': namaLengkap,
        'peran': peran,
        'wajib_ganti_sandi': wajibGantiSandi,
        'apotek': {
          'id': apotekId,
          'kode': apotekKode,
          'nama': apotekNama,
        },
      };

  PenggunaSesi copyWith({bool? wajibGantiSandi}) => PenggunaSesi(
        id: id,
        username: username,
        namaLengkap: namaLengkap,
        peran: peran,
        wajibGantiSandi: wajibGantiSandi ?? this.wajibGantiSandi,
        apotekId: apotekId,
        apotekKode: apotekKode,
        apotekNama: apotekNama,
      );

  String get labelPeran => switch (peran) {
        'kasir' => 'Kasir',
        'staf_gudang' => 'Staf Gudang',
        'apa' => 'Apoteker',
        'pemilik' => 'Pemilik',
        _ => peran,
      };
}

abstract interface class PenyimpanAman {
  Future<String?> read({required String key});
  Future<void> write({required String key, required String value});
  Future<void> delete({required String key});
}

class PenyimpanFlutterSecure implements PenyimpanAman {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  @override
  Future<String?> read({required String key}) => _storage.read(key: key);

  @override
  Future<void> write({required String key, required String value}) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete({required String key}) => _storage.delete(key: key);
}

class SesiState {
  final bool sudahMuat;
  final PenggunaSesi? pengguna;
  final String? tokenAkses;
  final String? tokenSegar;
  final String? printerMac;
  final String? printerNama;

  const SesiState({
    this.sudahMuat = false,
    this.pengguna,
    this.tokenAkses,
    this.tokenSegar,
    this.printerMac,
    this.printerNama,
  });

  bool get terautentikasi => pengguna != null && tokenAkses != null;

  SesiState copyWith({
    bool? sudahMuat,
    PenggunaSesi? pengguna,
    bool hapusPengguna = false,
    String? tokenAkses,
    String? tokenSegar,
    String? printerMac,
    String? printerNama,
  }) {
    return SesiState(
      sudahMuat: sudahMuat ?? this.sudahMuat,
      pengguna: hapusPengguna ? null : (pengguna ?? this.pengguna),
      tokenAkses: hapusPengguna ? null : (tokenAkses ?? this.tokenAkses),
      tokenSegar: hapusPengguna ? null : (tokenSegar ?? this.tokenSegar),
      printerMac: printerMac ?? this.printerMac,
      printerNama: printerNama ?? this.printerNama,
    );
  }
}

class SesiNotifier extends StateNotifier<SesiState> {
  final PenyimpanAman _penyimpan;

  SesiNotifier(this._penyimpan) : super(const SesiState());

  static const _kAkses = 'token_akses';
  static const _kSegar = 'token_segar';
  static const _kPengguna = 'pengguna_json';
  static const _kPrinterMac = 'printer_mac';
  static const _kPrinterNama = 'printer_nama';

  Future<void> muatAwal() async {
    final akses = await _penyimpan.read(key: _kAkses);
    final segar = await _penyimpan.read(key: _kSegar);
    final pJson = await _penyimpan.read(key: _kPengguna);
    final mac = await _penyimpan.read(key: _kPrinterMac);
    final pNama = await _penyimpan.read(key: _kPrinterNama);

    PenggunaSesi? pengguna;
    if (pJson != null && pJson.isNotEmpty) {
      try {
        pengguna = PenggunaSesi.dariJson(jsonDecode(pJson) as Map<String, dynamic>);
      } catch (_) {}
    }

    state = SesiState(
      sudahMuat: true,
      pengguna: pengguna,
      tokenAkses: akses,
      tokenSegar: segar,
      printerMac: mac,
      printerNama: pNama,
    );
  }

  Future<void> simpanMasuk({
    required String tokenAkses,
    required String tokenSegar,
    required PenggunaSesi pengguna,
  }) async {
    await _penyimpan.write(key: _kAkses, value: tokenAkses);
    await _penyimpan.write(key: _kSegar, value: tokenSegar);
    await _penyimpan.write(key: _kPengguna, value: jsonEncode(pengguna.keJson()));
    state = state.copyWith(
      sudahMuat: true,
      pengguna: pengguna,
      tokenAkses: tokenAkses,
      tokenSegar: tokenSegar,
    );
  }

  Future<void> tandaiSandiDiganti() async {
    final p = state.pengguna?.copyWith(wajibGantiSandi: false);
    if (p != null) {
      await _penyimpan.write(key: _kPengguna, value: jsonEncode(p.keJson()));
      state = state.copyWith(pengguna: p);
    }
  }

  Future<void> simpanPrinter(String mac, String nama) async {
    await _penyimpan.write(key: _kPrinterMac, value: mac);
    await _penyimpan.write(key: _kPrinterNama, value: nama);
    state = state.copyWith(printerMac: mac, printerNama: nama);
  }

  Future<void> hapusSesi() async {
    await _penyimpan.delete(key: _kAkses);
    await _penyimpan.delete(key: _kSegar);
    await _penyimpan.delete(key: _kPengguna);
    state = state.copyWith(hapusPengguna: true, sudahMuat: true);
  }
}

final sesiProvider = StateNotifierProvider<SesiNotifier, SesiState>((ref) {
  return SesiNotifier(PenyimpanFlutterSecure());
});
