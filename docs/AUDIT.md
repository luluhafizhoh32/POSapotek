# Audit Proyek PharmaPOS (KADIN Bengkalis)

Tanggal Audit: 22 November 2026
Basis Kode: `backend/` (Fastify + TypeScript + PostgreSQL) & `mobile/` (Flutter + Riverpod + go_router + Drift)

---

## 1. Fitur yang Sudah Berfungsi & Teruji
| Area | Status | Bukti |
|---|---|---|
| **Multi-tenant & RLS PostgreSQL** | Berfungsi | `0002_pengaman.sql` (RLS `app.apotek_id`), teruji di `fase0.test.ts` & `fase1.test.ts` |
| **Autentikasi & Keamanan** | Berfungsi | Argon2id, JWT akses + rotasi refresh token, lockout 5x gagal (423), rate-limit, wajib ganti sandi |
| **Peran Dasar (4 Peran)** | Berfungsi | `kasir`, `staf_gudang`, `apa`, `pemilik` ditegakkan di backend (`izinkanPeran`) |
| **Master Barang, Pemasok, Batch** | Berfungsi | CRUD penuh, barcode unik per apotek, golongan (`bebas`, `bebas_terbatas`, `keras`, `narkotika`, `psikotropika`, `prekursor`) |
| **Persediaan FEFO & Mutasi Hanya-Sisip** | Berfungsi | FEFO lintas batch, batch kedaluwarsa ditolak backend, trigger hanya-sisip `mutasi_stok`, uji konkurensi 50 paralel (`fase7.test.ts`) |
| **Penjualan POS, Idempotensi & Offline** | Berfungsi | Transaksi atomik, `Idempotency-Key`, 5 metode bayar (`tunai`, `qris`, `debit`, `transfer`, `ewallet`), antrean offline FIFO Drift |
| **Penerimaan Barang & Lampiran** | Berfungsi | Cek faktur ganda, foto faktur (magic bytes), jurnal otomatis |
| **Opname & Pengajuan Pengurangan (APA)** | Berfungsi | Opname buta, pengajuan rusak/kedaluwarsa/retur PBF, pengesahan APA (pengaju ≠ pengesah) |
| **Akuntansi Double-Entry & Audit** | Berfungsi | 18 akun COA awal, saldo awal, jurnal manual & otomatis seimbang, tutup periode berurutan, neraca saldo/laba rugi/neraca, `jejak_audit` hanya-sisip |
| **Laporan Operasional & Worker Jobs** | Berfungsi | Omzet, margin kategori, fast/slow, defekta, golongan khusus JSON & CSV BOM, cron harian near-expired & bulanan |
| **AI Drug Safety Checker & AI Insight** | Berfungsi | `/api/v1/ai/cek-interaksi` & `/api/v1/ai/insight`, teruji di `ai.test.ts` |

---

## 2. Kesenjangan Terhadap PharmaPOS v2.1 & Prioritas Perbaikan

### Prioritas 1 — Sistem Desain & Layout Responsif (Bagian A & C3)
- **Token Warna**: Saat ini memakai Emerald `#059669`; v2.1 menargetkan **Deep Teal `#0F766E`** (`AppColors`), latar `#F8FAFB`, border tipis `#E5E9EC`, 80% netral / 15% teal / 5% status, tanpa gradasi berlebihan (maksimal 1 gradasi tonal halus pada kartu hero Beranda).
- **Komponen Reusable (A5)**: Perlu melengkapi `SkeletonLoader`, `EmptyState`, `ErrorState`, `StatusBadge`, `KpiCard` (dengan delta), `SectionHeader`, `ResponsiveScaffold` (Mobile bottom nav; Tablet/Desktop sidebar/rail + layout 2 panel di Kasir, bukan sekadar HP diperbesar!), serta halaman katalog komponen `/dev/components` (mode debug).
- **Hapus UI Palsu / Demo**: Hapus tombol pengisi password demo di produksi (jaga hanya bila `MODE_DEV=true`).

### Prioritas 2 — Inti Operasional & Regulasi (Bagian B6, B8, B12)
- **Mode Resep di Kasir & Database**: Penjualan produk golongan khusus (`narkotika`, `psikotropika`, `prekursor`, `keras` tertentu) wajib menyertakan data resep (dokter, pasien, nomor/tanggal resep) dan tersimpan di tabel `resep_penjualan`.
- **Surat Pesanan (SP) & Defekta**: Belum ada tabel & alur `surat_pesanan` (Draf → Menunggu TTD APA → Ditandatangani → Dibagikan ke PBF).
- **Utang Usaha (AP) & Pembayaran Utang**: Penerimaan tempo perlu mencatat faktur utang pemasok (`utang_pemasok` & `pembayaran_utang`) yang tersinkron dengan akun `2110 Utang Usaha`.
- **Konfirmasi Manual Nontunai**: Menambahkan dukungan konfirmasi manual kasir (nomor referensi) pada pembayaran nontunai sebelum gateway resmi aktif.

### Prioritas 3 — Akuntansi Lanjutan & Buku Besar (Bagian B10)
- **Buku Besar (General Ledger)**: Menambahkan endpoint `GET /api/v1/laporan-keuangan/buku-besar` (pilih akun & rentang tanggal, saldo awal, mutasi debit/kredit, saldo berjalan) + tampilan UI-nya.
- **Buka Kembali Periode**: Menambahkan endpoint buka kembali periode terkunci khusus Pemilik dengan alasan wajib + jejak audit.

### Prioritas 4 — Asisten AI Gemini & Adapter Eksternal (Bagian C1 & C2)
- **Asisten AI Obrolan (`POST /api/v1/ai/tanya`)**: Menghubungkan ke Google Gemini API lewat backend (bila `GEMINI_API_KEY` tersedia) menggunakan data baca-saja nyata dari PostgreSQL sesuai peran & `apotek_id`, dengan fallback terstruktur berbasis data nyata bila API key belum diisi (tidak pernah mengarang angka).
- **Adapter Eksternal**: Menyiapkan antarmuka `MessagingProvider` (WhatsApp) dan `PaymentProvider` terdokumentasi di `docs/KONFIGURASI-EKSTERNAL.md`.

---

## 3. Utang Teknis
- 1 info lint tersisa di `mobile/lib/fitur/pengguna/tampilan/layar_pengguna.dart:167` (`use_build_context_synchronously`) — akan dibersihkan agar `flutter analyze` 0 issue.
- `mobile/lib/fitur/penjualan/data/` sempat masuk pola `.gitignore` (`data/`); perlu memastikan pola `.gitignore` hanya mengabaikan `/data/` di root atau `backend/data/`.
