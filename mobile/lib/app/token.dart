import 'package:material_ui/material_ui.dart';

/// Token desain resmi PharmaPOS — Apotek Binaan KADIN Bengkalis.
abstract final class WarnaMentah {
  // Utama (Emerald PharmaPOS)
  static const utama50 = Color(0xFFECFDF5);
  static const utama100 = Color(0xFFD1FAE5);
  static const utama200 = Color(0xFFA7F3D0);
  static const utama300 = Color(0xFF6EE7B7);
  static const utama400 = Color(0xFF34D399);
  static const utama500 = Color(0xFF10B981);
  static const utama600 = Color(0xFF059669);
  static const utama700 = Color(0xFF047857);
  static const utama800 = Color(0xFF065F46);
  static const utama900 = Color(0xFF064E3B);

  // Aksen AI (Violet PharmaPOS)
  static const ai50 = Color(0xFFF5F3FF);
  static const ai100 = Color(0xFFEDE9FE);
  static const ai600 = Color(0xFF7C3AED);
  static const ai700 = Color(0xFF6D28D9);

  // Netral
  static const netral50 = Color(0xFFF9F9FB);
  static const netral100 = Color(0xFFF0F1F5);
  static const netral200 = Color(0xFFE1E4EA);
  static const netral300 = Color(0xFFCBCFD8);
  static const netral400 = Color(0xFF8790A1);
  static const netral500 = Color(0xFF6A7181);
  static const netral600 = Color(0xFF515867);
  static const netral700 = Color(0xFF3A4150);
  static const netral800 = Color(0xFF232834);
  static const netral900 = Color(0xFF131720);
  static const putih = Color(0xFFFFFFFF);

  // Semantik
  static const berhasil600 = Color(0xFF1B7A4B);
  static const berhasil50 = Color(0xFFE6F4EC);

  static const peringatan700 = Color(0xFF92400E);
  static const peringatan50 = Color(0xFFFEF3C7);

  static const bahaya600 = Color(0xFFC01F2E);
  static const bahaya700 = Color(0xFF9A1B27);
  static const bahaya50 = Color(0xFFFDECEE);

  static const informasi600 = Color(0xFF0E7490);
  static const informasi50 = Color(0xFFE0F2F7);
}

abstract final class TokenLatar {
  static const latar = WarnaMentah.putih;
  static const halaman = WarnaMentah.netral50;
  static const selang = WarnaMentah.netral100;
  static const kepalaTabel = WarnaMentah.netral200;
  static const terpilih = WarnaMentah.utama50;
  static const nonaktif = WarnaMentah.netral100;
  static const lapisanDialog = Color(0x80131720);
}

abstract final class TokenTeks {
  static const utama = WarnaMentah.netral900;
  static const sekunder = WarnaMentah.netral700;
  static const bantu = WarnaMentah.netral600;
  static const placeholder = WarnaMentah.netral500;
  static const nonaktif = WarnaMentah.netral500;
  static const diUtama = WarnaMentah.putih;
}

abstract final class TokenAksi {
  static const utama = WarnaMentah.utama600;
  static const ditekan = WarnaMentah.utama800;
  static const disorot = WarnaMentah.utama500;
  static const fokus = WarnaMentah.utama500;
}

abstract final class TokenGaris {
  static const isian = WarnaMentah.netral400;
  static const pemisah = WarnaMentah.netral200;
}

abstract final class TokenStatus {
  static const berhasilTeks = WarnaMentah.berhasil600;
  static const berhasilLatar = WarnaMentah.berhasil50;

  static const peringatanTeks = WarnaMentah.peringatan700;
  static const peringatanLatar = WarnaMentah.peringatan50;

  static const bahayaTeks = WarnaMentah.bahaya600;
  static const bahayaDitekan = WarnaMentah.bahaya700;
  static const bahayaLatar = WarnaMentah.bahaya50;

  static const informasiTeks = WarnaMentah.informasi600;
  static const informasiLatar = WarnaMentah.informasi50;
}

abstract final class TokenJarak {
  static const double j1 = 4;
  static const double j2 = 8;
  static const double j3 = 12;
  static const double j4 = 16;
  static const double j5 = 20;
  static const double j6 = 24;
  static const double j8 = 32;
}

abstract final class TokenUkuran {
  static const double targetSentuhMin = 48;
  static const double tinggiTombol = 48;
  static const double tinggiIsian = 48;
  static const double tinggiBarisDaftar = 48;
  static const double tinggiKepalaTabel = 40;
  static const double tinggiBilahAtas = 56;
  static const double tinggiBilahBawah = 64;
  static const double ukuranIkon = 24;
  static const double lebarLayarPatokan = 360;
}

abstract final class TokenRadius {
  static const double kecil = 8;
  static const double sedang = 12;
}

abstract final class TokenGarisTebal {
  static const double t1 = 1;
  static const double t2 = 2;
  static const double ganda = 3;
  static const double penandaPesan = 4;
}

abstract final class TokenBayangan {
  static const List<BoxShadow> menu = [
    BoxShadow(
      color: Color(0x1F000000),
      offset: Offset(0, 2),
      blurRadius: 8,
    ),
  ];

  static const List<BoxShadow> dialog = [
    BoxShadow(
      color: Color(0x29000000),
      offset: Offset(0, 4),
      blurRadius: 16,
    ),
  ];
}

abstract final class TokenTipografi {
  static const String fontKeluarga = 'IBMPlexSans';
  static const List<String> fontCadangan = ['sans-serif'];

  static const TextStyle ringkasan = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 32,
    height: 40 / 32,
    fontWeight: FontWeight.w700,
    color: TokenTeks.utama,
  );

  static const TextStyle judul = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 24,
    height: 32 / 24,
    fontWeight: FontWeight.w700,
    color: TokenTeks.utama,
  );

  static const TextStyle seksi = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 20,
    height: 28 / 20,
    fontWeight: FontWeight.w600,
    color: TokenTeks.utama,
  );

  static const TextStyle dasar = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 16,
    height: 24 / 16,
    fontWeight: FontWeight.w400,
    color: TokenTeks.utama,
  );

  static const TextStyle tabel = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 14,
    height: 20 / 14,
    fontWeight: FontWeight.w400,
    color: TokenTeks.utama,
  );

  static const TextStyle keterangan = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 12,
    height: 16 / 12,
    fontWeight: FontWeight.w400,
    color: TokenTeks.bantu,
  );

  static TextStyle angkaTabular(TextStyle base) => base.copyWith(
        fontFeatures: const [FontFeature.tabularFigures()],
      );
}
