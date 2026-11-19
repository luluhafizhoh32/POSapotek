# PharmaPOS — Panduan Presentasi & Demonstrasi Sidang (Academic Defense Guide)

Panduan ini disusun untuk membantu mahasiswa mempresentasikan aplikasi **PharmaPOS** di hadapan dosen pembimbing dan dosen penguji secara profesional, meyakinkan, dan terstruktur.

---

## 🎯 Skenario Demonstrasi 15 Menit

### Menit 01 - 03: Pembukaan & Penjelasan Konsep
* Jelaskan latar belakang masalah: Apotek di Indonesia menghadapi tantangan berat dalam monitoring obat kedaluwarsa (kerugian finansial & risiko malpraktik) serta pencatatan manual penjualan dan pengadaan PBF.
* Tunjukkan arsitektur sistem: Monorepo terpadu dengan **Flutter Mobile POS**, **NestJS REST API**, dan **MySQL XAMPP** dengan **Prisma ORM**.
* Tunjukkan tampilan awal **phpMyAdmin** (`http://localhost/phpmyadmin`) untuk membuktikan seluruh data tersimpan di basis data relasional sesungguhnya, bukan sekadar dummy memory/array.

### Menit 04 - 06: Pembuktian "Zero-Seed Tolerance" (Database Kosong)
* *Poin Penilaian Dosen*: Sistem yang baik tidak boleh crash saat database baru dipasang.
* Tunjukkan backend berjalan normal dengan 0 data awal.
* Buka halaman katalog obat atau transaksi kasir di aplikasi mobile: tampilkan **Empty State** yang rapi (*"Belum ada obat terdaftar"*, *"Belum ada transaksi hari ini"*).
* *(Opsional)*: Jalankan perintah `npm run seed` dari terminal untuk mengisi 20+ obat percontohan, 10 pelanggan, dan data batch untuk demonstrasi fitur transaksi.

### Menit 07 - 10: Alur Transaksi Kasir & Logika FEFO
1. **Login Kasir**: Masuk menggunakan akun `kasir@pharmapos.local`.
2. **Katalog & Scan**: Cari produk `Paracetamol 500 mg` atau scan barcode `8991234560011`.
3. **Pilih Pelanggan & Metode QRIS**: Masukkan nama pelanggan `Andi Pratama` dan pilih metode **QRIS**.
4. **Tunjukkan FEFO Bekerja**:
   - Sebelum transaksi, buka tabel `product_batches` di phpMyAdmin. Tunjukkan terdapat 2 batch: Batch A (kedaluwarsa 2 bulan lagi, sisa 30) dan Batch B (kedaluwarsa 2 tahun lagi, sisa 100).
   - Lakukan transaksi pembelian 5 unit di kasir.
   - Refresh phpMyAdmin: Buktikan bahwa Batch A yang terpotong menjadi 25 unit, sementara Batch B tetap 100 unit! Ini membuktikan sistem menerapkan aturan **FEFO** secara nyata.
5. **Cetak Struk**: Tampilkan struk digital dengan nomor faktur, rincian obat, dan QRIS simulasi.

### Menit 11 - 13: Alur Resep Apoteker & Analisis AI
1. **Login Apoteker**: Masuk menggunakan akun `apoteker@pharmapos.local`.
2. **Buka Menu Resep**: Periksa resep dokter yang masuk dengan status `PENDING`.
3. **AI Drug Interaction**: Tunjukkan fitur AI yang menganalisis resep dan memberikan catatan kewaspadaan (misal: potensi interaksi antara antibiotik dan antasida).
4. **Verifikasi Klinis**: Apoteker menekan tombol "Verifikasi & Dispense", mengubah status resep menjadi `VERIFIED`.

### Menit 14 - 15: Dashboard Owner & Penutup
1. **Login Owner**: Masuk menggunakan akun `owner@pharmapos.local`.
2. **Tinjau Dashboard**: Tampilkan grafik omzet, ringkasan transaksi, produk terlaris, dan alert obat mendekati kedaluwarsa 30 hari.
3. **AI Stock Prediction**: Tampilkan rekomendasi reorder obat berbasis tren konsumsi historis.
4. **Kesimpulan**: Tekankan bahwa sistem ini telah memenuhi standar software engineering (Clean Architecture, RBAC ketat, Audit Log, dan Business Process terintegrasi).
