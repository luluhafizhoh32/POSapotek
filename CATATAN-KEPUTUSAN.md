# Catatan Keputusan

Dokumen ini mencatat keputusan implementasi apabila terdapat celah atau penafsiran pada spesifikasi.

## 2026-11-20 — Fase 0
- **Migrasi SQL & `node-pg-migrate`**: Skema SQL murni ditempatkan di `backend/migrations/0001_skema.sql`, `0002_pengaman.sql`, dan `0003_fungsi.sql`, dijalankan menggunakan `node-pg-migrate` dengan `DATABASE_URL_MIGRATOR`.
- **Akun `pemilik` pada CLI `apotek:buat`**: Karena tabel `apotek` dan `pengguna` tidak menggunakan RLS, sedangkan `pengaturan_apotek` dan `akun` menggunakan RLS, pembuatan apotek baru pada `apotek:buat` dilakukan dalam satu transaksi: menyisipkan `apotek`, menetapkan `set_config('app.apotek_id', ...)`, lalu menyisipkan `pengaturan_apotek`, 18 akun awal, dan `pengguna` pemilik.

## 2026-11-21 — Dukungan Web (Atas Permintaan Pengguna)
- **CORS & Flutter Web**: Atas permintaan pengguna agar aplikasi dapat diakses melalui browser web (laptop) maupun Android, `@fastify/cors` diaktifkan pada `backend/src/server.ts`, dan platform `web/` ditambahkan pada `mobile/` dengan abstraksi `BasisDataLokal` (`drift_db_native.dart` untuk Android dan `drift_db_web.dart` untuk Web) serta penghapusan ketergantungan `dart:io` pada unggah gambar dan ekspor CSV.
- **Paket ikon `lucide_icons_flutter`**: Paket `lucide_icons` (0.257.0) gagal dikompilasi pada Flutter 3.50 / Dart 3.14 karena `IconData` sekarang bertipe `final class` (`LucideIconData extends IconData` ditolak kompiler). Diganti dengan `lucide_icons_flutter` (4.0.3) yang menyediakan ikon Lucide identik menggunakan `const IconData`.
- **Cadangan font sistem**: Berkas font IBM Plex Sans menggunakan `fontFamilyFallback: ['sans-serif']` pada `TokenTipografi` sehingga tidak memblokir build apabila berkas `.ttf` lokal belum disertakan di `assets/fonts/`.
