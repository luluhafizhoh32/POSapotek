import 'package:material_ui/material_ui.dart';
import 'token.dart';

ThemeData bangunTemaPos() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    fontFamily: TokenTipografi.fontKeluarga,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: const ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: AppColors.textOnPrimary,
      secondary: AppColors.secondaryMint,
      onSecondary: AppColors.textPrimary,
      surface: AppColors.surface,
      onSurface: AppColors.textPrimary,
      error: AppColors.danger,
      onError: AppColors.textOnPrimary,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.surface,
      foregroundColor: AppColors.textPrimary,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      toolbarHeight: TokenUkuran.tinggiBilahAtas,
      titleTextStyle: TokenTipografi.seksi,
      iconTheme: IconThemeData(
        color: AppColors.textPrimary,
        size: TokenUkuran.ukuranIkon,
      ),
      shape: Border(
        bottom: BorderSide(color: AppColors.border, width: 1),
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(TokenRadius.besar),
        side: const BorderSide(color: AppColors.border),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: AppColors.border,
      thickness: 1,
      space: 1,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.surface,
      selectedColor: AppColors.primarySoft,
      side: const BorderSide(color: AppColors.border),
      shape: const StadiumBorder(),
      labelStyle: TokenTipografi.tabel.copyWith(fontWeight: FontWeight.w500),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.surface,
      indicatorColor: AppColors.primarySoft,
      surfaceTintColor: Colors.transparent,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TokenTipografi.keterangan.copyWith(
          color: selected ? AppColors.primary : AppColors.textSecondary,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          color: selected ? AppColors.primary : AppColors.textSecondary,
          size: 22,
        );
      }),
    ),
    textTheme: const TextTheme(
      headlineLarge: TokenTipografi.ringkasan,
      headlineMedium: TokenTipografi.judul,
      titleLarge: TokenTipografi.seksi,
      titleMedium: TokenTipografi.subjudul,
      bodyLarge: TokenTipografi.dasar,
      bodyMedium: TokenTipografi.tabel,
      bodySmall: TokenTipografi.keterangan,
    ),
  );
}

ThemeData bangunTemaGelapPos() {
  const bg = Color(0xFF0B1120);
  const surface = Color(0xFF111827);
  const border = Color(0xFF1F2937);
  const primary = Color(0xFF14B8A6);
  const textMain = Color(0xFFF8FAFC);

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    fontFamily: TokenTipografi.fontKeluarga,
    scaffoldBackgroundColor: bg,
    colorScheme: const ColorScheme.dark(
      primary: primary,
      onPrimary: Color(0xFF042F2E),
      surface: surface,
      onSurface: textMain,
      error: Color(0xFFF87171),
      onError: Color(0xFF450A0A),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: surface,
      foregroundColor: textMain,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      titleTextStyle: TokenTipografi.seksi.copyWith(color: textMain),
      shape: const Border(bottom: BorderSide(color: border, width: 1)),
    ),
    cardTheme: CardThemeData(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(TokenRadius.besar),
        side: const BorderSide(color: border),
      ),
    ),
    dividerTheme: const DividerThemeData(color: border, thickness: 1, space: 1),
  );
}
