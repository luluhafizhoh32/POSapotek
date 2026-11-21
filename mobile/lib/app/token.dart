import 'package:material_ui/material_ui.dart';

/// Satu sumber kebenaran token desain PharmaPOS v2.1 (KADIN Bengkalis).
/// Palet: 80% netral (#F8FAFB / #FFFFFF / #E5E9EC), 15% Deep Teal (#0F766E), 5% status.
abstract final class AppColors {
  // Primary (Deep Teal)
  static const primary = Color(0xFF0F766E);
  static const primaryHover = Color(0xFF115E59);
  static const primaryPressed = Color(0xFF134E4A);
  static const primarySoft = Color(0xFFCCFBF1);
  static const primaryTint = Color(0xFFF0FDFA);
  static const secondaryMint = Color(0xFF99F6E4);

  // Neutral
  static const background = Color(0xFFF8FAFB);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceAlt = Color(0xFFF1F5F9);
  static const border = Color(0xFFE5E9EC);
  static const borderStrong = Color(0xFFCBD5E1);
  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF64748B);
  static const textMuted = Color(0xFF94A3B8);
  static const textOnPrimary = Color(0xFFFFFFFF);

  // Status
  static const success = Color(0xFF16A34A);
  static const successBg = Color(0xFFDCFCE7);
  static const warning = Color(0xFFD97706);
  static const warningBg = Color(0xFFFEF3C7);
  static const danger = Color(0xFFDC2626);
  static const dangerBg = Color(0xFFFEE2E2);
  static const info = Color(0xFF0284C7);
  static const infoBg = Color(0xFFE0F2FE);
}

abstract final class AppMotion {
  static const fast = Duration(milliseconds: 150);
  static const normal = Duration(milliseconds: 250);
  static const curve = Curves.easeOut;
}

abstract final class AppShadows {
  static const List<BoxShadow> card = [
    BoxShadow(
      color: Color(0x0A0F172A),
      offset: Offset(0, 1),
      blurRadius: 2,
    ),
  ];

  static const List<BoxShadow> floating = [
    BoxShadow(
      color: Color(0x180F172A),
      offset: Offset(0, 4),
      blurRadius: 16,
    ),
  ];
}

/// Alias kompatibilitas untuk kode yang memakai WarnaMentah / Token*.
abstract final class WarnaMentah {
  static const utama50 = AppColors.primaryTint;
  static const utama100 = AppColors.primarySoft;
  static const utama200 = AppColors.secondaryMint;
  static const utama300 = Color(0xFF5EEAD4);
  static const utama400 = Color(0xFF2DD4BF);
  static const utama500 = Color(0xFF14B8A6);
  static const utama600 = AppColors.primary;
  static const utama700 = AppColors.primaryHover;
  static const utama800 = AppColors.primaryPressed;
  static const utama900 = Color(0xFF042F2E);

  // Aksen AI (selaras dengan Deep Teal, tanpa warna aksen berlebih)
  static const ai50 = AppColors.primaryTint;
  static const ai100 = AppColors.primarySoft;
  static const ai600 = AppColors.primary;
  static const ai700 = AppColors.primaryHover;

  // Netral
  static const netral50 = AppColors.background;
  static const netral100 = AppColors.surfaceAlt;
  static const netral200 = AppColors.border;
  static const netral300 = AppColors.borderStrong;
  static const netral400 = AppColors.textMuted;
  static const netral500 = AppColors.textSecondary;
  static const netral600 = Color(0xFF475569);
  static const netral700 = Color(0xFF334155);
  static const netral800 = Color(0xFF1E293B);
  static const netral900 = AppColors.textPrimary;
  static const putih = AppColors.surface;

  // Semantik
  static const berhasil600 = AppColors.success;
  static const berhasil50 = AppColors.successBg;

  static const peringatan700 = AppColors.warning;
  static const peringatan50 = AppColors.warningBg;

  static const bahaya600 = AppColors.danger;
  static const bahaya700 = Color(0xFFB91C1C);
  static const bahaya50 = AppColors.dangerBg;

  static const informasi600 = AppColors.info;
  static const informasi50 = AppColors.infoBg;
}

abstract final class TokenLatar {
  static const latar = AppColors.surface;
  static const halaman = AppColors.background;
  static const selang = AppColors.surfaceAlt;
  static const kepalaTabel = AppColors.surfaceAlt;
  static const terpilih = AppColors.primaryTint;
  static const nonaktif = AppColors.surfaceAlt;
  static const lapisanDialog = Color(0x800F172A);
}

abstract final class TokenTeks {
  static const utama = AppColors.textPrimary;
  static const sekunder = AppColors.textSecondary;
  static const bantu = AppColors.textSecondary;
  static const placeholder = AppColors.textMuted;
  static const nonaktif = AppColors.textMuted;
  static const diUtama = AppColors.textOnPrimary;
}

abstract final class TokenAksi {
  static const utama = AppColors.primary;
  static const ditekan = AppColors.primaryPressed;
  static const disorot = AppColors.primaryHover;
  static const fokus = AppColors.primary;
}

abstract final class TokenGaris {
  static const isian = AppColors.borderStrong;
  static const pemisah = AppColors.border;
}

abstract final class TokenStatus {
  static const berhasilTeks = AppColors.success;
  static const berhasilLatar = AppColors.successBg;

  static const peringatanTeks = AppColors.warning;
  static const peringatanLatar = AppColors.warningBg;

  static const bahayaTeks = AppColors.danger;
  static const bahayaDitekan = WarnaMentah.bahaya700;
  static const bahayaLatar = AppColors.dangerBg;

  static const informasiTeks = AppColors.info;
  static const informasiLatar = AppColors.infoBg;
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
  static const double ukuranIkon = 22;
  static const double lebarLayarPatokan = 360;
}

abstract final class TokenRadius {
  static const double kecil = 8;
  static const double sedang = 12;
  static const double besar = 16;
  static const double sheet = 24;
}

abstract final class TokenGarisTebal {
  static const double t1 = 1;
  static const double t2 = 2;
  static const double ganda = 3;
  static const double penandaPesan = 4;
}

abstract final class TokenBayangan {
  static const List<BoxShadow> menu = AppShadows.card;
  static const List<BoxShadow> dialog = AppShadows.floating;
}

abstract final class TokenTipografi {
  static const String fontKeluarga = 'Plus Jakarta Sans';
  static const List<String> fontCadangan = ['Inter', 'sans-serif'];

  static const TextStyle ringkasan = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 32,
    height: 40 / 32,
    fontWeight: FontWeight.w700,
    color: TokenTeks.utama,
    letterSpacing: -0.5,
  );

  static const TextStyle judul = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 24,
    height: 32 / 24,
    fontWeight: FontWeight.w700,
    color: TokenTeks.utama,
    letterSpacing: -0.3,
  );

  static const TextStyle seksi = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 20,
    height: 28 / 20,
    fontWeight: FontWeight.w600,
    color: TokenTeks.utama,
    letterSpacing: -0.2,
  );

  static const TextStyle subjudul = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 16,
    height: 24 / 16,
    fontWeight: FontWeight.w600,
    color: TokenTeks.utama,
  );

  static const TextStyle dasar = TextStyle(
    fontFamily: fontKeluarga,
    fontFamilyFallback: fontCadangan,
    fontSize: 15,
    height: 22 / 15,
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
    fontWeight: FontWeight.w500,
    color: TokenTeks.bantu,
  );

  static TextStyle angkaTabular(TextStyle base) => base.copyWith(
        fontFeatures: const [FontFeature.tabularFigures()],
      );
}
