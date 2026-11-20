# Catatan Keputusan

Dokumen ini mencatat keputusan implementasi apabila terdapat celah atau penafsiran pada spesifikasi.

## 2026-11-20 — Fase 0
- **Migrasi SQL & `node-pg-migrate`**: Skema SQL murni ditempatkan di `backend/migrations/0001_skema.sql`, `0002_pengaman.sql`, dan `0003_fungsi.sql`, dijalankan menggunakan `node-pg-migrate` dengan `DATABASE_URL_MIGRATOR`.
- **Akun `pemilik` pada CLI `apotek:buat`**: Karena tabel `apotek` dan `pengguna` tidak menggunakan RLS, sedangkan `pengaturan_apotek` dan `akun` menggunakan RLS, pembuatan apotek baru pada `apotek:buat` dilakukan dalam satu transaksi: menyisipkan `apotek`, menetapkan `set_config('app.apotek_id', ...)`, lalu menyisipkan `pengaturan_apotek`, 18 akun awal, dan `pengguna` pemilik.
