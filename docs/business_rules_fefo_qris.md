# PharmaPOS — Aturan Bisnis: FEFO & Simulasi QRIS

Dokumen ini mendeskripsikan implementasi teknis dari dua pilar utama logika bisnis apotek pada sistem PharmaPOS: **Prinsip FEFO (First Expired, First Out)** dan **Simulasi Pembayaran QRIS Dinamis**.

---

## 1. Aturan FEFO (First Expired, First Out)

### 1.1 Landasan Regulasi Farmasi
Sesuai standar CDOB (Cara Distribusi Obat yang Baik) dan standar pelayanan kefarmasian di apotek (Permenkes No. 73 Tahun 2016), pengeluaran obat wajib mengutamakan **tanggal kedaluwarsa terdekat** (FEFO), bukan tanggal barang masuk (FIFO). Hal ini mutlak untuk mencegah penumpukan obat kedaluwarsa di rak apotek yang membahayakan pasien.

### 1.2 Algoritma Pengurangan Stok Otomatis
Ketika kasir menjual obat dengan kuantitas `Q` untuk suatu produk:
1. Sistem mengambil daftar seluruh batch aktif untuk produk tersebut:
   ```sql
   SELECT * FROM product_batches 
   WHERE product_id = :productId 
     AND current_quantity > 0 
     AND status != 'EXPIRED'
   ORDER BY exp_date ASC, created_at ASC;
   ```
2. Sistem melakukan iterasi pengurangan stok batch:
   - Jika batch teratas memiliki `current_quantity >= Q`:
     - Kurangi `batch.current_quantity -= Q`.
     - Catat item penjualan dengan `batch_id` tersebut.
     - Selesai.
   - Jika batch teratas memiliki `current_quantity < Q`:
     - Kurangi sisa stok batch hingga 0, ubah status menjadi `DEPLETED`.
     - Hitung sisa kebutuhan: `Q_remaining = Q - batch.current_quantity`.
     - Lanjutkan ke batch berikutnya dalam urutan tanggal kedaluwarsa.
3. Total stok produk di tabel `inventory` dikurangi sejumlah `Q`.
4. Setiap pemotongan batch dicatat di tabel `inventory_movements` sebagai tipe `SALE`.

### 1.3 Peringatan Status Kedaluwarsa (Batch Expiry Alert)
* **AMAN (ACTIVE)**: Tanggal kedaluwarsa > 90 hari dari hari ini.
* **AKAN KEDALUWARSA (NEAR_EXPIRY)**: Tanggal kedaluwarsa <= 90 hari dan > 0 hari.
* **KEDALUWARSA (EXPIRED)**: Tanggal kedaluwarsa <= hari ini. Batch ini otomatis di-lock oleh sistem dan tidak dapat dijual di kasir.

---

## 2. Simulasi Pembayaran QRIS Dinamis

### 2.1 Konsep Simulasi Akademik
Karena aplikasi ini dikembangkan untuk proyek perkuliahan (capstone), sistem tidak menghubungkan API live payment gateway perbankan nyata (yang memerlukan badan usaha berbadan hukum PT/CV dan izin BI). Sebagai gantinya, sistem menyediakan **Simulasi QRIS Realistis** yang mereplikasi format standar QRIS Nasional (EMVCo QR Code):

```text
Payment Method: QRIS
Merchant Name: Apotek Sehat Sentosa
NMID: ID1020269876543
Transaction ID: INV/20260922/0001
Amount: Rp29.500
Status: SIMULATED PAID
```

### 2.2 Alur Transaksi Kasir
1. Kasir memilih metode pembayaran **QRIS** pada layar checkout.
2. Aplikasi menghasilkan kode QR dinamis berisi payload JSON berformat:
   ```json
   {
     "type": "QRIS_DYNAMIC_SIMULATION",
     "invoice": "INV/20260922/0001",
     "merchant": "Apotek Sehat Sentosa",
     "amount": 29500,
     "timestamp": "2026-09-22T10:30:00Z",
     "status": "PAID"
   }
   ```
3. Kasir menekan tombol "Konfirmasi Pembayaran Selesai" atau sistem secara otomatis menerima webhook callback simulasi dalam hitungan detik.
4. Status pembayaran diubah menjadi `PAID` dan struk transaksi siap dicetak.
