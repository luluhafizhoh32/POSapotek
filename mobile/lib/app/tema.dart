import 'package:material_ui/material_ui.dart';
import 'token.dart';

ThemeData bangunTemaPos() {
  return ThemeData(
    useMaterial3: true,
    fontFamily: TokenTipografi.fontKeluarga,
    scaffoldBackgroundColor: const Color(0xFFF3F7F5),
    colorScheme: const ColorScheme.light(
      primary: TokenAksi.utama,
      onPrimary: TokenTeks.diUtama,
      surface: TokenLatar.latar,
      onSurface: TokenTeks.utama,
      error: TokenStatus.bahayaTeks,
      onError: TokenTeks.diUtama,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: TokenAksi.utama,
      foregroundColor: TokenTeks.diUtama,
      elevation: 0,
      toolbarHeight: TokenUkuran.tinggiBilahAtas,
      titleTextStyle:
          TokenTipografi.seksi.copyWith(color: TokenTeks.diUtama),
      iconTheme: const IconThemeData(
          color: TokenTeks.diUtama, size: TokenUkuran.ukuranIkon),
    ),
    cardTheme: CardThemeData(
      color: TokenLatar.latar,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(TokenRadius.sedang),
        side: const BorderSide(color: TokenGaris.pemisah),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: TokenGaris.pemisah,
      thickness: TokenGarisTebal.t1,
      space: 1,
    ),
    textTheme: const TextTheme(
      headlineLarge: TokenTipografi.ringkasan,
      headlineMedium: TokenTipografi.judul,
      titleLarge: TokenTipografi.seksi,
      bodyLarge: TokenTipografi.dasar,
      bodyMedium: TokenTipografi.tabel,
      bodySmall: TokenTipografi.keterangan,
    ),
  );
}
