import 'package:flutter/material.dart';
import 'token.dart';

ThemeData bangunTemaPos() {
  return ThemeData(
    useMaterial3: true,
    fontFamily: TokenTipografi.fontKeluarga,
    scaffoldBackgroundColor: TokenLatar.halaman,
    colorScheme: const ColorScheme.light(
      primary: TokenAksi.utama,
      onPrimary: TokenTeks.diUtama,
      surface: TokenLatar.latar,
      onSurface: TokenTeks.utama,
      error: TokenStatus.bahayaTeks,
      onError: TokenTeks.diUtama,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: TokenLatar.latar,
      foregroundColor: TokenTeks.utama,
      elevation: 0,
      toolbarHeight: TokenUkuran.tinggiBilahAtas,
      titleTextStyle: TokenTipografi.seksi,
      iconTheme:
          IconThemeData(color: TokenTeks.utama, size: TokenUkuran.ukuranIkon),
      shape: Border(
          bottom:
              BorderSide(color: TokenGaris.pemisah, width: TokenGarisTebal.t1)),
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
