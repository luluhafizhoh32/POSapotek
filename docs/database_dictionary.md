# PharmaPOS — Database Data Dictionary (MySQL / MariaDB)

Dokumen ini menjelaskan struktur 24 tabel relasional dalam basis data `pharmapos_db`. Seluruh tabel menggunakan mesin InnoDB dengan charset `utf8mb4_unicode_ci` untuk integritas referensial dan dukungan karakter lengkap.

---

## 1. Modul Pengguna & Multi-Cabang (RBAC)

### 1.1 `branches` (Data Cabang / Outlet Apotek)
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID cabang |
| `code` | VARCHAR(20) UNIQUE | Kode unik cabang (misal: `CAB-01`) |
| `name` | VARCHAR(100) | Nama cabang (default: "Apotek Sehat Sentosa") |
| `address` | TEXT | Alamat lengkap apotek |
| `phone` | VARCHAR(20) | Nomor telepon/WhatsApp cabang |
| `is_active` | BOOLEAN | Status operasional (default: true) |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `updated_at` | TIMESTAMP | Waktu pembaruan |

### 1.2 `roles` (Peran Pengguna)
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID role |
| `name` | VARCHAR(50) UNIQUE | `OWNER`, `MANAGER`, `ADMIN`, `KASIR`, `APOTEKER`, `GUDANG` |
| `description` | VARCHAR(255) | Penjelasan cakupan tugas peran |
| `is_system` | BOOLEAN | Role bawaan sistem (tidak boleh dihapus) |

### 1.3 `permissions` & `role_permissions`
Menyimpan daftar izin spesifik (misal: `sales.create`, `inventory.adjust`, `prescriptions.verify`, dll.) yang dipetakan ke setiap peran.

### 1.4 `users` (Data Karyawan / Akun Pengguna)
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID user |
| `branch_id` | VARCHAR(36) FK | Relasi ke `branches.id` |
| `role_id` | VARCHAR(36) FK | Relasi ke `roles.id` |
| `name` | VARCHAR(100) | Nama lengkap petugas |
| `email` | VARCHAR(100) UNIQUE | Email login |
| `password_hash` | VARCHAR(255) | Bcrypt hash password |
| `phone` | VARCHAR(20) | Nomor telepon |
| `is_active` | BOOLEAN | Status keaktifan akun |
| `last_login_at` | TIMESTAMP NULL | Waktu login terakhir |
| `created_at` | TIMESTAMP | Waktu registrasi |
| `updated_at` | TIMESTAMP | Waktu pembaruan |

---

## 2. Modul Master Data Produk, Kategori, & Supplier

### 2.1 `categories` (Kategori Obat)
Menyimpan klasifikasi obat (Obat Bebas, Obat Bebas Terbatas, Obat Keras, Suplemen/Vitamin, Alat Kesehatan, Herbal).

### 2.2 `suppliers` (PBF / Distributor Farmasi)
Menyimpan data Pedagang Besar Farmasi (PBF) penyalur resmi obat.

### 2.3 `products` (Katalog Obat & Barang Medis)
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID produk |
| `category_id` | VARCHAR(36) FK | Relasi ke `categories.id` |
| `sku` | VARCHAR(50) UNIQUE | Kode SKU unik |
| `barcode` | VARCHAR(50) UNIQUE | Kode barcode EAN-13 / Code-128 |
| `name` | VARCHAR(150) | Nama dagang (contoh: "Paracetamol 500 mg") |
| `generic_name` | VARCHAR(150) | Nama generik / zat aktif |
| `brand` | VARCHAR(100) | Merk pabrikan (contoh: "Kimia Farma") |
| `dosage_form` | VARCHAR(50) | Bentuk sediaan (Tablet, Sirup, Salep, Kapsul) |
| `dosage` | VARCHAR(50) | Dosis obat (500 mg, 10 mg/5 ml, dll.) |
| `unit` | VARCHAR(30) | Satuan jual (Strip, Botol, Tube, Box, Blister) |
| `buy_price` | DECIMAL(12,2) | Harga beli rata-rata dari supplier |
| `sell_price` | DECIMAL(12,2) | Harga jual eceran kasir (HJA) |
| `min_stock` | INT | Batas stok minimum untuk peringatan reorder |
| `max_stock` | INT | Kapasitas stok optimal apotek |
| `is_prescription_required` | BOOLEAN | Apakah memerlukan resep dokter (Obat Keras) |
| `is_active` | BOOLEAN | Status aktif produk |

### 2.4 `product_batches` (Pencatatan Batch & Kedaluwarsa)
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID batch |
| `product_id` | VARCHAR(36) FK | Relasi ke `products.id` |
| `supplier_id` | VARCHAR(36) FK NULL | Relasi ke `suppliers.id` |
| `batch_number` | VARCHAR(50) | Nomor batch pabrikan (misal: `BCH-2026-042`) |
| `mfg_date` | DATE | Tanggal produksi |
| `exp_date` | DATE | Tanggal kedaluwarsa (Kunci logika FEFO) |
| `initial_quantity`| INT | Jumlah stok awal saat barang diterima |
| `current_quantity`| INT | Sisa stok terkini dalam batch ini |
| `buy_price` | DECIMAL(12,2) | Harga beli spesifik batch ini |
| `status` | VARCHAR(20) | `ACTIVE`, `NEAR_EXPIRY`, `EXPIRED`, `DEPLETED` |

---

## 3. Modul Stok & Mutasi (FEFO Engine)

### 3.1 `inventory` (Ringkasan Stok per Cabang)
Menyimpan akumulasi `total_stock` dan `reserved_stock` per produk di cabang terkait.

### 3.2 `inventory_movements` (Kartu Stok & Audit Mutasi)
Mencatat setiap pergerakan stok secara detail tanpa menghapus rekaman riwayat:
* Tipe: `PURCHASE_RECEIVE`, `SALE`, `STOCK_ADJUSTMENT`, `RETURN`, `EXPIRED_DISCARD`.
* Kuantitas, stok sebelum, stok sesudah, nomor referensi faktur/PO, dan user yang mengeksekusi.

---

## 4. Modul Penjualan & Kasir (POS)

### 4.1 `sales` (Transaksi Penjualan Kasir)
| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID transaksi |
| `invoice_number`| VARCHAR(50) UNIQUE | Nomor faktur (format: `INV/YYYYMMDD/XXXX`) |
| `branch_id` | VARCHAR(36) FK | Relasi ke cabang |
| `customer_id` | VARCHAR(36) FK NULL | Pelanggan terdaftar atau walk-in |
| `cashier_id` | VARCHAR(36) FK | User kasir yang melayani |
| `subtotal` | DECIMAL(12,2) | Nilai belanja kotor |
| `discount_amount`| DECIMAL(12,2)| Total potongan diskon |
| `tax_amount` | DECIMAL(12,2) | PPN (jika diterapkan) |
| `total_amount` | DECIMAL(12,2) | Nilai akhir yang harus dibayar |
| `payment_status`| VARCHAR(20) | `PAID`, `PENDING`, `REFUNDED` |
| `payment_method`| VARCHAR(30) | `TUNAI`, `QRIS`, `DEBIT`, `TRANSFER`, `EWALLET` |

### 4.2 `sale_items` & `payments`
Mencatat rincian per baris obat, batch spesifik yang dipotong (sesuai urutan FEFO), harga satuan, subtotal, dan bukti transaksi pembayaran.

---

## 5. Modul Pembelian & Pengadaan (PBF)
* `purchases`: Purchase Order (PO) pengadaan obat dari distributor PBF.
* `purchase_items`: Rincian obat yang dipesan, kuantitas, harga negosiasi, dan kuantitas yang berhasil diterima (receiving).

---

## 6. Modul Resep & Apoteker (Prescription)
* `prescriptions`: Pencatatan resep dokter (Nomor resep, data dokter & SIP, nama pasien, status validasi apoteker: `PENDING`, `VERIFIED`, `DISPENSED`, `REJECTED`).
* `prescription_items`: Obat yang diresepkan beserta signa (aturan pakai, dosis harian).

---

## 7. Modul Promosi & Diskon
* `promotions` & `promotion_products`: Pengelolaan promosi berkala (potongan persen, potongan nominal, minimum pembelanjaan).

---

## 8. Modul Audit, Notifikasi & AI Analytics
* `audit_logs`: Audit trail komprehensif seluruh aksi kritis (perubahan harga, stok opname, penghapusan, otorisasi).
* `notifications`: Peringatan sistem (stok menipis, peringatan obat kedaluwarsa 30 hari, PO diterima).
* `ai_predictions`: Rekomendasi prediksi kebutuhan reorder obat dari engine AI.
* `ai_insights`: Ringkasan analisis perilaku pelanggan (RFM) dan tren penjualan berkala.
