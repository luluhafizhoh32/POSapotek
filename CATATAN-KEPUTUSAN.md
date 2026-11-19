# CATATAN KEPUTUSAN ARSITEKTUR & IMPLEMENTASI
Aplikasi POS Apotek KADIN Bengkalis

Dokumen ini mencatat keputusan-keputusan teknis, resolusi aturan yang lebih ketat, atau penanganan celah keamanan/integritas sesuai panduan CLAUDE.md.

---

### [2026-11-19] Inisialisasi Proyek & Fase 0
- **Penetapan Tumpukan**: Migrasi dari struktur prototipe lama (NestJS + MySQL/Prisma) ke spesifikasi tunggal KADIN Bengkalis: Fastify + TypeScript + PostgreSQL 16 (RLS, raw parameterized SQL) + Flutter Mobile (Android).
- **Konvensi Eksekusi Perintah di Windows**: Karena pembatasan eksekusi skrip PowerShell lokal (`ExecutionPolicy`), pemanggilan npm/npx menggunakan `npm.cmd` dan `npx.cmd`.
- **Inisialisasi Git**: Menginisialisasi repositori Git lokal untuk melacak commit berurutan per fase (`fase-0: ...` dst.).
