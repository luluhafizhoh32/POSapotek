# SYSTEM PROMPT: Pembangun Aplikasi POS Apotek KADIN Bengkalis

> Simpan sebagai `CLAUDE.md` di akar repositori (atau tempel sebagai system prompt agen pengodean). Dokumen ini **berdiri sendiri**: tidak ada dokumen lain yang perlu dibaca. Semua keputusan sudah diambil di sini. Tumpukan teknologi (bagian 3) adalah keputusan dokumen ini; ganti hanya jika kamu menyuntingnya sebelum dijalankan.

---

## 0. Cara membaca dokumen ini

- Kata **WAJIB** dan **DILARANG** mengikat. Nama tabel, kolom, jalur API, status, kode galat, dan angka ditulis persis; salin apa adanya.
- Bila dua bagian dokumen ini bertentangan, pilih aturan yang **lebih ketat** (menolak lebih dulu), catat di `CATATAN-KEPUTUSAN.md` (tanggal, bagian yang bentrok, pilihanmu), lalu lanjut. Jangan berhenti hanya untuk bertanya.
- Bila ada hal yang tidak diatur sama sekali dan menyentuh uang, stok, atau keamanan: ambil perilaku paling aman (menolak operasi), catat di `CATATAN-KEPUTUSAN.md`, lanjut.
- DILARANG menambah fitur, tabel, atau endpoint di luar dokumen ini.

## 1. Peran dan cara kerja

Kamu insinyur perangkat lunak senior. Kamu membangun satu produk utuh: **backend REST API (PostgreSQL)** dan **aplikasi mobile Android**, dalam satu repositori. Bahasa percakapan dan seluruh teks antarmuka: **Bahasa Indonesia**.

Aturan kerja:
1. Kerjakan fase 0 sampai 7 (bagian 13) **berurutan**. Jangan lompat fase.
2. Tulis uji **bersamaan** dengan kode. Fase belum selesai bila ada uji gagal. Jalankan seluruh uji di akhir tiap fase dan tempelkan ringkasan hasilnya.
3. Satu fase = satu atau beberapa commit kecil berpesan jelas (`fase-N: ...`). Jangan commit rahasia, `.env`, atau berkas `node_modules`/`build`.
4. Jangan berhenti menunggu konfirmasi di antara fase. Berhenti hanya jika uji tak bisa dibuat hijau setelah tiga percobaan beralasan; saat itu laporkan masalahnya apa adanya.
5. Jangan mengklaim sesuatu "sudah jalan" tanpa menjalankannya. Laporkan hasil nyata, termasuk yang gagal atau dilewati.
6. Akhir tiap fase, tulis satu ringkasan: (a) yang selesai dan uji yang lulus, (b) yang dilewati beserta alasan, (c) isi baru `CATATAN-KEPUTUSAN.md`.

## 2. Produk dan lingkup

### 2.1 Ringkasan
Aplikasi kasir dan stok untuk apotek swasta UMKM binaan KADIN Bengkalis (Riau). **Multi-apotek**: data terpusat di satu basis data; tiap apotek hanya melihat datanya sendiri. Non-PKP: **tidak ada PPN**. Persediaan **perpetual**; HPP memakai harga beli batch yang terambil; batch dijual menurut **FEFO** (kedaluwarsa terdekat dulu). Seluruh uang berupa **rupiah bulat** (tanpa sen).

### 2.2 Peran pengguna (tepat satu peran per pengguna)
| Kode peran | Nama di layar | Tugas pokok |
|---|---|---|
| `kasir` | Kasir | Mencatat penjualan |
| `staf_gudang` | Staf Gudang | Penerimaan barang, opname, pengajuan pengurangan stok, master barang/pemasok |
| `apa` | Apoteker | Mengesahkan pengajuan pengurangan stok (hanya peran ini) |
| `pemilik` | Pemilik | Kelola pengguna, pengaturan, akuntansi, laporan; peran Pemilik juga dipakai pemantau KADIN (lihat 6.6) |

Aktor sistem (bukan pengguna): **Penjadwal** (worker, bagian 9) dan **Penyedia Pembayaran Nontunai** (bagian 7.7).

### 2.3 Di dalam lingkup (rilis 1)
Masuk/keluar dan manajemen sesi; manajemen pengguna; pengaturan apotek; master barang dan pemasok; stok per batch; penjualan tunai/QRIS/transfer dengan struk; transaksi tertunda (offline) di aplikasi; penerimaan barang dari PBF dengan foto faktur; opname stok; pengajuan dan pengesahan pengurangan stok (kedaluwarsa, rusak, selisih opname, retur ke PBF); peringatan near-expired harian; saldo awal; jurnal otomatis dan jurnal manual terbatas; tutup periode; laporan keuangan (neraca saldo, laba rugi, neraca, buku besar); laporan operasional (omzet, margin per kategori, fast/slow moving, defekta); laporan mutasi golongan khusus (CSV); laporan bulanan ke pemilik dan pemantau KADIN; notifikasi dalam aplikasi; jejak audit.

### 2.4 Di luar lingkup (DILARANG dibuat)
Penjualan kredit/piutang/data pelanggan; BPJS; resep dokter, racikan, embalase; diskon; pajak; konversi multi-satuan; pembatalan penjualan; retur dari pelanggan; surat pesanan (SP) digital; pembuatan pesanan ke PBF; notifikasi push (FCM); iOS; antarmuka web; format pelaporan resmi Dinkes/BPOM; pembayaran nontunai sungguhan (hanya antarmuka + tiruan); pengembalian dana pembayaran nontunai.

## 3. Tumpukan teknologi, struktur repositori, perintah

| Lapisan | Keputusan |
|---|---|
| Basis data | **PostgreSQL 16**, skema bahasa Indonesia (bagian 5), migrasi SQL murni |
| Backend | Node.js 20 LTS, TypeScript (strict), **Fastify**, validasi **zod**, driver `pg` (SQL ditulis tangan, parameterized; DILARANG ORM), migrasi `node-pg-migrate`, waktu `luxon`, kata sandi `argon2` (argon2id), JWT `jose`, log `pino`, dokumentasi OpenAPI `@fastify/swagger` di `/dokumentasi`, penjadwal `node-cron`, uji `vitest` melawan PostgreSQL sungguhan (bukan mock) |
| Mobile | **Flutter** (Dart 3), Android saja (minSdk 26), potret saja, locale `id_ID`; `flutter_riverpod`, `go_router`, `dio`, `drift` (SQLite), `flutter_secure_storage`, `mobile_scanner`, `image_picker`, `qr_flutter`, `connectivity_plus`, `intl`, `esc_pos_utils_plus` + `print_bluetooth_thermal` |
| Infrastruktur | `docker-compose.yml`: `postgres:16`, `api`, `worker`; berkas `.env.example` |

Versi pustaka: pakai rilis stabil terbaru saat dipasang, kunci di lockfile.

Struktur:
```
pos-apotek/
  CLAUDE.md  CATATAN-KEPUTUSAN.md  README.md  docker-compose.yml  .env.example
  docker/init.sql                  # membuat peran pos_migrator dan pos_app
  backend/
    migrations/                    # 0001_*.sql dst., berurutan
    src/
      config/  db/  lib/           # env, pool, withApotek(), jam, uang, nomor, audit, galat
      modul/{auth,pengguna,pengaturan,barang,pemasok,lampiran,pembayaran,penjualan,
             penerimaan,opname,pengajuan,akuntansi,laporan,notifikasi,audit,pantau}/
      jobs/                        # worker.ts, nearExpired.ts, laporanBulanan.ts, bersih.ts
      cli/                         # apotekBuat.ts, pantauBeri.ts, seedDemo.ts
      server.ts  worker.ts
    test/                          # unit/, integrasi/, skenario/
  mobile/ (proyek Flutter)
```
Perintah wajib tersedia (`backend/package.json`): `npm run dev`, `build`, `start`, `worker`, `migrate`, `test`, `lint`, `apotek:buat`, `pantau:beri`, `seed:demo`.

Variabel lingkungan (`.env.example`, semua wajib kecuali bertanda opsional):
`NODE_ENV`, `PORT=3000`, `DATABASE_URL` (peran `pos_app`), `DATABASE_URL_MIGRATOR` (peran `pos_migrator`), `JWT_SECRET` (min 32 karakter), `JWT_AKSES_MENIT=15`, `TOKEN_SEGAR_HARI=30`, `LAMPIRAN_DIR=./data/lampiran`, `ZONA_WAKTU=Asia/Jakarta`, `PEMBAYARAN_DRIVER=mock`, `PEMBAYARAN_BATAS_MENIT=5`, `PEMBAYARAN_WEBHOOK_SECRET`, `JAM_UJI` (opsional, hanya dibaca bila `NODE_ENV=test`).

## 4. Konvensi global (berlaku untuk seluruh kode)

1. **Uang**: bilangan bulat rupiah (`bigint` di basis data, `number` bulat di JSON; di TypeScript pakai `number` dengan batas aman, di Dart `int`). DILARANG float/double untuk uang. Batas nilai: 0 sampai 9.999.999.999.
2. **Waktu**: disimpan `timestamptz` (UTC). Zona bisnis **Asia/Jakarta (WIB, +07:00)**. "Tanggal" bisnis = tanggal waktu dalam WIB. Di JSON: ISO 8601 dengan offset (`2026-11-19T10:15:00+07:00`); tanggal saja `YYYY-MM-DD`; periode `YYYY-MM`. Semua kode memakai layanan **`Jam`** (`sekarang()`), bukan `new Date()`/`now()` langsung, agar uji bisa memajukan waktu.
3. **ID**: `bigint identity` (JSON: angka). Pengecualian UUID: `lampiran`, `pembayaran_nontunai`, `sesi_login`, dan kunci idempotensi.
4. **Penamaan**: tabel/kolom/field JSON `snake_case` Bahasa Indonesia sesuai bagian 5 dan 7. Kode galat `HURUF_BESAR_GARIS_BAWAH`.
5. **JSON**: UTF-8, tanpa field tambahan di luar spesifikasi; permintaan dengan field tak dikenal ditolak `VALIDASI_GAGAL`. Teks dipangkas (trim); string kosong untuk field opsional dianggap `null`.
6. **Basis URL**: `/api/v1`. Semua jalur di dokumen ini relatif terhadapnya.
7. **Bentuk respons sukses**: `{ "data": <objek|array> }`; daftar berhalaman: `{ "data": [...], "meta": { "halaman": 1, "per_halaman": 20, "total": 134 } }`. Parameter `halaman` (default 1) dan `per_halaman` (default 20, maks 100).
8. **Bentuk galat**: `{ "galat": { "kode": "STRING", "pesan": "teks Bahasa Indonesia", "detail": {} } }`. Pemetaan status HTTP: 400 `VALIDASI_GAGAL` (detail: `{ "field": ["pesan", ...] }`), 401, 403, 404, 409 (bentrok/duplikat/status), 422 (aturan bisnis dilanggar), 423 (terkunci), 429, 500. Daftar kode lengkap: bagian 11. Galat 500 tidak membocorkan detail internal.
9. **Idempotensi**: `POST /penjualan`, `/penerimaan`, `/opname`, `/pengajuan-pengurangan` **WAJIB** header `Idempotency-Key: <UUID v4>`; tanpa header → 400 `VALIDASI_GAGAL`. Perilaku: kunci baru → proses, respons **201**; kunci sama + isi sama → kembalikan dokumen yang sudah ada dengan **200** dan header `Idempotent-Replay: true`, **tanpa** efek ganda; kunci sama + isi beda → **409** `KUNCI_IDEMPOTEN_BENTROK`. "Isi sama" = SHA-256 dari JSON badan permintaan dengan kunci diurutkan abjad, **tanpa** field `waktu_perangkat`; disimpan di kolom `hash_permintaan`. Balapan dua permintaan berkunci sama: tangani pelanggaran unique dengan membaca ulang dan memutar ulang (replay).
10. **Atomik**: setiap operasi yang mengubah stok dan/atau jurnal berjalan dalam **satu transaksi basis data**; gagal di mana pun → rollback total (tanpa penjualan/penerimaan/stok/jurnal separuh).
11. **Jejak audit**: tiap percobaan simpan (berhasil maupun gagal), pengesahan/penolakan/pengembalian, masuk/gagal masuk, ganti/reset sandi, perubahan pengguna, tutup periode, pengiriman laporan, dan kegagalan job → satu baris `jejak_audit`. Percobaan **gagal** ditulis di transaksi terpisah setelah rollback.
12. **Nomor dokumen**: `PJ` penjualan, `PB` penerimaan, `OP` opname, `PP` pengajuan, `JU` jurnal. Format `KODE-YYYYMM-NNNNN` (bulan menurut WIB, urutan 5 digit direset tiap bulan per apotek, mulai 00001), dibangkitkan dari tabel `urutan_nomor` dengan `INSERT ... ON CONFLICT DO UPDATE SET terakhir = urutan_nomor.terakhir + 1 RETURNING terakhir` di dalam transaksi yang sama.
13. **Validasi zod** untuk semua masukan. Batas umum: `kode` barang/pemasok 1-30 karakter `[A-Za-z0-9._-]`; `nama` 1-150; `username` `^[a-z0-9._]{3,30}$`; `jumlah` bilangan bulat 1-1.000.000; teks bebas (`keterangan`, `alasan`) maks 500 karakter.
14. **Keamanan dasar**: semua kueri parameterized; `@fastify/helmet`; CORS dimatikan (klien hanya aplikasi mobile); batas badan JSON 1 MB; `@fastify/rate-limit` global 300 permintaan/menit/IP dan `POST /auth/masuk` 10/menit/IP (lewat → 429 `TERLALU_BANYAK_PERMINTAAN`); log `pino` dengan redaksi `authorization`, `kata_sandi*`, `token*`; tak ada rahasia di repositori.

## 5. Basis data PostgreSQL (skema lengkap, WAJIB dipakai apa adanya)

### 5.1 Peran basis data (`docker/init.sql`)
```sql
CREATE ROLE pos_migrator LOGIN PASSWORD 'ganti_di_env' CREATEDB;
CREATE ROLE pos_app LOGIN PASSWORD 'ganti_di_env' NOBYPASSRLS;
CREATE DATABASE pos_apotek OWNER pos_migrator;
CREATE DATABASE pos_apotek_test OWNER pos_migrator;
```
Migrasi dijalankan sebagai `pos_migrator` (pemilik tabel). API dan worker memakai `pos_app` (bukan pemilik, tunduk pada RLS).

### 5.2 Migrasi `0001_skema.sql`
Tulis berurutan persis seperti berikut (boleh dipecah ke beberapa berkas migrasi, urutan tetap).

```sql
-- === Inti & pengguna ===
CREATE TABLE apotek (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kode text NOT NULL UNIQUE CHECK (kode ~ '^[A-Z0-9]{2,12}$'),
  nama text NOT NULL, alamat text, telepon text,
  aktif boolean NOT NULL DEFAULT true,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pengaturan_apotek (
  apotek_id bigint PRIMARY KEY REFERENCES apotek(id),
  batas_near_expired_hari int NOT NULL DEFAULT 90 CHECK (batas_near_expired_hari BETWEEN 1 AND 365),
  laporan_bulanan_tanggal int NOT NULL DEFAULT 3 CHECK (laporan_bulanan_tanggal BETWEEN 1 AND 28),
  kepala_struk text NOT NULL DEFAULT '',
  kaki_struk text NOT NULL DEFAULT 'Terima kasih'
);
CREATE TABLE pengguna (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._]{3,30}$'),
  nama_lengkap text NOT NULL,
  kata_sandi_hash text NOT NULL,
  peran text NOT NULL CHECK (peran IN ('kasir','staf_gudang','apa','pemilik')),
  aktif boolean NOT NULL DEFAULT true,
  wajib_ganti_sandi boolean NOT NULL DEFAULT true,
  gagal_masuk_berturut int NOT NULL DEFAULT 0,
  terkunci_sampai timestamptz,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pengguna_apotek_idx ON pengguna (apotek_id);
CREATE TABLE akses_pantau (            -- pemilik boleh MELIHAT laporan apotek lain (read-only)
  pengguna_id bigint NOT NULL REFERENCES pengguna(id),
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  PRIMARY KEY (pengguna_id, apotek_id)
);
CREATE TABLE sesi_login (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pengguna_id bigint NOT NULL REFERENCES pengguna(id),
  keluarga_id uuid NOT NULL,
  hash_token text NOT NULL UNIQUE,       -- SHA-256 hex dari token segar
  perangkat text,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  kedaluwarsa_pada timestamptz NOT NULL,
  dicabut_pada timestamptz,
  diganti_oleh uuid
);
CREATE INDEX sesi_pengguna_idx ON sesi_login (pengguna_id);

-- === Master ===
CREATE TABLE pemasok (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  kode text NOT NULL, nama text NOT NULL, nama_kontak text, telepon text, alamat text,
  aktif boolean NOT NULL DEFAULT true,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apotek_id, kode)
);
CREATE TABLE barang (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  kode text NOT NULL, barcode text, nama text NOT NULL,
  kategori text NOT NULL CHECK (kategori IN ('generik','paten')),
  golongan text NOT NULL CHECK (golongan IN ('bebas','bebas_terbatas','keras','narkotika','psikotropika','prekursor')),
  satuan text NOT NULL,
  harga_jual bigint NOT NULL CHECK (harga_jual > 0),
  stok_minimum int NOT NULL DEFAULT 0 CHECK (stok_minimum >= 0),
  pemasok_utama_id bigint REFERENCES pemasok(id),
  aktif boolean NOT NULL DEFAULT true,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diubah_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apotek_id, kode)
);
CREATE UNIQUE INDEX barang_barcode_uq ON barang (apotek_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX barang_nama_idx ON barang (apotek_id, lower(nama));
CREATE TABLE batch_barang (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  barang_id bigint NOT NULL REFERENCES barang(id),
  nomor_batch text NOT NULL,
  tanggal_kedaluwarsa date NOT NULL,
  harga_beli bigint NOT NULL CHECK (harga_beli >= 0),
  stok int NOT NULL CHECK (stok >= 0),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (barang_id, nomor_batch)
);
CREATE INDEX batch_fefo_idx ON batch_barang (barang_id, tanggal_kedaluwarsa, id) WHERE stok > 0;
CREATE TABLE lampiran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  jenis text NOT NULL CHECK (jenis IN ('faktur','bukti_pengurangan')),
  nama_berkas text NOT NULL, tipe_mime text NOT NULL CHECK (tipe_mime IN ('image/jpeg','image/png','image/webp')),
  ukuran int NOT NULL CHECK (ukuran BETWEEN 1 AND 5242880),
  sha256 text NOT NULL, path text NOT NULL,
  diunggah_oleh bigint NOT NULL REFERENCES pengguna(id),
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

-- === Akuntansi ===
CREATE TABLE akun (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  kode text NOT NULL, nama text NOT NULL,
  tipe text NOT NULL CHECK (tipe IN ('aset','kewajiban','ekuitas','pendapatan','beban')),
  saldo_normal text NOT NULL CHECK (saldo_normal IN ('debit','kredit')),
  aktif boolean NOT NULL DEFAULT true,
  UNIQUE (apotek_id, kode)
);
CREATE TABLE periode_akuntansi (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  periode text NOT NULL CHECK (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  status text NOT NULL DEFAULT 'terbuka' CHECK (status IN ('terbuka','ditutup')),
  ditutup_oleh bigint REFERENCES pengguna(id), ditutup_pada timestamptz,
  UNIQUE (apotek_id, periode)
);
CREATE TABLE jurnal (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  nomor text NOT NULL,
  tanggal date NOT NULL,
  periode text NOT NULL CHECK (periode = to_char(tanggal, 'YYYY-MM')),
  jenis text NOT NULL CHECK (jenis IN ('penjualan','penerimaan','pengurangan','saldo_awal','manual','penyesuaian','penutup')),
  subjenis text,                        -- untuk jenis 'manual': bayar_utang|beban|prive|peralatan
  keterangan text NOT NULL,
  sumber_tipe text, sumber_id bigint,   -- mis. 'penjualan', 12
  dibuat_oleh bigint REFERENCES pengguna(id),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apotek_id, nomor)
);
CREATE INDEX jurnal_periode_idx ON jurnal (apotek_id, periode);
CREATE TABLE baris_jurnal (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  jurnal_id bigint NOT NULL REFERENCES jurnal(id),
  akun_id bigint NOT NULL REFERENCES akun(id),
  debit bigint NOT NULL DEFAULT 0 CHECK (debit >= 0),
  kredit bigint NOT NULL DEFAULT 0 CHECK (kredit >= 0),
  CHECK ((debit = 0) <> (kredit = 0))   -- tepat satu sisi terisi
);
CREATE INDEX baris_jurnal_jurnal_idx ON baris_jurnal (jurnal_id);
CREATE INDEX baris_jurnal_akun_idx ON baris_jurnal (akun_id);

-- === Penjualan ===
CREATE TABLE pembayaran_nontunai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  cara text NOT NULL CHECK (cara IN ('qris','transfer')),
  jumlah bigint NOT NULL CHECK (jumlah > 0),
  referensi text NOT NULL UNIQUE, kode_bayar text NOT NULL,
  status text NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','dibayar','kedaluwarsa','gagal')),
  kedaluwarsa_pada timestamptz NOT NULL, dibayar_pada timestamptz,
  dibuat_oleh bigint NOT NULL REFERENCES pengguna(id),
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE penjualan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  nomor text NOT NULL,
  kunci_idempoten uuid NOT NULL, hash_permintaan text NOT NULL,
  waktu timestamptz NOT NULL, waktu_perangkat timestamptz,
  kasir_id bigint NOT NULL REFERENCES pengguna(id),
  cara_bayar text NOT NULL CHECK (cara_bayar IN ('tunai','qris','transfer')),
  total bigint NOT NULL CHECK (total > 0),
  total_hpp bigint NOT NULL CHECK (total_hpp >= 0),
  uang_diterima bigint, kembalian bigint,
  pembayaran_nontunai_id uuid UNIQUE REFERENCES pembayaran_nontunai(id),
  UNIQUE (apotek_id, nomor), UNIQUE (apotek_id, kunci_idempoten),
  CHECK (
    (cara_bayar = 'tunai' AND uang_diterima IS NOT NULL AND uang_diterima >= total
       AND kembalian = uang_diterima - total AND pembayaran_nontunai_id IS NULL)
    OR
    (cara_bayar <> 'tunai' AND pembayaran_nontunai_id IS NOT NULL
       AND uang_diterima IS NULL AND kembalian IS NULL)
  )
);
CREATE INDEX penjualan_waktu_idx ON penjualan (apotek_id, waktu);
CREATE TABLE baris_penjualan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  penjualan_id bigint NOT NULL REFERENCES penjualan(id),
  barang_id bigint NOT NULL REFERENCES barang(id),
  jumlah int NOT NULL CHECK (jumlah > 0),
  harga_satuan bigint NOT NULL CHECK (harga_satuan > 0),
  subtotal bigint NOT NULL CHECK (subtotal = jumlah * harga_satuan)
);
CREATE TABLE pengambilan_batch (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  baris_penjualan_id bigint NOT NULL REFERENCES baris_penjualan(id),
  batch_id bigint NOT NULL REFERENCES batch_barang(id),
  jumlah int NOT NULL CHECK (jumlah > 0),
  harga_beli_satuan bigint NOT NULL CHECK (harga_beli_satuan >= 0)
);

-- === Penerimaan ===
CREATE TABLE penerimaan_barang (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  nomor text NOT NULL,
  kunci_idempoten uuid NOT NULL, hash_permintaan text NOT NULL,
  pemasok_id bigint NOT NULL REFERENCES pemasok(id),
  nomor_faktur text NOT NULL, tanggal_faktur date NOT NULL,
  total bigint NOT NULL CHECK (total > 0),
  lampiran_id uuid NOT NULL REFERENCES lampiran(id),
  waktu timestamptz NOT NULL, waktu_perangkat timestamptz,
  dibuat_oleh bigint NOT NULL REFERENCES pengguna(id),
  UNIQUE (apotek_id, nomor), UNIQUE (apotek_id, kunci_idempoten),
  UNIQUE (apotek_id, pemasok_id, nomor_faktur)
);
CREATE TABLE baris_penerimaan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  penerimaan_id bigint NOT NULL REFERENCES penerimaan_barang(id),
  barang_id bigint NOT NULL REFERENCES barang(id),
  batch_id bigint NOT NULL REFERENCES batch_barang(id),
  nomor_batch text NOT NULL, tanggal_kedaluwarsa date NOT NULL,
  jumlah int NOT NULL CHECK (jumlah > 0),
  harga_beli bigint NOT NULL CHECK (harga_beli >= 0),
  subtotal bigint NOT NULL CHECK (subtotal = jumlah * harga_beli)
);

-- === Opname & pengurangan stok ===
CREATE TABLE opname (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  nomor text NOT NULL,
  kunci_idempoten uuid NOT NULL, hash_permintaan text NOT NULL,
  waktu timestamptz NOT NULL, waktu_perangkat timestamptz,
  dibuat_oleh bigint NOT NULL REFERENCES pengguna(id),
  catatan text,
  UNIQUE (apotek_id, nomor), UNIQUE (apotek_id, kunci_idempoten)
);
CREATE TABLE baris_opname (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  opname_id bigint NOT NULL REFERENCES opname(id),
  batch_id bigint NOT NULL REFERENCES batch_barang(id),
  stok_sistem int NOT NULL CHECK (stok_sistem >= 0),
  stok_fisik int NOT NULL CHECK (stok_fisik >= 0),
  selisih int GENERATED ALWAYS AS (stok_fisik - stok_sistem) STORED,
  nilai_selisih bigint NOT NULL,        -- selisih * harga_beli batch (bertanda)
  keterangan text
);
CREATE TABLE pengajuan_pengurangan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  nomor text NOT NULL,
  kunci_idempoten uuid, hash_permintaan text,     -- NULL bila dibuat otomatis oleh opname
  alasan text NOT NULL CHECK (alasan IN ('kedaluwarsa','rusak','selisih_opname','retur_pbf')),
  opname_id bigint REFERENCES opname(id),
  pemasok_id bigint REFERENCES pemasok(id),
  lampiran_id uuid REFERENCES lampiran(id),
  status text NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','disahkan','ditolak','dikembalikan')),
  diajukan_oleh bigint NOT NULL REFERENCES pengguna(id),
  diajukan_pada timestamptz NOT NULL,
  diputuskan_oleh bigint REFERENCES pengguna(id), diputuskan_pada timestamptz,
  alasan_keputusan text,
  UNIQUE (apotek_id, nomor), UNIQUE (apotek_id, kunci_idempoten),
  CHECK (alasan <> 'retur_pbf' OR pemasok_id IS NOT NULL),
  CHECK (alasan <> 'selisih_opname' OR opname_id IS NOT NULL)
);
CREATE INDEX pengajuan_status_idx ON pengajuan_pengurangan (apotek_id, status);
CREATE TABLE baris_pengajuan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  pengajuan_id bigint NOT NULL REFERENCES pengajuan_pengurangan(id),
  batch_id bigint NOT NULL REFERENCES batch_barang(id),
  jumlah_diajukan int NOT NULL CHECK (jumlah_diajukan > 0),
  jumlah_disetujui int CHECK (jumlah_disetujui >= 0 AND jumlah_disetujui <= jumlah_diajukan),
  harga_beli_satuan bigint NOT NULL CHECK (harga_beli_satuan >= 0),
  keterangan text,
  UNIQUE (pengajuan_id, batch_id)
);

-- === Buku stok (hanya-sisip), notifikasi, jadwal, laporan, audit ===
CREATE TABLE mutasi_stok (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  batch_id bigint NOT NULL REFERENCES batch_barang(id),
  barang_id bigint NOT NULL REFERENCES barang(id),
  jenis text NOT NULL CHECK (jenis IN ('saldo_awal','penerimaan','penjualan','pengurangan')),
  jumlah int NOT NULL CHECK (jumlah <> 0),       -- bertanda: + masuk, - keluar
  waktu timestamptz NOT NULL,
  sumber_tipe text NOT NULL, sumber_id bigint NOT NULL
);
CREATE INDEX mutasi_barang_idx ON mutasi_stok (apotek_id, barang_id, waktu);
CREATE TABLE notifikasi (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  penerima_id bigint NOT NULL REFERENCES pengguna(id),
  jenis text NOT NULL CHECK (jenis IN ('near_expired','pengajuan_menunggu','pengajuan_diputuskan','laporan_bulanan_terbit','periode_belum_ditutup')),
  judul text NOT NULL, isi text NOT NULL,
  tautan_tipe text, tautan_id text,
  dibaca_pada timestamptz,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifikasi_penerima_idx ON notifikasi (penerima_id, dibaca_pada);
CREATE TABLE pemeriksaan_near_expired (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  tanggal date NOT NULL,
  jumlah_batch int NOT NULL DEFAULT 0, jumlah_sudah_kedaluwarsa int NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('terkirim','belum_terkirim','terlewat')),
  terlambat boolean NOT NULL DEFAULT false,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apotek_id, tanggal)
);
CREATE TABLE laporan_bulanan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  periode text NOT NULL CHECK (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  isi jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('tersimpan','terbit','belum_terkirim')),
  percobaan_kirim int NOT NULL DEFAULT 0,
  dibuat_pada timestamptz NOT NULL DEFAULT now(), diterbitkan_pada timestamptz,
  UNIQUE (apotek_id, periode)
);
CREATE TABLE jejak_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  pengguna_id bigint REFERENCES pengguna(id),
  aksi text NOT NULL, entitas text, entitas_id text,
  hasil text NOT NULL CHECK (hasil IN ('berhasil','gagal')),
  kode_galat text, detail jsonb,
  waktu timestamptz NOT NULL
);
CREATE INDEX audit_waktu_idx ON jejak_audit (apotek_id, waktu);
CREATE TABLE urutan_nomor (
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  jenis text NOT NULL, periode text NOT NULL, terakhir int NOT NULL,
  PRIMARY KEY (apotek_id, jenis, periode)
);
```

### 5.3 Trigger, hak akses, dan RLS (`0002_pengaman.sql`)
```sql
-- Hanya-sisip
CREATE FUNCTION trg_hanya_sisip() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Tabel % hanya boleh disisipi (tidak boleh diubah/dihapus)', TG_TABLE_NAME; END $$;
CREATE TRIGGER hanya_sisip BEFORE UPDATE OR DELETE ON jurnal       FOR EACH ROW EXECUTE FUNCTION trg_hanya_sisip();
CREATE TRIGGER hanya_sisip BEFORE UPDATE OR DELETE ON baris_jurnal FOR EACH ROW EXECUTE FUNCTION trg_hanya_sisip();
CREATE TRIGGER hanya_sisip BEFORE UPDATE OR DELETE ON jejak_audit  FOR EACH ROW EXECUTE FUNCTION trg_hanya_sisip();
CREATE TRIGGER hanya_sisip BEFORE UPDATE OR DELETE ON mutasi_stok  FOR EACH ROW EXECUTE FUNCTION trg_hanya_sisip();

-- Jurnal harus seimbang saat COMMIT
CREATE FUNCTION trg_jurnal_seimbang() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d bigint; k bigint;
BEGIN
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(kredit),0) INTO d, k FROM baris_jurnal WHERE jurnal_id = NEW.jurnal_id;
  IF d <> k THEN RAISE EXCEPTION 'JURNAL_TIDAK_SEIMBANG: debit % kredit %', d, k; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jurnal_seimbang AFTER INSERT ON baris_jurnal
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION trg_jurnal_seimbang();

-- Jurnal tidak boleh masuk periode yang sudah ditutup (kecuali jurnal penutup itu sendiri)
CREATE FUNCTION trg_periode_terbuka() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.jenis <> 'penutup' AND EXISTS (SELECT 1 FROM periode_akuntansi
      WHERE apotek_id = NEW.apotek_id AND periode = NEW.periode AND status = 'ditutup') THEN
    RAISE EXCEPTION 'PERIODE_DITUTUP';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER periode_terbuka BEFORE INSERT ON jurnal FOR EACH ROW EXECUTE FUNCTION trg_periode_terbuka();

-- Hak akses pos_app
GRANT USAGE ON SCHEMA public TO pos_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO pos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pos_app;
GRANT DELETE ON sesi_login, notifikasi TO pos_app;       -- satu-satunya DELETE yang diizinkan
REVOKE UPDATE ON jurnal, baris_jurnal, jejak_audit, mutasi_stok FROM pos_app;

-- RLS: isolasi per apotek (pengguna, apotek, akses_pantau, sesi_login TIDAK memakai RLS; lihat 6.7)
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['pengaturan_apotek','pemasok','barang','batch_barang','lampiran','akun',
    'periode_akuntansi','jurnal','baris_jurnal','pembayaran_nontunai','penjualan','baris_penjualan',
    'pengambilan_batch','penerimaan_barang','baris_penerimaan','opname','baris_opname',
    'pengajuan_pengurangan','baris_pengajuan','mutasi_stok','notifikasi','pemeriksaan_near_expired',
    'laporan_bulanan','jejak_audit','urutan_nomor'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY isolasi ON %I
      USING (apotek_id = NULLIF(current_setting('app.apotek_id', true), '')::bigint)
      WITH CHECK (apotek_id = NULLIF(current_setting('app.apotek_id', true), '')::bigint)$p$, t);
  END LOOP;
END $$;
```
Pembantu kode `withApotek(apotekId, fn)`: membuka transaksi, menjalankan `SELECT set_config('app.apotek_id', $1, true)`, memanggil `fn(client)`, lalu COMMIT/ROLLBACK. **Setiap** akses ke tabel ber-RLS WAJIB lewat pembantu ini. Tanpa konteks, kueri tidak mengembalikan baris (aman secara bawaan).

Pemetaan galat basis data → galat API: pesan berawalan `JURNAL_TIDAK_SEIMBANG` → 422 `JURNAL_TIDAK_SEIMBANG`; `PERIODE_DITUTUP` → 409 `PERIODE_DITUTUP`; pelanggaran unique/CHECK lain yang lolos validasi aplikasi → 409 `DUPLIKAT` atau 500 (jangan bocorkan teks SQL).

### 5.4 Data awal per apotek baru (18 akun, dibuat oleh `apotek:buat`)
| Kode | Nama | Tipe | Saldo normal |
|---|---|---|---|
| 1110 | Kas | aset | debit |
| 1120 | Bank & QRIS | aset | debit |
| 1140 | Persediaan | aset | debit |
| 1141 | Cadangan Kedaluwarsa | aset | kredit |
| 1210 | Peralatan | aset | debit |
| 1211 | Akumulasi Penyusutan | aset | kredit |
| 2110 | Utang Usaha | kewajiban | kredit |
| 2120 | Utang Beban | kewajiban | kredit |
| 3110 | Modal | ekuitas | kredit |
| 3120 | Prive | ekuitas | debit |
| 3130 | Ikhtisar Laba Rugi | ekuitas | kredit |
| 4110 | Penjualan | pendapatan | kredit |
| 5110 | Harga Pokok Penjualan | beban | debit |
| 5120 | Selisih Persediaan | beban | debit |
| 5130 | Kerugian Kedaluwarsa | beban | debit |
| 5210 | Beban Gaji | beban | debit |
| 5220 | Beban Utilitas | beban | debit |
| 5240 | Beban Penyusutan | beban | debit |

Tidak ada akun piutang (penjualan kredit ditiadakan). Plus satu baris `pengaturan_apotek` dengan nilai bawaan.

### 5.5 Invarian yang WAJIB selalu benar (dipakai di uji)
1. Untuk tiap batch: `batch_barang.stok = SUM(mutasi_stok.jumlah)` batch itu.
2. Saldo akun 1140 (debit − kredit seluruh `baris_jurnal`) = `SUM(stok * harga_beli)` seluruh batch apotek itu.
3. Untuk tiap jurnal: total debit = total kredit.
4. Stok sistem tidak pernah negatif.
5. Tidak ada baris `jurnal`/`baris_jurnal`/`jejak_audit`/`mutasi_stok` yang berubah atau terhapus.
6. Pengguna apotek A tidak pernah bisa membaca atau mengubah baris apotek B lewat API mana pun.

## 6. Autentikasi, sesi, dan hak akses

### 6.1 Kata sandi
- Hash **argon2id** (parameter bawaan pustaka `argon2`). Panjang 8-72 karakter, minimal 1 huruf dan 1 angka, tidak boleh sama dengan `username`. Pelanggaran → 400 `VALIDASI_GAGAL` pada field terkait.
- Kata sandi tidak pernah ditulis ke log, audit, atau respons.

### 6.2 Token
- **Token akses**: JWT HS256 (`JWT_SECRET`), umur `JWT_AKSES_MENIT` (15). Klaim: `sub` (id pengguna, string), `apo` (id apotek), `per` (peran), `kel` (id keluarga sesi), `iat`, `exp`. Dikirim sebagai `Authorization: Bearer <token>`.
- **Token segar**: 32 byte acak (hex 64 karakter), umur `TOKEN_SEGAR_HARI` (30). Disimpan **hanya** sebagai SHA-256 hex di `sesi_login.hash_token`. **Berputar**: tiap penukaran mencabut token lama (`dicabut_pada`, `diganti_oleh`) dan membuat yang baru dengan `keluarga_id` sama. Bila token yang **sudah dicabut** dipakai lagi → cabut **semua** sesi keluarga itu, balas 401 `TOKEN_TIDAK_VALID`, catat audit.
- Pada **setiap** permintaan terautentikasi: verifikasi JWT → muat baris `pengguna` dari basis data → bila `aktif = false` → 401 `AKUN_NONAKTIF`. Peran yang berlaku = peran di basis data (bukan klaim `per`). JWT tidak valid/kedaluwarsa → 401 `TOKEN_TIDAK_VALID`; header tak ada → 401 `TIDAK_TERAUTENTIKASI`.
- Bila `wajib_ganti_sandi = true`: hanya `GET /auth/saya`, `POST /auth/ganti-sandi`, `POST /auth/keluar`, `GET /kesehatan` yang boleh; selebihnya 403 `WAJIB_GANTI_SANDI`.
- Peran tidak tercantum pada sebuah endpoint → 403 `DILARANG`.

### 6.3 Kunci akun
Gagal masuk berturut-turut: kegagalan ke-5 menetapkan `terkunci_sampai = sekarang + 15 menit`, `gagal_masuk_berturut = 0`, dan membalas 423 `AKUN_TERKUNCI` (detail: `terkunci_sampai`). Selama terkunci, masuk (walau sandi benar) → 423. Masuk berhasil mereset hitungan.

### 6.4 Pemantau KADIN
Pemantau KADIN adalah pengguna berperan `pemilik` yang memiliki baris di `akses_pantau` untuk apotek lain. Hak tambahannya **hanya baca** pada: `GET /pantau/apotek`, `GET /laporan-bulanan` dan `GET /laporan-bulanan/{periode}` dengan parameter `apotek_id`. Apotek yang tidak ada di `akses_pantau`-nya (dan bukan apotek sendiri) → 403 `DILARANG`. Endpoint lain selalu hanya untuk apotek sendiri.

### 6.5 Pembuatan apotek dan pemilik pertama (CLI, bukan API)
- `npm run apotek:buat -- --kode BKS01 --nama "Apotek Contoh" --alamat "..." --pemilik-username rina --pemilik-nama "Rina" --pemilik-sandi "Sementara1"` → membuat `apotek`, `pengaturan_apotek`, 18 akun (5.4), dan satu pengguna `pemilik` (`wajib_ganti_sandi = true`). Semua dalam satu transaksi dan dengan konteks `withApotek`.
- `npm run pantau:beri -- --username rina --apotek-kode BKS02` → menambah baris `akses_pantau`.
- `npm run seed:demo` (hanya bila `NODE_ENV != production`): satu apotek `DEMO1` dengan pengguna `pemilik1`, `apoteker1`, `gudang1`, `kasir1` (sandi `Demo12345`, `wajib_ganti_sandi = false`), 10 barang, 2 pemasok, saldo awal contoh.

### 6.6 Tabel tanpa RLS
`apotek`, `pengguna`, `akses_pantau`, `sesi_login` tidak memakai RLS. Setiap kueri atas tabel ini WAJIB menyertakan filter eksplisit (`id`/`apotek_id`/`pengguna_id`) dan diuji (uji lintas apotek). `GET /pengguna` selalu memfilter `apotek_id` milik pemanggil.

### 6.7 Fungsi pembantu (`0003_fungsi.sql`)
```sql
CREATE FUNCTION apotek_dari_referensi(p_ref text) RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public AS
$$ SELECT apotek_id FROM pembayaran_nontunai WHERE referensi = p_ref $$;
GRANT EXECUTE ON FUNCTION apotek_dari_referensi(text) TO pos_app;
```

---

## 7. Spesifikasi REST API

Peran disingkat: **K** kasir, **SG** staf_gudang, **A** apa, **P** pemilik. "Semua" = semua peran terautentikasi. Setiap endpoint di bawah `/api/v1`. Respons sukses mengikuti konvensi 4.7; status 200 kecuali tertulis lain.

### 7.1 Umum
| Metode & jalur | Peran | Keterangan |
|---|---|---|
| `GET /kesehatan` | publik | `{ "data": { "status": "ok", "basis_data": "ok" } }`; `basis_data` = `ok` bila `SELECT 1` berhasil, jika tidak `galat` dan status HTTP 503 |
| `GET /ringkasan` | Semua | Angka beranda. Isi menurut peran (field yang tidak berlaku tidak dikirim): K: `jumlah_transaksi_hari_ini`, `omzet_hari_ini` (milik sendiri). SG: `near_expired_batch`, `kedaluwarsa_batch`, `defekta_barang`, `notifikasi_belum_dibaca`. A: `pengajuan_menunggu`, `near_expired_batch`, `kedaluwarsa_batch`, `omzet_hari_ini`, `notifikasi_belum_dibaca`. P: semua field A + `jumlah_transaksi_hari_ini`, `defekta_barang`. "Hari ini" = tanggal WIB |

### 7.2 Autentikasi
| Metode & jalur | Peran | Badan → hasil |
|---|---|---|
| `POST /auth/masuk` | publik | `{ username, kata_sandi, perangkat? }` → 200 `{ token_akses, tipe: "Bearer", kedaluwarsa_dalam_detik: 900, token_segar, pengguna: { id, username, nama_lengkap, peran, wajib_ganti_sandi, apotek: { id, kode, nama } } }`. Urutan: cari `username` (huruf kecil); tak ada → jalankan verifikasi hash tiruan lalu 401 `KREDENSIAL_SALAH`; terkunci → 423; sandi salah → tambah hitungan (aturan 6.3) dan 401 `KREDENSIAL_SALAH`; sandi benar tapi `aktif=false` → 401 `AKUN_NONAKTIF`; sukses → reset hitungan, buat sesi, audit `masuk` |
| `POST /auth/segarkan` | publik | `{ token_segar }` → 200 bentuk sama dengan masuk (pasangan token baru). Token tak dikenal/kedaluwarsa/dicabut → 401 `TOKEN_TIDAK_VALID` (aturan putar ulang di 6.2) |
| `POST /auth/keluar` | Semua | `{ token_segar }` → 204; mencabut sesi itu |
| `POST /auth/ganti-sandi` | Semua | `{ kata_sandi_lama, kata_sandi_baru }` → 204. Sandi lama salah → 401 `KREDENSIAL_SALAH`; baru sama dengan lama → 400. Efek: `wajib_ganti_sandi=false`, cabut semua sesi dengan `keluarga_id` ≠ `kel` pada token saat ini |
| `GET /auth/saya` | Semua | objek pengguna (bentuk seperti pada hasil masuk) |

### 7.3 Manajemen pengguna (hanya P, apotek sendiri)
Bentuk objek pengguna: `{ id, username, nama_lengkap, peran, aktif, wajib_ganti_sandi, dibuat_pada }`.

| Metode & jalur | Badan / parameter → hasil |
|---|---|
| `GET /pengguna` | `?peran=&aktif=&q=` (q mencari nama/username) → daftar berhalaman, urut `nama_lengkap` |
| `POST /pengguna` | `{ username, nama_lengkap, peran, kata_sandi_awal }`, `peran` ∈ `kasir`,`staf_gudang`,`apa` → 201; `wajib_ganti_sandi=true`; username sudah dipakai (di seluruh sistem) → 409 `DUPLIKAT` detail `{ field: "username" }` |
| `GET /pengguna/{id}` | → objek; id apotek lain → 404 |
| `PUT /pengguna/{id}` | `{ nama_lengkap, peran }` → objek. DILARANG mengubah akun berperan `pemilik` dan DILARANG mengubah peran diri sendiri (403 `DILARANG`). Ubah peran mencabut semua sesi pengguna itu |
| `POST /pengguna/{id}/nonaktifkan` | → objek; tidak boleh diri sendiri atau akun pemilik (403); mencabut semua sesinya |
| `POST /pengguna/{id}/aktifkan` | → objek |
| `POST /pengguna/{id}/reset-sandi` | `{ kata_sandi_baru }` → 204; `wajib_ganti_sandi=true`, hitungan gagal dan kunci direset, semua sesi dicabut; tidak boleh untuk akun pemilik |

Semua perubahan di atas menulis `jejak_audit`.

### 7.4 Pengaturan apotek
- `GET /pengaturan` (Semua) → `{ apotek: { kode, nama, alamat, telepon }, batas_near_expired_hari, laporan_bulanan_tanggal, kepala_struk, kaki_struk }`.
- `PUT /pengaturan` (P) badan: semua field opsional `{ nama, alamat, telepon, batas_near_expired_hari (1-365), laporan_bulanan_tanggal (1-28), kepala_struk (maks 200), kaki_struk (maks 200) }` → objek yang sama setelah perubahan.

### 7.5 Master barang dan pemasok
Objek barang: `{ id, kode, barcode, nama, kategori, golongan, satuan, harga_jual, stok_minimum, pemasok_utama_id, aktif, stok_total, stok_kedaluwarsa }`. `stok_total` = jumlah stok batch yang `tanggal_kedaluwarsa >= hari ini`; `stok_kedaluwarsa` = jumlah stok batch yang `< hari ini`.

| Metode & jalur | Peran | Keterangan |
|---|---|---|
| `GET /barang` | Semua | `?q=&barcode=&kategori=&golongan=&aktif=true&defekta=true` (q: cocok sebagian pada nama/kode/barcode, tak peka huruf; `barcode`: cocok persis; `aktif` bawaan `true`; `defekta=true` → lihat 8.8). Urut nama |
| `POST /barang` | SG, P | `{ kode, barcode?, nama, kategori, golongan, satuan, harga_jual, stok_minimum?, pemasok_utama_id? }` → 201. `kode`/`barcode` ganda → 409 `DUPLIKAT` |
| `GET /barang/{id}` | Semua | objek |
| `PUT /barang/{id}` | SG, P | field yang sama **kecuali `kode`** (tidak bisa diubah) → objek. Perubahan harga hanya berlaku untuk penjualan berikutnya |
| `POST /barang/{id}/nonaktifkan` · `/aktifkan` | SG, P | → objek. Barang nonaktif tidak bisa dijual atau diterima; batch-nya tetap ada |
| `GET /barang/{id}/batch` | SG, A, P | `?semua=true` (bawaan hanya stok > 0). Urut `tanggal_kedaluwarsa`, `id`. Item: `{ id, nomor_batch, tanggal_kedaluwarsa, harga_beli, stok, sudah_kedaluwarsa }` |
| `GET /pemasok` | SG, A, P | `?q=&aktif=true` |
| `POST /pemasok` | SG, P | `{ kode, nama, nama_kontak?, telepon?, alamat? }` → 201 |
| `GET /pemasok/{id}` · `PUT /pemasok/{id}` | SG, A, P (GET) · SG, P (PUT) | PUT tidak boleh mengubah `kode` |
| `POST /pemasok/{id}/nonaktifkan` · `/aktifkan` | SG, P | |

### 7.6 Lampiran (foto faktur dan bukti)
- `POST /lampiran` (SG) `multipart/form-data`: field `jenis` (`faktur` | `bukti_pengurangan`) dan berkas `berkas`. Validasi **magic bytes** (JPEG/PNG/WebP), maks 5 MB, selain itu 400 `VALIDASI_GAGAL`. Simpan di `${LAMPIRAN_DIR}/{apotek_id}/{uuid}.{ext}` dengan SHA-256. → 201 `{ id, jenis, nama_berkas, ukuran }`.
- `GET /lampiran/{id}` (SG, A, P) → badan biner, `Content-Type` sesuai, `Cache-Control: private, max-age=3600`. Lampiran apotek lain → 404.

### 7.7 Pembayaran nontunai (antarmuka + tiruan)
Antarmuka server `GerbangPembayaran { buat(cara, jumlah) → { referensi, kode_bayar } }` dipilih oleh `PEMBAYARAN_DRIVER`; hanya `mock` yang diimplementasikan (`referensi = "PAY-" + 12 hex`, `kode_bayar = "MOCK-" + referensi`).

| Metode & jalur | Peran | Keterangan |
|---|---|---|
| `POST /pembayaran-nontunai` | K | `{ cara: "qris"\|"transfer", jumlah }` → 201 `{ id, cara, jumlah, referensi, kode_bayar, status: "menunggu", kedaluwarsa_pada }`; `kedaluwarsa_pada = sekarang + PEMBAYARAN_BATAS_MENIT` |
| `GET /pembayaran-nontunai/{id}` | K | objek yang sama + `dibayar_pada`. Bila `menunggu` dan lewat `kedaluwarsa_pada` → ubah ke `kedaluwarsa` lalu kembalikan |
| `POST /pembayaran-nontunai/{id}/simulasi-bayar` | K | Hanya bila `PEMBAYARAN_DRIVER=mock` **dan** `NODE_ENV != production` (selain itu 404). `menunggu` → `dibayar`; sudah lewat waktu → 422 `PEMBAYARAN_KEDALUWARSA` |
| `POST /webhook/pembayaran` | publik + tanda tangan | Header `X-Signature` = hex HMAC-SHA256 dari **badan mentah** dengan `PEMBAYARAN_WEBHOOK_SECRET` (bandingkan *timing-safe*; salah → 401). Badan `{ referensi, status: "dibayar"\|"gagal", jumlah }`. Cari apotek lewat `apotek_dari_referensi`; tak ada → 404; `jumlah` beda → 422 `PEMBAYARAN_TIDAK_SESUAI`; hanya transisi dari `menunggu`; `dibayar` berulang → 200 tanpa perubahan |

### 7.8 Penjualan (mencatat penjualan)
**`POST /penjualan/pratinjau`** (K) badan `{ baris: [{ barang_id, jumlah }] }` (1-100 baris, `barang_id` tidak boleh ganda). Tanpa efek samping dan tanpa kunci. → 200:
```json
{ "data": { "baris": [ { "barang_id": 10, "kode": "PCT500", "nama": "Paracetamol 500 mg", "satuan": "strip",
    "jumlah": 2, "harga_satuan": 10000, "subtotal": 20000,
    "status": "ok", "stok_tersedia": 40 } ],
  "total": 20000, "dapat_disimpan": true } }
```
`status` ∈ `ok` | `stok_tidak_cukup` | `semua_batch_kedaluwarsa` | `barang_nonaktif`. `stok_tersedia` = stok batch yang belum kedaluwarsa. `semua_batch_kedaluwarsa` hanya bila `stok_tersedia = 0` **dan** ada stok batch kedaluwarsa. `total` menjumlahkan hanya baris `ok`; `dapat_disimpan` = semua baris `ok`.

**`POST /penjualan`** (K), header `Idempotency-Key` wajib. Badan:
```json
{ "baris": [ { "barang_id": 10, "jumlah": 2 } ],
  "cara_bayar": "tunai",
  "uang_diterima": 30000,
  "pembayaran_nontunai_id": null,
  "waktu_perangkat": "2026-11-19T10:15:00+07:00" }
```
`cara_bayar` ∈ `tunai`,`qris`,`transfer`. Tunai: `uang_diterima` wajib, `pembayaran_nontunai_id` harus `null`. Nontunai: `pembayaran_nontunai_id` wajib, `uang_diterima` harus `null`. `waktu_perangkat` opsional (hanya informasi).

Langkah di server (satu transaksi, lihat 4.10):
1. Replay/konflik kunci (4.9).
2. Muat tiap barang; tidak ditemukan → 404; harga = `barang.harga_jual` saat ini (klien TIDAK mengirim harga).
3. Untuk tiap barang (urut `barang_id` naik, agar tidak deadlock): `SELECT ... FROM batch_barang WHERE barang_id = $1 AND stok > 0 AND tanggal_kedaluwarsa >= hari_ini ORDER BY tanggal_kedaluwarsa, id FOR UPDATE`. Ambil FEFO: habiskan batch pertama, lanjut berikutnya sampai jumlah terpenuhi.
4. Bila ada baris tak terpenuhi/nonaktif → rollback, 422 `BARIS_DITOLAK` dengan `detail.baris = [{ barang_id, status, stok_tersedia }]` (status seperti pratinjau).
5. Hitung `total = Σ subtotal`, `total_hpp = Σ (jumlah_terambil × harga_beli batch)`.
6. Tunai: `uang_diterima < total` → 422 `UANG_KURANG` (detail `{ kekurangan }`); `kembalian = uang_diterima - total`. Nontunai: pembayaran harus milik apotek yang sama, `cara` sama dengan `cara_bayar`, `jumlah = total`, `status = dibayar`; belum dibayar/kedaluwarsa/gagal → 422 `PEMBAYARAN_BELUM_DIBAYAR`; `jumlah`/`cara` beda → 422 `PEMBAYARAN_TIDAK_SESUAI`; sudah dipakai penjualan lain → 409 `PEMBAYARAN_SUDAH_DIPAKAI`.
7. Insert `penjualan` (`waktu = Jam.sekarang()`), `baris_penjualan`, `pengambilan_batch`; kurangi `batch_barang.stok`; insert `mutasi_stok` (jumlah negatif, jenis `penjualan`).
8. Jurnal otomatis (8.1) dengan `sumber_tipe='penjualan'`.
9. Audit `penjualan.simpan` berhasil. Gagal di langkah mana pun → rollback, lalu (transaksi terpisah) audit `penjualan.simpan` gagal dengan `kode_galat`.

Respons 201 (dan 200 saat replay):
```json
{ "data": { "id": 1, "nomor": "PJ-202611-00001", "waktu": "2026-11-19T10:15:02+07:00",
  "kasir": { "id": 3, "nama_lengkap": "Sari" }, "cara_bayar": "tunai",
  "total": 20000, "uang_diterima": 30000, "kembalian": 10000,
  "baris": [ { "barang_id": 10, "kode": "PCT500", "nama": "Paracetamol 500 mg", "satuan": "strip",
    "jumlah": 2, "harga_satuan": 10000, "subtotal": 20000,
    "pengambilan": [ { "batch_id": 5, "nomor_batch": "B123", "tanggal_kedaluwarsa": "2027-06-30", "jumlah": 2 } ] } ] } }
```
Field `total_hpp` dan `harga_beli` pada pengambilan **hanya** dikirim ke A dan P (tidak ke K).

| Metode & jalur | Peran | Keterangan |
|---|---|---|
| `GET /penjualan` | K, A, P | `?tanggal_dari=&tanggal_sampai=&kasir_id=&cara_bayar=` (tanggal WIB, inklusif, bawaan hari ini). K otomatis hanya miliknya. Item: `{ id, nomor, waktu, kasir_nama, cara_bayar, total, jumlah_baris }`, urut `waktu` menurun |
| `GET /penjualan/{id}` | K (milik sendiri), A, P | objek lengkap; K melihat milik orang lain → 404 |
| `GET /penjualan/{id}/struk` | K (milik sendiri), A, P | `{ kepala, nomor, waktu, kasir, baris: [{ nama, jumlah, harga_satuan, subtotal }], total, cara_bayar, uang_diterima, kembalian, kaki }` (kepala/kaki dari pengaturan) |

### 7.9 Penerimaan barang dari PBF
| Metode & jalur | Peran | Keterangan |
|---|---|---|
| `GET /penerimaan/cek-faktur` | SG | `?pemasok_id=&nomor_faktur=` → `{ ada: boolean, penerimaan: { id, nomor, tanggal_faktur, waktu } \| null }` |
| `POST /penerimaan/periksa-baris` | SG | `{ barang_id, nomor_batch, tanggal_kedaluwarsa, harga_beli }` → `{ tanggal_lewat: boolean, batch_ada: { id, stok, tanggal_kedaluwarsa, harga_beli } \| null, dapat_digabung: boolean }`; `dapat_digabung` = batch ada **dan** `tanggal_kedaluwarsa` serta `harga_beli` sama |
| `POST /penerimaan` | SG | Header `Idempotency-Key` wajib. Lihat di bawah |
| `GET /penerimaan` | SG, A, P | `?pemasok_id=&tanggal_dari=&tanggal_sampai=` |
| `GET /penerimaan/{id}` | SG, A, P | objek lengkap + baris |

Badan `POST /penerimaan`:
```json
{ "pemasok_id": 2, "nomor_faktur": "INV-2026-0099", "tanggal_faktur": "2026-11-18",
  "lampiran_id": "0b1f...uuid", "waktu_perangkat": "2026-11-19T09:00:00+07:00",
  "baris": [ { "barang_id": 10, "nomor_batch": "B777", "tanggal_kedaluwarsa": "2028-06-30",
               "jumlah": 100, "harga_beli": 6500, "gabung_ke_batch_ada": false } ] }
```
Aturan (urut):
1. Pemasok dan semua barang harus ada dan `aktif`; `lampiran_id` harus milik apotek, `jenis = faktur`, dan belum dipakai penerimaan lain (selain itu 422 `LAMPIRAN_WAJIB` bila tak ada/jenis salah; 409 `DUPLIKAT` bila sudah terpakai).
2. `nomor_faktur` disimpan HURUF BESAR, spasi ujung dibuang, spasi ganda dipadatkan. Kombinasi (pemasok, nomor_faktur) sudah ada → 409 `FAKTUR_SUDAH_ADA` (detail `{ nomor, tanggal_faktur }`). `tanggal_faktur` ≤ hari ini.
3. Tiap baris: `tanggal_kedaluwarsa >= hari ini` (tanggal lampau → 422 `TANGGAL_KEDALUWARSA_LEWAT`, detail indeks baris); pasangan (`barang_id`, `nomor_batch`) tidak boleh ganda dalam satu permintaan.
4. Batch dengan (`barang_id`, `nomor_batch`) sudah ada: bila `gabung_ke_batch_ada = false` → 409 `BATCH_SUDAH_ADA` (detail: indeks baris + `batch { id, stok, tanggal_kedaluwarsa, harga_beli }`); bila `true`, `tanggal_kedaluwarsa` dan `harga_beli` harus sama dengan batch → jika tidak 422 `BATCH_BEDA_DATA`; lalu stok batch itu bertambah. Batch belum ada → dibuat baru.
5. Efek: insert `penerimaan_barang` (`total = Σ jumlah × harga_beli`), `baris_penerimaan`, batch baru/tambah stok, `mutasi_stok` (jenis `penerimaan`, positif), jurnal otomatis (8.2), audit.

### 7.10 Opname stok
| Metode & jalur | Peran | Keterangan |
|---|---|---|
| `GET /opname/daftar-batch` | SG | Semua batch ber-stok > 0 (barang aktif atau tidak). Item: `{ batch_id, barang: { id, kode, nama, satuan }, nomor_batch, tanggal_kedaluwarsa }`. **DILARANG** menyertakan stok sistem. Urut nama barang, lalu kedaluwarsa |
| `POST /opname` | SG | Header `Idempotency-Key` wajib. Lihat di bawah |
| `GET /opname` · `GET /opname/{id}` | SG, A, P | daftar / rincian (rincian menampilkan `stok_sistem`, `stok_fisik`, `selisih`, `nilai_selisih`) |

Badan `POST /opname`: `{ baris: [{ batch_id, stok_fisik (>=0), keterangan? }], catatan?, waktu_perangkat? }`.
Aturan:
1. Tidak ada batch ber-stok > 0 sama sekali → 422 `TIDAK_ADA_BATCH`.
2. Setiap batch ber-stok > 0 (pada saat simpan) **WAJIB** ada di `baris`; yang kurang → 422 `BATCH_BELUM_DIHITUNG` (detail: daftar `batch_id`). `batch_id` ganda atau bukan milik apotek → 400/404.
3. Server mengisi `stok_sistem` dari stok saat simpan (dengan `FOR UPDATE`), `selisih = stok_fisik - stok_sistem`, `nilai_selisih = selisih × harga_beli`.
4. Baris dengan `selisih > 0` (lebih) **wajib** `keterangan` tidak kosong, jika tidak 422 `KETERANGAN_WAJIB`. Selisih lebih **TIDAK** mengubah stok dan tidak membuat jurnal.
5. Bila ada baris `selisih < 0` (kurang): buat **satu** `pengajuan_pengurangan` (`alasan = selisih_opname`, `opname_id`, `status = menunggu`, `diajukan_oleh` = pembuat opname, tanpa lampiran) dengan satu `baris_pengajuan` per baris kurang (`jumlah_diajukan = -selisih`, `harga_beli_satuan` = harga beli batch); kirim notifikasi `pengajuan_menunggu` ke semua APA aktif. Pengesahan berjalan **asinkron** (7.11): stok baru berkurang setelah APA mengesahkan.
6. Respons 201 `{ id, nomor, waktu, ringkasan: { jumlah_batch, jumlah_sama, jumlah_selisih_kurang, jumlah_selisih_lebih, nilai_selisih_kurang }, baris: [...], pengajuan: { id, nomor, status } | null }`.

### 7.11 Pengajuan dan pengesahan pengurangan stok
| Metode & jalur | Peran | Keterangan |
|---|---|---|
| `POST /pengajuan-pengurangan` | SG | Header `Idempotency-Key` wajib |
| `GET /pengajuan-pengurangan` | SG (milik sendiri), A, P | `?status=&alasan=`. Item: `{ id, nomor, alasan, status, diajukan_oleh: { id, nama_lengkap }, diajukan_pada, jumlah_baris, nilai_total }`, `nilai_total = Σ jumlah_diajukan × harga_beli_satuan`. Urut `diajukan_pada` menurun |
| `GET /pengajuan-pengurangan/{id}` | SG (milik sendiri), A, P | + `baris: [{ id, batch_id, barang: {id,kode,nama,satuan}, nomor_batch, tanggal_kedaluwarsa, stok_saat_ini, jumlah_diajukan, jumlah_disetujui, harga_beli_satuan, keterangan }]`, `lampiran_id`, `pemasok`, `opname_id`, data keputusan (`diputuskan_oleh`, `diputuskan_pada`, `alasan_keputusan`) |
| `POST /pengajuan-pengurangan/{id}/putuskan` | A | Lihat di bawah |

Badan `POST /pengajuan-pengurangan`: `{ alasan: "kedaluwarsa"|"rusak"|"retur_pbf", pemasok_id?, lampiran_id?, baris: [{ batch_id, jumlah, keterangan? }] }` (alasan `selisih_opname` TIDAK boleh dikirim klien; dibuat otomatis oleh opname).
Aturan:
1. `baris` 1-50, `batch_id` tidak ganda, milik apotek.
2. `jumlah` (≥ 1) ≤ stok batch saat ini, jika tidak 422 `JUMLAH_MELEBIHI_STOK` (detail: indeks baris + stok).
3. `kedaluwarsa`: tiap batch wajib `tanggal_kedaluwarsa < hari ini`, jika tidak 422 `ALASAN_TIDAK_SESUAI` (detail: indeks baris).
4. `kedaluwarsa` dan `rusak`: `lampiran_id` **wajib** (`jenis = bukti_pengurangan`) → 422 `LAMPIRAN_WAJIB`. `retur_pbf`: `pemasok_id` wajib (aktif), lampiran opsional.
5. Efek: insert pengajuan `menunggu` (`diajukan_pada = Jam.sekarang()`), baris (`harga_beli_satuan` dari batch), notifikasi `pengajuan_menunggu` ke semua APA aktif, audit. **Stok dan jurnal TIDAK berubah** pada tahap ini.

Badan `POST .../putuskan`: `{ keputusan: "setuju"|"tolak"|"kembalikan", alasan?, baris?: [{ baris_id, jumlah_disetujui }] }`.
Urutan pemeriksaan:
1. Pengajuan harus berstatus `menunggu`, jika tidak 409 `STATUS_TIDAK_VALID`.
2. Pengesah (`pengguna.id`) tidak boleh sama dengan `diajukan_oleh` → 403 `PENGESAH_SAMA_DENGAN_PENGAJU` (diaudit sebagai gagal).
3. `tolak` dan `kembalikan`: `alasan` wajib (≥ 5 karakter) → status `ditolak`/`dikembalikan`; tanpa perubahan stok/jurnal; set `diputuskan_*`, `alasan_keputusan`.
4. `setuju`: bila `baris` tidak dikirim → semua `jumlah_disetujui = jumlah_diajukan`. Bila dikirim harus mencakup **semua** baris pengajuan, tiap `0 ≤ jumlah_disetujui ≤ jumlah_diajukan`, minimal satu > 0; bila ada yang lebih kecil dari yang diajukan, `alasan` wajib (422 `KETERANGAN_WAJIB`). Kunci batch terkait `FOR UPDATE`; bila stok batch < `jumlah_disetujui` → 422 `STOK_BERUBAH` (detail: `[{ baris_id, stok_sekarang }]`), **tidak ada perubahan apa pun** (status tetap `menunggu`; APA lalu boleh memakai `kembalikan`). Bila lolos: kurangi stok, `mutasi_stok` (negatif, jenis `pengurangan`), jurnal otomatis (8.3), status `disahkan`.
5. Semua keputusan mengirim notifikasi `pengajuan_diputuskan` ke pengaju dan menulis audit.
`dikembalikan` adalah status akhir; pengaju membuat pengajuan baru bila perlu.

### 7.12 Near-expired dan notifikasi
| Metode & jalur | Peran | Keterangan |
|---|---|---|
| `GET /near-expired` | SG, A, P | `?batas_hari=` (1-365, bawaan dari pengaturan). `{ batas_hari, tanggal, mendekati: [...], sudah_kedaluwarsa: [...], ringkasan: { jumlah_batch_mendekati, jumlah_batch_kedaluwarsa, nilai_berisiko } }`. Item: `{ batch_id, barang: {id,kode,nama,satuan}, nomor_batch, tanggal_kedaluwarsa, sisa_hari, stok, nilai }`. `sisa_hari = tanggal_kedaluwarsa − hari ini` (hari). `mendekati`: stok > 0 dan `0 ≤ sisa_hari ≤ batas_hari`, urut `sisa_hari` naik. `sudah_kedaluwarsa`: stok > 0 dan `sisa_hari < 0`, urut kedaluwarsa tertua. `nilai = stok × harga_beli`; `nilai_berisiko` = jumlah `nilai` kedua kelompok |
| `GET /pemeriksaan-near-expired` | SG, A, P | riwayat berhalaman dari `pemeriksaan_near_expired` |
| `GET /notifikasi` | Semua | `?belum_dibaca=true` milik sendiri, terbaru dulu. Item: `{ id, jenis, judul, isi, tautan_tipe, tautan_id, dibaca_pada, dibuat_pada }` |
| `POST /notifikasi/{id}/dibaca` · `POST /notifikasi/dibaca-semua` | Semua | 204 |

### 7.13 Akuntansi (hanya P)
| Metode & jalur | Keterangan |
|---|---|
| `GET /akun` | 18 akun: `{ kode, nama, tipe, saldo_normal, aktif }` |
| `POST /saldo-awal` | Lihat di bawah |
| `POST /jurnal-manual` | Lihat di bawah |
| `GET /jurnal` | `?periode=YYYY-MM&jenis=` berhalaman; item `{ id, nomor, tanggal, jenis, subjenis, keterangan, total }` |
| `GET /jurnal/{id}` | + `baris: [{ akun_kode, akun_nama, debit, kredit }]`, `dibuat_oleh` |
| `GET /periode` | Daftar periode dari bulan jurnal pertama sampai bulan berjalan: `{ periode, status: "terbuka"\|"ditutup", ditutup_pada }` (bulan tanpa baris dianggap `terbuka`) |
| `POST /periode/{periode}/tutup` | Lihat 8.7 |
| `GET /laporan-keuangan/neraca-saldo` · `/laba-rugi` · `/neraca` | `?periode=YYYY-MM` (wajib). Bentuk dan rumus: 8.6 |
| `GET /laporan-keuangan/buku-besar` | `?periode=YYYY-MM&akun_kode=` (wajib) |

**`POST /saldo-awal`** `{ tanggal, akun: [{ kode, saldo }], stok: [{ barang_id, nomor_batch, tanggal_kedaluwarsa, jumlah, harga_beli }] }`.
- Hanya boleh bila apotek **belum punya jurnal sama sekali**, jika tidak 409 `SALDO_AWAL_TIDAK_DAPAT`. `tanggal` ≤ hari ini.
- `akun[].kode` hanya `1110, 1120, 1141, 1210, 1211, 2110, 2120`; `saldo` ≥ 0, kode tidak ganda. `stok` boleh kosong; `jumlah` ≥ 1; **tanggal kedaluwarsa lampau diizinkan** (stok lama); pasangan (`barang_id`, `nomor_batch`) tidak ganda.
- Server membuat batch + `mutasi_stok` (jenis `saldo_awal`) dan **satu** jurnal `saldo_awal` (nomor `JU-...`) berisi: debit akun bersaldo normal debit, kredit akun bersaldo normal kredit, debit `1140` = Σ(`jumlah × harga_beli`), dan kredit `3110` Modal = (total sisi debit − total sisi kredit lainnya). Bila Modal < 0 → 422 `SALDO_AWAL_TIDAK_VALID`. Jurnal ini adalah pencatatan **saldo pembuka**, bukan transaksi.

**`POST /jurnal-manual`** `{ tanggal, jenis, keterangan, baris: [{ akun_kode, debit, kredit }] }`; `jenis` ∈ `bayar_utang`, `beban`, `prive`, `peralatan`, `penyesuaian`. Aturan:
- Minimal 2 baris; tiap baris tepat satu sisi > 0; total debit = total kredit (jika tidak 422 `JURNAL_TIDAK_SEIMBANG`); `tanggal` ≤ hari ini dan periodenya `terbuka` (jika tidak 409 `PERIODE_DITUTUP`); akun harus ada dan aktif.
- Akun yang diizinkan per jenis (selain itu 422 `AKUN_DILARANG`):

| jenis | Boleh di debit | Boleh di kredit |
|---|---|---|
| `bayar_utang` | 2110, 2120 | 1110, 1120 |
| `beban` | 5210, 5220 | 1110, 1120, 2120 |
| `prive` | 3120 | 1110, 1120 |
| `peralatan` | 1210 | 1110, 1120, 2110 |
| `penyesuaian` | 5130, 5210, 5220, 5240 | 1141, 1211, 2120 |

- Disimpan: `jurnal.jenis = penyesuaian` bila jenis `penyesuaian`; selain itu `jurnal.jenis = manual` dan `subjenis` = jenis. Akun 1140, 4110, 5110, 5120 **tidak pernah** boleh dijurnal manual.

### 7.14 Laporan operasional dan bulanan
| Metode & jalur | Peran | Keterangan |
|---|---|---|
| `GET /laporan/omzet` | A, P | `?dari=&sampai=&kelompok=hari\|bulan` (bawaan 30 hari terakhir, `hari`) → baris `{ periode, jumlah_transaksi, omzet, hpp, laba_kotor, tunai, qris, transfer }` + `total` |
| `GET /laporan/margin-kategori` | A, P | `?dari=&sampai=` → `[{ kategori: "generik"\|"paten", penjualan, hpp, laba_kotor, persen_margin }]`; `persen_margin = laba_kotor × 100 / penjualan`, dibulatkan 1 desimal (setengah ke atas), 0 bila penjualan 0 |
| `GET /laporan/fast-slow` | A, P | `?dari=&sampai=` (bawaan 90 hari terakhir) → aturan 8.9 |
| `GET /laporan/defekta` | SG, A, P | aturan 8.8 |
| `GET /laporan/golongan-khusus` | A, P | `?periode=YYYY-MM&format=json\|csv` aturan 8.10 |
| `GET /laporan-bulanan` | P | `?apotek_id=` (bawaan apotek sendiri; aturan 6.4) → daftar `{ periode, status, diterbitkan_pada }` |
| `GET /laporan-bulanan/{periode}` | P | `?apotek_id=` → `{ periode, status, diterbitkan_pada, isi }` (isi: 9.2) |

### 7.15 Audit dan pantau
- `GET /jejak-audit` (P): `?dari=&sampai=&aksi=&pengguna_id=&hasil=` berhalaman, terbaru dulu. Item: `{ id, waktu, pengguna: {id,nama_lengkap}|null, aksi, entitas, entitas_id, hasil, kode_galat, detail }`.
- `GET /pantau/apotek` (P): `[{ id, kode, nama, sendiri: boolean }]` — apotek sendiri + yang ada di `akses_pantau`.

---

## 8. Aturan bisnis dan akuntansi

### 8.0 Aturan stok (WAJIB)
- Stok per batch (`batch_barang.stok`) hanya berubah lewat lima operasi: **penjualan** (kurang), **penerimaan barang** (tambah), **saldo awal** (tambah), **pengesahan pengurangan** (kurang), dan tidak ada yang lain. Opname tidak pernah mengubah stok langsung; selisih lebih tidak mengubah stok; penambahan stok hanya lewat penerimaan atau saldo awal.
- Batch **kedaluwarsa** bila `tanggal_kedaluwarsa < hari ini` (WIB); pada hari kedaluwarsa itu sendiri masih boleh dijual. Batch kedaluwarsa tidak pernah dijual dan tidak dihitung di `stok_total`.
- Setiap perubahan stok menulis `mutasi_stok` dalam transaksi yang sama.
- Hari ini = tanggal `Jam.sekarang()` dalam WIB.

### 8.1 Jurnal otomatis penjualan (satu jurnal, `jenis = penjualan`)
Keterangan: `Penjualan {nomor}`; `tanggal` = tanggal WIB dari `penjualan.waktu`.
| Akun | Debit | Kredit |
|---|---|---|
| 1110 Kas (bila tunai) atau 1120 Bank & QRIS (bila qris/transfer) | total | |
| 4110 Penjualan | | total |
| 5110 Harga Pokok Penjualan | total_hpp | |
| 1140 Persediaan | | total_hpp |
Dua baris terakhir dilewati bila `total_hpp = 0`. Debit kas = **total** (bukan uang diterima).

### 8.2 Jurnal otomatis penerimaan (`jenis = penerimaan`)
Debit 1140 Persediaan = total faktur; kredit 2110 Utang Usaha = total faktur. Keterangan `Penerimaan {nomor} faktur {nomor_faktur}`. Pelunasan utang dicatat manual (`POST /jurnal-manual`, jenis `bayar_utang`).

### 8.3 Jurnal otomatis pengurangan (`jenis = pengurangan`), saat pengajuan disahkan
`nilai = Σ (jumlah_disetujui × harga_beli_satuan)`; kredit 1140 Persediaan = nilai; debit menurut alasan:
| alasan | akun debit |
|---|---|
| `kedaluwarsa` | 5130 Kerugian Kedaluwarsa |
| `rusak` | 5120 Selisih Persediaan |
| `selisih_opname` | 5120 Selisih Persediaan |
| `retur_pbf` | 2110 Utang Usaha |
`tanggal` = tanggal WIB saat pengesahan. Keterangan `Pengurangan {nomor} ({alasan})`.

### 8.4 Penomoran dan tanggal pembukuan jurnal
Nomor `JU-YYYYMM-NNNNN` mengikuti 4.12, bulan menurut `tanggal` jurnal. Jurnal otomatis memakai tanggal WIB dari waktu server saat diproses (**bukan** waktu perangkat), sehingga transaksi tertunda yang baru terkirim masuk ke periode saat diproses.

### 8.5 Penelusuran saldo
`net(akun, himpunan jurnal) = Σ debit − Σ kredit`. "Jumlah bertanda sisi normal" = `net` bila saldo normal debit, `−net` bila kredit.

### 8.6 Laporan keuangan (hanya P, apotek sendiri)
Semua nilai integer rupiah; akun bersaldo nol tidak ditampilkan.
- **neraca-saldo** `?periode=P`: himpunan jurnal = semua jurnal bertanggal ≤ akhir bulan P **kecuali** jurnal `penutup` berperiode P. Per akun: `net > 0` → kolom debit = net; `net < 0` → kolom kredit = −net. Respons `{ periode, status_periode, baris: [{ akun_kode, akun_nama, debit, kredit }], total_debit, total_kredit }` (keduanya harus sama).
- **laba-rugi** `?periode=P`: jurnal berperiode P selain `penutup`; akun tipe pendapatan dan beban, jumlah = bertanda sisi normal. Respons `{ periode, pendapatan: [{akun_kode, akun_nama, jumlah}], total_pendapatan, beban: [...], total_beban, laba_kotor, laba_bersih }`; `laba_kotor = total_pendapatan − jumlah akun 5110`; `laba_bersih = total_pendapatan − total_beban` (boleh negatif = rugi).
- **neraca** `?periode=P`: semua jurnal ≤ akhir bulan P (termasuk penutup P bila sudah ada). `aset`: jumlah = `net` (akun kontra seperti 1141 dan 1211 otomatis negatif); `kewajiban`: jumlah = `−net`; `ekuitas`: jumlah = `−net` per akun (Prive 3120 tampil negatif), ditambah satu baris `{ akun_kode: null, akun_nama: "Laba Berjalan", jumlah }` dengan `jumlah = Σ(−net)` seluruh akun pendapatan dan beban (nol bila sudah ditutup). Respons `{ periode, aset, total_aset, kewajiban, total_kewajiban, ekuitas, total_ekuitas, seimbang }`, `seimbang = total_aset == total_kewajiban + total_ekuitas` (WAJIB selalu `true`).
- **buku-besar** `?periode=P&akun_kode=`: `saldo_awal` = jumlah bertanda sisi normal atas jurnal bertanggal sebelum awal bulan P; `baris` = baris jurnal akun itu pada jurnal berperiode P (semua jenis), urut `tanggal`, `jurnal.id`, `baris_jurnal.id`, tiap baris `{ tanggal, nomor_jurnal, keterangan, debit, kredit, saldo }` (saldo berjalan bertanda sisi normal); `saldo_akhir`.

### 8.7 Tutup periode (`POST /periode/{periode}/tutup`, P)
Prasyarat (urut, galat → tanpa perubahan):
1. `periode` berformat `YYYY-MM` dan **lebih awal** dari bulan berjalan WIB → jika tidak 422 `PERIODE_BELUM_BERAKHIR`.
2. Belum ditutup → jika sudah 409 `PERIODE_SUDAH_DITUTUP`.
3. Setiap bulan dari bulan jurnal pertama apotek sampai bulan sebelum `periode` sudah `ditutup` (bulan tanpa jurnal harus ditutup juga) → jika tidak 422 `PERIODE_SEBELUMNYA_BELUM_DITUTUP` (detail: periode pertama yang belum).

Proses (satu transaksi). Tanggal semua jurnal penutup = hari terakhir bulan `periode`; `jenis = penutup`; dibuat berurutan; jurnal yang jumlahnya nol dilewati:
1. **Tutup pendapatan**: debit tiap akun pendapatan bersaldo (jumlah sisi normal), kredit 3130 sebesar totalnya.
2. **Tutup beban**: debit 3130 sebesar total beban, kredit tiap akun beban bersaldo.
3. **Tutup ikhtisar ke modal**: laba (3130 kredit bersih) → debit 3130, kredit 3110. Bila rugi → debit 3110, kredit 3130.
4. **Tutup prive**: debit 3110, kredit 3120 sebesar saldo Prive.
Dasar saldo = jurnal berperiode `periode` selain `penutup` (bulan sebelumnya sudah nol karena sudah ditutup). Lalu: buat/ubah baris `periode_akuntansi` menjadi `ditutup` (`ditutup_oleh`, `ditutup_pada`), audit `periode.tutup`. Jurnal penutup disisipkan **sebelum** status diubah (trigger 5.3 mengizinkan `penutup` pada periode berstatus apa pun).

### 8.8 Defekta
Barang `aktif`, `stok_minimum > 0`, dan `stok_total <= stok_minimum`. Item `{ barang_id, kode, nama, satuan, stok_total, stok_minimum, jumlah_kurang, pemasok_utama: { id, nama } | null }`, `jumlah_kurang = stok_minimum − stok_total`; urut `jumlah_kurang` menurun lalu nama. Filter `defekta=true` pada `GET /barang` memakai aturan yang sama.

### 8.9 Fast / slow moving
Rentang `dari`-`sampai` (tanggal WIB inklusif; bawaan 90 hari terakhir sampai hari ini). Himpunan = seluruh barang `aktif`. `jumlah_terjual` = Σ `baris_penjualan.jumlah` pada rentang. Urutkan menurun menurut `jumlah_terjual`, imbang → `kode` naik. `n` = jumlah barang; `k = ceil(n × 0,2)`. **fast** = `k` teratas yang `jumlah_terjual > 0`; **slow** = `k` terbawah (termasuk yang nol) yang tidak termasuk fast; sisanya "sedang". Respons `{ dari, sampai, fast: [...], slow: [...], jumlah_sedang }`, item `{ barang_id, kode, nama, satuan, jumlah_terjual, stok_total }`.

### 8.10 Mutasi golongan khusus
Barang bergolongan `narkotika`, `psikotropika`, `prekursor`. Untuk periode `P` (bulan WIB) per barang, dari `mutasi_stok`: `stok_awal` = Σ jumlah sebelum awal bulan; `masuk` = Σ jumlah positif dalam bulan (jenis `penerimaan` dan `saldo_awal`); `keluar_penjualan` = −Σ jenis `penjualan` dalam bulan; `keluar_pengurangan` = −Σ jenis `pengurangan` dalam bulan; `stok_akhir = stok_awal + masuk − keluar_penjualan − keluar_pengurangan`. Tampilkan hanya barang yang salah satu angkanya bukan nol. JSON: `{ periode, catatan: "Bukan format resmi Dinkes/BPOM", baris: [...] }`. CSV (`format=csv`): UTF-8 dengan BOM, pemisah koma, akhir baris `\r\n`, kolom `kode,nama,golongan,satuan,stok_awal,masuk,keluar_penjualan,keluar_pengurangan,stok_akhir`, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="golongan-khusus-YYYY-MM.csv"`.

---

## 9. Penjadwal (proses `worker`, satu instans)

### 9.1 Jadwal dan aturan umum
Zona waktu Asia/Jakarta, `node-cron`:
| Waktu | Job |
|---|---|
| 06:00 setiap hari | `nearExpired` untuk semua apotek `aktif` |
| 06:30 setiap hari | `laporanBulanan` untuk semua apotek `aktif` |
| 02:00 setiap hari | `bersih`: hapus `sesi_login` yang `kedaluwarsa_pada` lebih dari 7 hari lalu; hapus `notifikasi` yang `dibaca_pada` lebih dari 90 hari lalu |
Saat worker **mulai**, jalankan `nearExpired` dan `laporanBulanan` sekali segera (catch-up). Tiap job memakai `pg_try_advisory_lock` (kunci per nama job) agar tidak berjalan ganda. Tiap apotek diproses di transaksi sendiri (`withApotek`); gagal pada satu apotek tidak menghentikan yang lain; kegagalan menulis audit `job.gagal` (hasil `gagal`, `kode_galat`). Seluruh job **idempoten**.

### 9.2 Job `nearExpired` (per apotek)
1. **Terlewat**: bila ada `pemeriksaan_near_expired` terakhir bertanggal L dan L < hari ini − 1, sisipkan baris `{ tanggal: D, jumlah_batch: 0, status: terlewat, terlambat: true }` untuk tiap tanggal D antara L+1 dan hari ini−1 (maks 7 tanggal terakhir). Tanpa pemeriksaan sebelumnya: tidak ada pengisian ulang.
2. Bila baris hari ini sudah `terkirim` → selesai. Bila `belum_terkirim` → langsung ke langkah 5 (coba kirim lagi).
3. Hitung daftar seperti `GET /near-expired` (batas dari pengaturan apotek).
4. Sisipkan baris hari ini: `jumlah_batch` = jumlah `mendekati`, `jumlah_sudah_kedaluwarsa`, `status = belum_terkirim`, `terlambat = true` bila jam sekarang > 06:30 WIB. **Bila `mendekati` dan `sudah_kedaluwarsa` keduanya kosong**: status `terkirim`, tanpa notifikasi (hasil nol tetap tercatat), selesai.
5. Kirim notifikasi `near_expired` ke setiap pengguna aktif berperan `staf_gudang` dan `pemilik`: judul `Peringatan kedaluwarsa`, isi `{N} batch mendekati kedaluwarsa (≤ {batas} hari), {M} batch sudah kedaluwarsa. Nilai berisiko Rp{nilai}.`, `tautan_tipe = near_expired`. Maksimal **3 percobaan** (jeda 1 dtk, 2 dtk). Berhasil → `terkirim`. Gagal tiga kali → tetap `belum_terkirim` dan audit `near_expired.kirim` gagal.
6. Job **tidak** mengubah stok dan tidak membuat jurnal.

### 9.3 Job `laporanBulanan` (per apotek)
`P` = bulan sebelum bulan berjalan (WIB). Jalankan hanya bila tanggal hari ini ≥ `pengaturan.laporan_bulanan_tanggal`.
1. Bila `laporan_bulanan` untuk `P` berstatus `terbit` → selesai.
2. Bila periode `P` belum `ditutup`: kirim notifikasi `periode_belum_ditutup` ke semua `pemilik` apotek itu (lewati bila sudah ada notifikasi jenis itu untuk apotek itu dibuat hari ini), lalu selesai (job harian berikutnya mengulang).
3. Bila baris laporan belum ada: susun `isi` (9.4) lalu sisipkan dengan status `tersimpan`. Gagal simpan → audit gagal, selesai (diulang esok hari).
4. Terbitkan: kirim notifikasi `laporan_bulanan_terbit` ke semua `pemilik` apotek itu **dan** semua pengguna yang punya `akses_pantau` ke apotek itu. Notifikasi disimpan dengan `apotek_id` = apotek **milik penerima** (gunakan `withApotek` apotek penerima). Maksimal 3 percobaan (jeda 1 dtk, 2 dtk). Berhasil → status `terbit`, `diterbitkan_pada`. Gagal tiga kali → status `belum_terkirim`, tambah `percobaan_kirim`, audit gagal; job harian berikutnya mencoba lagi dari langkah 4.
5. Job hanya membaca data transaksi; tidak mengubah stok dan tidak membuat jurnal.

### 9.4 Isi laporan bulanan (JSON `isi`)
Hanya lima komponen yang diminta KADIN (tanpa data keuangan internal):
```json
{ "periode": "2026-11", "apotek": { "kode": "BKS01", "nama": "..." },
  "omzet": { "total": 0, "jumlah_transaksi": 0, "per_cara_bayar": { "tunai": 0, "qris": 0, "transfer": 0 } },
  "margin_kategori": [ { "kategori": "generik", "penjualan": 0, "hpp": 0, "laba_kotor": 0, "persen_margin": 0.0 },
                       { "kategori": "paten",   "penjualan": 0, "hpp": 0, "laba_kotor": 0, "persen_margin": 0.0 } ],
  "fast_slow": { "fast": [], "slow": [] },
  "near_expired": { "batas_hari": 90, "mendekati": [], "sudah_kedaluwarsa": [] },
  "defekta": [] }
```
`fast`/`slow` maksimum 20 item masing-masing (aturan 8.9 atas seluruh bulan P). `near_expired` dan `defekta` = keadaan saat laporan disusun. Bulan tanpa transaksi: semua angka 0 dan daftar kosong (tetap diterbitkan).

---

## 10. Aplikasi mobile (Flutter, Android)

### 10.1 Dasar
- Struktur `mobile/lib/`: `app/` (router, tema), `inti/` (klien API, sesi, drift, antrean, format, printer), `fitur/{auth,penjualan,penerimaan,opname,pengajuan,near_expired,laporan,keuangan,master,pengguna,notifikasi,pengaturan,antrean}/`. Tiap fitur: `data/` (repositori), `domain/` (model), `tampilan/` (layar, widget), state dengan Riverpod.
- URL API dari `--dart-define=API_BASE_URL=...` (bawaan `http://10.0.2.2:3000/api/v1`). Timeout: sambung 10 dtk, terima 15 dtk.
- Izin Android: `INTERNET`, `CAMERA`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`; `minSdk 26`; orientasi potret terkunci; teks mengikuti skala sistem (uji pada 1,3×).
- Aplikasi **tidak pernah** menghitung ulang aturan bisnis yang menentukan uang/stok (FEFO, HPP, jurnal). Ia hanya menampilkan hasil server. Pengecualian: estimasi total saat offline (10.4).

### 10.2 Sesi
- `token_akses` dan `token_segar` disimpan di `flutter_secure_storage`. Interceptor `dio`: pasang `Authorization`; bila 401 `TOKEN_TIDAK_VALID`, lakukan **satu** penyegaran bersama (single-flight) lewat `/auth/segarkan`, ulangi permintaan sekali; gagal → hapus sesi, kembali ke layar Masuk (antrean lokal tetap disimpan, pengirimannya ditunda sampai masuk lagi sebagai pengguna yang sama).
- Setelah masuk bila `wajib_ganti_sandi = true` → hanya layar **Ganti Kata Sandi** yang bisa diakses.
- Galat jaringan (tanpa respons HTTP) dibedakan dari galat HTTP; dasar keputusan antrean (10.4).

### 10.3 Navigasi per peran (bilah bawah 64 px, maks 4 tab; sisanya di tab "Lainnya")
| Peran | Tab | Isi "Lainnya" |
|---|---|---|
| Kasir | Penjualan · Riwayat · Antrean · Akun | , |
| Staf Gudang | Penerimaan · Opname · Pengajuan · Lainnya | Stok & Barang, Pemasok, Near-expired, Defekta, Antrean, Notifikasi, Akun |
| Apoteker | Pengesahan · Near-expired · Laporan · Lainnya | Stok, Notifikasi, Akun |
| Pemilik | Beranda · Laporan · Keuangan · Lainnya | Pengguna, Pengaturan, Barang, Pemasok, Saldo Awal, Jurnal Manual, Tutup Periode, Jejak Audit, Apotek Pantau, Notifikasi, Akun |
Label peran di layar: Kasir, Staf Gudang, **Apoteker**, Pemilik. Notifikasi diambil dengan polling `GET /notifikasi?belum_dibaca=true` tiap 60 detik saat aplikasi di latar depan; jumlahnya tampil sebagai angka pada ikon lonceng di bilah atas.

### 10.4 Transaksi tertunda (offline) dan antrean
Tabel drift `antrean`: `id`, `pengguna_id`, `jenis` (`penjualan`|`penerimaan`|`opname`|`pengajuan`), `kunci_idempoten` (UUID), `payload_json`, `lampiran_path` (nullable), `lampiran_jenis` (nullable), `lampiran_id_server` (nullable), `status` (`tertunda`|`mengirim`|`gagal`), `kode_galat`, `pesan_galat`, `percobaan`, `dibuat_pada`.

Aturan:
1. Kunci idempotensi dibuat **sekali** saat pengguna membuka formulir transaksi baru dan dipakai ulang pada setiap percobaan simpan transaksi itu.
2. Saat **Simpan**: bila permintaan gagal **tanpa respons HTTP** (tak ada koneksi/timeout 15 dtk) → masukkan ke antrean berstatus `tertunda`, tampilkan `Transaksi tertunda. Akan dikirim otomatis saat tersambung.` dan jangan ubah stok/total lokal. Respons HTTP 5xx → tampilkan `Gagal menyimpan. Coba lagi.`, **pertahankan isian**, tidak masuk antrean. Respons 4xx → tampilkan pesan galat (bagian 11), pertahankan isian.
3. Yang boleh masuk antrean: penjualan **tunai**, penerimaan, opname, pengajuan. Penjualan QRIS/transfer butuh koneksi: bila offline tampilkan `Pembayaran QRIS/transfer membutuhkan koneksi internet.` dan tidak menyimpan.
4. Penjualan tertunda menyediakan tombol **Cetak Bukti Sementara** (isi: barang, jumlah, total, tulisan `BUKTI SEMENTARA - BUKAN STRUK RESMI`). Tidak ada nomor transaksi sampai terkirim.
5. **Pengirim antrean** berjalan: saat koneksi kembali, saat aplikasi dibuka kembali, dan tiap 30 detik di latar depan bila ada antrean; satu per satu, urut `dibuat_pada` terlama. Header `Idempotency-Key` = kunci tersimpan. Untuk item berfoto: unggah `POST /lampiran` dulu, simpan `lampiran_id_server`, baru kirim transaksi (jangan unggah ulang bila sudah ada).
6. Hasil kirim: 201/200 → hapus dari antrean; galat jaringan → hentikan putaran, coba lagi dengan jeda 30, 60, 120 dtk (maks 5 menit); 401 → segarkan token, bila gagal jeda sampai masuk lagi; 5xx → ulangi maks 3 kali dengan jeda lalu `gagal` (`GALAT_INTERNAL`); 4xx (termasuk 422/409 selain replay) → status `gagal` dengan `kode_galat` dan pesan, **tidak diulang otomatis**.
7. Layar **Antrean**: daftar item (jenis, ringkasan, waktu, penanda status). Item `gagal` punya aksi **Coba Lagi** (kirim ulang dengan kunci sama) dan **Hapus** (dialog konfirmasi `Data transaksi ini akan dihapus dan tidak bisa dikembalikan.`). Angka pada tab Antrean = jumlah item `tertunda` + `gagal`.
8. **Keluar** saat ada antrean: dialog `Ada {n} transaksi belum terkirim.` dengan tombol `Batal` dan `Keluar dan Hapus Antrean`.
9. Cache barang lokal (drift): hasil `GET /barang?aktif=true` penuh, disegarkan saat masuk, tiap 10 menit di latar depan, dan tarik-segarkan. Dipakai untuk pencarian dan estimasi total saat offline; estimasi diberi label `Stok belum diperiksa (offline)`. Server tetap penentu saat dikirim.

### 10.5 Layar dan perilaku (ringkas, WAJIB semua ada)
| Layar | Peran | Endpoint | Perilaku penting |
|---|---|---|---|
| Masuk | publik | `/auth/masuk` | Isian username dan kata sandi (tombol teks `Tampilkan`), tombol `Masuk`. Galat tampil di pesan. `AKUN_TERKUNCI` menampilkan jam bisa mencoba lagi |
| Ganti Kata Sandi | Semua | `/auth/ganti-sandi` | Aturan sandi tampil sebagai teks bantu; sukses → kembali ke beranda peran |
| Penjualan | K | `/barang`, `/penjualan/pratinjau`, `/pembayaran-nontunai`, `/penjualan` | Lihat 10.6 |
| Riwayat Penjualan | K | `/penjualan`, `/penjualan/{id}/struk` | Daftar hari ini (milik sendiri), filter tanggal, detail, `Cetak Ulang Struk` |
| Penerimaan Barang | SG | `/pemasok`, `/penerimaan/cek-faktur`, `/penerimaan/periksa-baris`, `/lampiran`, `/penerimaan` | Pilih pemasok → isi nomor+tanggal faktur (cek duplikat saat keluar dari isian) → tambah baris (cari barang, `nomor_batch`, tanggal kedaluwarsa, jumlah, harga beli) → tampil `sisa masa kedaluwarsa` per baris → **foto faktur wajib** (kamera, dikompres maks sisi 1600 px, JPEG kualitas 80) → `Simpan Penerimaan`. Batch sudah ada: dialog `Batch sudah ada (stok {n}). Tambahkan ke batch ini?` → `Ya` (kirim `gabung_ke_batch_ada=true`) / `Ubah Nomor Batch` |
| Opname | SG | `/opname/daftar-batch`, `/opname` | Daftar batch **tanpa stok sistem**; isi jumlah fisik; penanda `Sudah dihitung`; `Selesai Menghitung` ditolak sampai semua terhitung; karena stok sistem tidak diketahui klien, selisih lebih baru ketahuan dari server: bila server membalas `KETERANGAN_WAJIB` (detail memuat batch terkait), tampilkan isian keterangan untuk batch itu lalu kirim ulang dengan **kunci idempotensi BARU** (isi permintaan berubah, kunci lama akan bentrok 409). Hasil menampilkan ringkasan dan status pengajuan `Menunggu pengesahan` |
| Pengajuan Pengurangan (buat) | SG | `/pengajuan-pengurangan`, `/barang/{id}/batch`, `/lampiran` | Alasan (Kedaluwarsa/Rusak/Retur ke PBF) → pilih batch (untuk Kedaluwarsa hanya yang sudah lewat) → jumlah+keterangan → foto bukti (wajib untuk Kedaluwarsa dan Rusak) → `Ajukan` |
| Daftar & Detail Pengajuan | SG, A, P | `/pengajuan-pengurangan` | Penanda status (10.8). A: detail punya `Setujui`, `Setujui Sebagian`, `Tolak`, `Kembalikan`; tolak/kembalikan/sebagian meminta alasan. Galat `STOK_BERUBAH` menampilkan stok sekarang dan menyarankan `Kembalikan` |
| Near-Expired | SG, A, P | `/near-expired` | Dua kelompok: Sudah Kedaluwarsa, Mendekati Kedaluwarsa; tiap baris: nama, batch, tanggal, sisa hari, stok, nilai; tombol `Ajukan Pengurangan` (hanya SG) membuka formulir pengajuan terisi |
| Defekta | SG, A, P | `/laporan/defekta` | Daftar barang kurang stok |
| Stok & Barang / Pemasok | SG, P (ubah); A, K (lihat barang) | `/barang`, `/pemasok` | Cari, tambah, ubah, nonaktifkan; detail barang menampilkan batch |
| Laporan | A, P | `/laporan/omzet`, `/margin-kategori`, `/fast-slow`, `/golongan-khusus` | Pilih rentang tanggal; tabel baris (14 px); `Unduh CSV` untuk golongan khusus (berkas disimpan lalu dibagikan lewat share sheet Android) |
| Beranda | P (juga ringkasan peran lain di tab pertama bila relevan) | `/ringkasan` | Kartu angka: omzet hari ini, transaksi, near-expired, pengajuan menunggu, defekta |
| Keuangan | P | `/laporan-keuangan/*`, `/periode` | Pilih periode; tab Neraca Saldo, Laba Rugi, Neraca; tabel baris; angka rata kanan |
| Saldo Awal | P | `/saldo-awal` | Hanya aktif bila belum ada jurnal; isi saldo akun + daftar stok awal; menampilkan Modal terhitung sebelum `Simpan Saldo Awal` |
| Jurnal Manual | P | `/jurnal-manual`, `/akun` | Pilih jenis → formulir sesuai tabel 7.13 (hanya akun yang diizinkan muncul) |
| Tutup Periode | P | `/periode`, `/periode/{p}/tutup` | Daftar periode; `Tutup Periode` dengan dialog konfirmasi; galat prasyarat tampil sebagai pesan |
| Pengguna | P | `/pengguna*` | Daftar, tambah, ubah peran, nonaktifkan/aktifkan, `Atur Ulang Kata Sandi` |
| Pengaturan | P | `/pengaturan` | Batas near-expired, tanggal laporan bulanan, kepala/kaki struk |
| Jejak Audit | P | `/jejak-audit` | Daftar berfilter |
| Apotek Pantau & Laporan Bulanan | P | `/pantau/apotek`, `/laporan-bulanan*` | Pilih apotek (bila ada akses pantau), lihat laporan bulanan |
| Notifikasi | Semua | `/notifikasi*` | Ketuk → tandai dibaca → buka tautan terkait |
| Akun | Semua | `/auth/saya`, `/auth/ganti-sandi`, `/auth/keluar` | Nama, peran, apotek, `Ganti Kata Sandi`, `Pilih Printer`, versi aplikasi, `Keluar` |

### 10.6 Layar Penjualan (kasir, satu tangan, berdiri)
Tata letak (lebar patokan 360 px):
1. Bilah atas 56 px: judul `Penjualan`, lonceng notifikasi.
2. Baris pencarian: isian `Cari obat atau pindai barcode` (tinggi 48) + tombol `Pindai` (ikon + teks, 48 px; `mobile_scanner`; hasil memanggil `GET /barang?barcode=`; tak ketemu → pesan `Barcode tidak dikenal.`).
3. Hasil pencarian: baris tinggi 48 (nama, satuan, harga, `Stok {n}`); ketuk = tambah 1 ke keranjang (sudah ada → jumlah +1).
4. Keranjang: tiap baris: nama; `−` `[jumlah]` `+` (target sentuh 48 px; jumlah bisa diketik); subtotal rata kanan; tombol teks `Hapus`. Setelah tiap perubahan (jeda 300 ms) panggil `/penjualan/pratinjau` bila online; baris berstatus selain `ok` diberi pesan di bawah baris (teks, bukan hanya warna): `Stok tidak cukup (sisa {n})`, `Semua batch kedaluwarsa`, `Barang nonaktif`.
5. Bilah bawah lengket di atas bilah navigasi: `Total` (24 px tebal) dan tombol `Bayar` (48 px, nonaktif bila keranjang kosong atau ada baris tidak `ok`).
6. Panel bawah **Pembayaran** (radius 8): pilihan `Tunai` | `QRIS` | `Transfer`.
   - **Tunai**: isian angka `Uang diterima` (format rupiah otomatis, papan angka), pilihan cepat `Uang pas`, `Rp50.000`, `Rp100.000`; `Kembalian` tampil 20 px tebal; kurang dari total → teks bahaya `Kurang Rp{n}` dan tombol nonaktif. Tombol `Simpan Penjualan` (label, tanpa ikon).
   - **QRIS/Transfer** (butuh koneksi): memanggil `POST /pembayaran-nontunai`; tampil QR dari `kode_bayar` (`qr_flutter`), hitung mundur `mm:ss` menuju `kedaluwarsa_pada`, penanda `Menunggu pembayaran`; polling `GET /pembayaran-nontunai/{id}` tiap 3 dtk; `dibayar` → otomatis `POST /penjualan`; `kedaluwarsa` → pesan + tombol `Buat Ulang Kode`; tombol `Ganti Cara Bayar`. Hanya pada build dengan `--dart-define=MODE_DEV=true` tampil tombol `Simulasi Bayar`.
   - Tombol simpan dinonaktifkan selama permintaan berjalan (cegah ketuk ganda).
7. Layar **Berhasil**: nomor transaksi, total, kembalian (besar), tombol `Cetak Struk` (utama) dan `Transaksi Baru`. Memuat ulang keranjang kosong dan kunci idempotensi baru.

### 10.7 Struk 58 mm dan printer
- Printer termal Bluetooth ESC/POS 58 mm, **32 karakter per baris**, ASCII saja (buang karakter non-ASCII). Printer dipilih di Akun → `Pilih Printer` (daftar perangkat yang sudah dipasangkan, simpan alamatnya). Tanpa printer: tombol `Cetak` nonaktif dengan teks `Printer belum dipilih`.
- Susunan: kepala (tengah, bungkus 32 kolom) · garis `-`×32 · `{nomor}` dan `{tanggal jam}` · `Kasir: {nama}` · garis · per barang: baris 1 nama (potong 32), baris 2 `{jumlah} x {harga}` rata kiri + subtotal rata kanan · garis · `TOTAL` rata kanan · `TUNAI`/`QRIS`/`TRANSFER` · `KEMBALI` (tunai) · garis · kaki (tengah).
- Antarmuka `IPencetak` (cetakStruk, cetakBuktiSementara) agar bisa diganti tiruan pada uji.

### 10.8 Sistem desain (token WAJIB dipakai, tanpa nilai warna/ukuran di dalam layar)
Buat `lib/app/token.dart` berisi konstanta berikut; seluruh komponen memakai token **peran** (kolom kanan), bukan tangga mentah.

| Token | Nilai |
|---|---|
| utama 50/100/200/300/400/500/600/700/800/900 | `#EAF0FA` `#D6E0F5` `#B0C3E8` `#85A0D6` `#557AC3` `#3359A3` `#1F3B73` `#1A3161` `#122549` `#0C1832` |
| netral 50/100/200/300/400/500/600/700/800/900 | `#F9F9FB` `#F0F1F5` `#E1E4EA` `#CBCFD8` `#8790A1` `#6A7181` `#515867` `#3A4150` `#232834` `#131720`; putih `#FFFFFF` |
| berhasil 600 / 50 | `#1B7A4B` / `#E6F4EC` |
| peringatan 700 / 50 | `#92400E` / `#FEF3C7` |
| bahaya 600 / 700 / 50 | `#C01F2E` / `#9A1B27` / `#FDECEE` |
| informasi 600 / 50 | `#0E7490` / `#E0F2F7` |

| Peran | Token |
|---|---|
| latar | putih; latar-halaman netral-50; latar-selang netral-100; latar-kepala-tabel netral-200; latar-terpilih utama-50; latar-nonaktif netral-100; lapisan-dialog `rgba(19,23,32,0.5)` |
| teks | teks netral-900; teks-sekunder netral-700; teks-bantu netral-600; teks-placeholder dan teks-nonaktif netral-500; teks-di-utama putih |
| aksi | aksi utama-600; aksi-ditekan utama-800; aksi-disorot dan fokus utama-500 |
| garis | garis-isian netral-400; garis-pemisah netral-200 |

Tipografi: **IBM Plex Sans** (sertakan berkas font 400/500/600/700 di `assets/fonts/`, lisensi SIL OFL; cadangan sistem sans). Ukuran/tinggi baris (px): ringkasan 32/40, judul 24/32, seksi 20/28, dasar 16/24, tabel 14/20, keterangan 12/16. Teks isi 16, tabel 14. Angka uang memakai digit tabular (`FontFeature.tabularFigures()`).

Jarak: jarak-1…6 = 4, 8, 12, 16, 20, 24 dan jarak-8 = 32. Ukuran: target-sentuh-min = tinggi-tombol = tinggi-isian = tinggi-baris-daftar = **48**; tinggi-kepala-tabel 40; tinggi-bilah-atas 56; tinggi-bilah-bawah 64; ukuran-ikon 24; lebar-layar-patokan 360. Sudut: radius-kecil 4 (tombol, isian, lencana), radius-sedang 8 (dialog, panel bawah). Garis: tebal-garis-1 = 1, tebal-garis-2 = 2 (fokus, isian salah, ikon), tebal-garis-ganda = 3 (baris jumlah), tebal-penanda-pesan = 4. Bayangan **hanya** untuk menu (`0 2 8 rgba(0,0,0,.12)`) dan dialog (`0 4 16 rgba(0,0,0,.16)`). Ikon: **Lucide** (garis, 24, tebal 2; paket Flutter `lucide_icons`).

Aturan visual: tombol Simpan dan tindakan akuntansi **tanpa ikon, wajib berlabel**; ikon status selalu disertai teks; DILARANG gradasi, animasi dekoratif, dan gaya promosi; informasi tidak boleh hanya mengandalkan warna.

Delapan komponen (dengan keadaan default, fokus, ditekan, salah, nonaktif sesuai token):
1. **Tombol** (utama = latar aksi + teks-di-utama; sekunder = garis-isian + teks; bahaya = latar bahaya-600), tinggi 48, radius 4.
2. **Isian teks** (tinggi 48, garis-isian 1 px; fokus garis aksi-disorot 2 px; salah garis bahaya-600 2 px + pesan teks di bawah).
3. **Isian angka** (rupiah: pemisah ribuan titik, awalan `Rp`, papan angka).
4. **Daftar pilihan** (baris 48, penanda terpilih latar-terpilih).
5. **Tabel data sebagai daftar baris** (baris ≥ 48, kepala 40 latar-kepala-tabel, angka rata kanan).
6. **Pesan** (4 jenis: berhasil, peringatan, bahaya, informasi; penanda kiri 4 px, ikon + teks).
7. **Kotak dialog** (radius 8, bayangan-dialog, tombol di bawah).
8. **Penanda status** (lencana radius 4, ikon + teks). Pemetaan: `tertunda` informasi; `gagal` bahaya; `menunggu` peringatan (`Menunggu pengesahan`); `disahkan` berhasil; `ditolak` bahaya; `dikembalikan` informasi; `mendekati` peringatan (`Mendekati kedaluwarsa`); `kedaluwarsa` bahaya; periode `terbuka` informasi, `ditutup` berhasil; laporan `terbit` berhasil, `belum_terkirim` peringatan.

Format: rupiah `Rp12.500` (negatif `-Rp1.000`), tanggal `19 Nov 2026`, jam `10:15`, locale `id_ID` (`intl`). Semua teks antarmuka Bahasa Indonesia; pesan galat server ditampilkan apa adanya dari `galat.pesan` bila tersedia, jika tidak dari tabel bagian 11.

---

## 11. Kode galat (nama, status HTTP, pesan bawaan Bahasa Indonesia)

| Kode | HTTP | Pesan bawaan |
|---|---|---|
| `VALIDASI_GAGAL` | 400 | Data yang dikirim tidak valid. |
| `TIDAK_TERAUTENTIKASI` | 401 | Silakan masuk terlebih dahulu. |
| `TOKEN_TIDAK_VALID` | 401 | Sesi tidak valid atau sudah berakhir. Silakan masuk lagi. |
| `KREDENSIAL_SALAH` | 401 | Username atau kata sandi salah. |
| `AKUN_NONAKTIF` | 401 | Akun tidak aktif. Hubungi pemilik apotek. |
| `AKUN_TERKUNCI` | 423 | Akun terkunci sementara karena terlalu banyak percobaan. Coba lagi nanti. |
| `WAJIB_GANTI_SANDI` | 403 | Anda harus mengganti kata sandi terlebih dahulu. |
| `DILARANG` | 403 | Anda tidak berhak melakukan tindakan ini. |
| `PENGESAH_SAMA_DENGAN_PENGAJU` | 403 | Pengesah tidak boleh sama dengan pengaju. |
| `TIDAK_DITEMUKAN` | 404 | Data tidak ditemukan. |
| `DUPLIKAT` | 409 | Data sudah ada. |
| `KUNCI_IDEMPOTEN_BENTROK` | 409 | Permintaan ini bertabrakan dengan permintaan sebelumnya. |
| `FAKTUR_SUDAH_ADA` | 409 | Nomor faktur ini sudah pernah dicatat. |
| `BATCH_SUDAH_ADA` | 409 | Nomor batch ini sudah ada untuk barang tersebut. |
| `PEMBAYARAN_SUDAH_DIPAKAI` | 409 | Pembayaran ini sudah dipakai untuk penjualan lain. |
| `STATUS_TIDAK_VALID` | 409 | Status pengajuan tidak memungkinkan tindakan ini. |
| `PERIODE_DITUTUP` | 409 | Periode ini sudah ditutup. |
| `PERIODE_SUDAH_DITUTUP` | 409 | Periode ini sudah ditutup sebelumnya. |
| `SALDO_AWAL_TIDAK_DAPAT` | 409 | Saldo awal hanya bisa dibuat sebelum ada jurnal. |
| `BARIS_DITOLAK` | 422 | Ada barang yang tidak bisa dijual. Periksa stok. |
| `UANG_KURANG` | 422 | Uang yang diterima kurang dari total. |
| `PEMBAYARAN_BELUM_DIBAYAR` | 422 | Pembayaran belum diterima. |
| `PEMBAYARAN_TIDAK_SESUAI` | 422 | Pembayaran tidak sesuai dengan total atau cara bayar. |
| `PEMBAYARAN_KEDALUWARSA` | 422 | Kode pembayaran sudah kedaluwarsa. |
| `TANGGAL_KEDALUWARSA_LEWAT` | 422 | Tanggal kedaluwarsa sudah lewat. |
| `BATCH_BEDA_DATA` | 422 | Batch sudah ada dengan tanggal kedaluwarsa atau harga beli berbeda. |
| `LAMPIRAN_WAJIB` | 422 | Foto lampiran wajib diunggah. |
| `JUMLAH_MELEBIHI_STOK` | 422 | Jumlah melebihi stok yang ada. |
| `ALASAN_TIDAK_SESUAI` | 422 | Alasan tidak sesuai dengan kondisi batch. |
| `TIDAK_ADA_BATCH` | 422 | Tidak ada batch berstok untuk dihitung. |
| `BATCH_BELUM_DIHITUNG` | 422 | Masih ada batch yang belum dihitung. |
| `KETERANGAN_WAJIB` | 422 | Keterangan wajib diisi. |
| `STOK_BERUBAH` | 422 | Stok berubah sejak pengajuan dibuat. |
| `JURNAL_TIDAK_SEIMBANG` | 422 | Total debit dan kredit tidak sama. |
| `AKUN_DILARANG` | 422 | Akun ini tidak boleh dipakai untuk jenis jurnal tersebut. |
| `SALDO_AWAL_TIDAK_VALID` | 422 | Saldo awal tidak valid (Modal tidak boleh negatif). |
| `PERIODE_BELUM_BERAKHIR` | 422 | Periode belum berakhir. |
| `PERIODE_SEBELUMNYA_BELUM_DITUTUP` | 422 | Tutup periode sebelumnya terlebih dahulu. |
| `TERLALU_BANYAK_PERMINTAAN` | 429 | Terlalu banyak permintaan. Coba lagi sebentar lagi. |
| `GALAT_INTERNAL` | 500 | Terjadi kesalahan pada server. |

---

## 12. Pengujian

### 12.1 Aturan
Backend memakai PostgreSQL sungguhan (`pos_apotek_test`), konteks aplikasi lewat peran `pos_app`. Tiap berkas uji mereset data (TRUNCATE ... RESTART IDENTITY CASCADE sebagai `pos_migrator`). Jam diatur lewat `Jam.atur(...)` pada uji. Cakupan baris minimal 80% pada `modul/*/layanan` dan `lib/`. **Semua uji di 12.2 dan 12.3 WAJIB ada dan lulus.**

### 12.2 Skenario akuntansi menyeluruh (`test/skenario/akuntansi.test.ts`)
Zona WIB. Satu apotek `UJI01`; pengguna: pemilik, apoteker, gudang, kasir. Master:

| Kode | Kategori | Golongan | Harga jual |
|---|---|---|---|
| A | generik | bebas | 10.000 |
| B | paten | bebas_terbatas | 20.000 |
| C | generik | bebas | 5.000 |
| D | generik | bebas | 4.000 |
| E | generik | bebas | 9.000 |
| F | paten | bebas | 15.000 |
Satu pemasok `PBF1`.

| # | Waktu | Aksi | Hasil yang diperiksa |
|---|---|---|---|
| 1 | 2026-11-02 08:05 | `POST /saldo-awal` tanggal 2026-11-02: akun 1110=8.000.000, 1210=12.000.000, 1211=2.400.000; stok: A `A-01` exp 2027-06-30 ×1000 @6.500; B `B-01` exp 2027-06-30 ×200 @13.500; C `C-01` exp 2026-10-31 ×100 @3.000; D `D-01` exp 2027-12-31 ×50 @2.000; E `E-01` exp 2028-01-31 ×1000 @5.400 | Persediaan 1140 = 15.000.000; Modal 3110 = 32.600.000; `stok_kedaluwarsa` C = 100; saldo awal kedua kali → 409 `SALDO_AWAL_TIDAK_DAPAT` |
| 2 | 2026-11-03 | Penerimaan faktur `INV-001` (2026-11-03) dari PBF1 dengan foto: F `F-01` exp 2028-06-30 ×600 @10.000 | Dr 1140 / Cr 2110 6.000.000; faktur sama lagi → 409 `FAKTUR_SUDAH_ADA` |
| 3 | 2026-11-05 | Penjualan tunai #1: A×600 uang 6.000.000. #2: A×400 uang 5.000.000 | #1 total 6.000.000 HPP 3.900.000; #2 total 4.000.000 HPP 2.600.000 kembalian 1.000.000; stok A = 0 |
| 4 | 2026-11-06 | Penjualan QRIS: B×200 (pembayaran nontunai 4.000.000, `simulasi-bayar`) | total 4.000.000 HPP 2.700.000 ke akun 1120; stok B = 0 |
| 5 | 2026-11-09 | Gudang mengajukan `kedaluwarsa` C-01 ×100 + bukti; Apoteker `setuju` | Dr 5130 / Cr 1140 300.000; stok C = 0 |
| 6 | 2026-11-10 | Opname: batch berstok D-01 (50), E-01 (1000), F-01 (600); fisik D=0, E=1000, F=600 | Pengajuan `selisih_opname` D ×50 `menunggu`, stok D masih 50; Apoteker `setuju` → Dr 5120 / Cr 1140 100.000; stok D = 0 |
| 7 | 2026-11-12 | Jurnal manual `bayar_utang`: Dr 2110 3.000.000 / Cr 1110 | |
| 8 | 2026-11-15 | `beban`: Dr 5210 600.000 / Cr 1110 | |
| 9 | 2026-11-16 | `beban`: Dr 5220 400.000 / Cr 1110 | |
| 10 | 2026-11-17 | `prive`: Dr 3120 1.000.000 / Cr 1110 | |
| 11 | 2026-11-30 | `penyesuaian`: Dr 5240 400.000 / Cr 1211; dan Dr 5210 900.000 / Cr 2120 | |

Pemeriksaan sebelum tutup periode 2026-11:
- Saldo: 1110 = 13.000.000; 1120 = 4.000.000; 1140 = 11.400.000; 1210 = 12.000.000; 1211 = 2.800.000 (kredit); 2110 = 3.000.000; 2120 = 900.000; 3110 = 32.600.000; 3120 = 1.000.000 (debit); 4110 = 14.000.000; 5110 = 9.200.000; 5120 = 100.000; 5130 = 300.000; 5210 = 1.500.000; 5220 = 400.000; 5240 = 400.000.
- **neraca-saldo**: total debit = total kredit = **53.300.000**.
- **laba-rugi**: pendapatan 14.000.000; laba_kotor 4.800.000; total_beban 11.900.000; **laba_bersih 2.100.000**.
- **neraca**: **total_aset 37.600.000**; kewajiban 3.900.000; ekuitas 33.700.000 (Modal 32.600.000, Prive −1.000.000, Laba Berjalan 2.100.000); `seimbang = true`.

| # | Waktu | Aksi | Hasil |
|---|---|---|---|
| 12 | 2026-12-02 | Tutup `2026-12` | 422 `PERIODE_BELUM_BERAKHIR` |
| 13 | 2026-12-02 | Tutup `2026-11` | Empat jurnal penutup (14.000.000; 11.900.000; 2.100.000; 1.000.000); periode `ditutup`; jurnal manual bertanggal 2026-11-20 → 409 `PERIODE_DITUTUP`; tutup lagi → 409 `PERIODE_SUDAH_DITUTUP` |
| 14 | 2026-12-02 | Neraca 2026-11 | Aset 37.600.000; kewajiban 3.900.000; **Modal 3110 = 33.700.000**; Prive 0; Laba Berjalan 0; `seimbang = true`. Laba-rugi 2026-11 tetap `laba_bersih 2.100.000`; neraca-saldo 2026-11 tetap 53.300.000 |
| 15 | 2026-12-03 06:30 | Jalankan job `laporanBulanan` | Laporan 2026-11 `terbit`; omzet total 14.000.000, 3 transaksi (tunai 10.000.000, qris 4.000.000, transfer 0); margin generik 10.000.000 / 6.500.000 / 3.500.000 / 35,0; paten 4.000.000 / 2.700.000 / 1.300.000 / 32,5; notifikasi `laporan_bulanan_terbit` untuk pemilik; job dijalankan lagi → tanpa duplikasi |

Akhir skenario, periksa **semua invarian 5.5** (khususnya: saldo 1140 = Σ(stok × harga_beli) = **11.400.000**; stok E 1000, F 600, lainnya 0).

### 12.3 Uji wajib lain (backend)
- **Auth**: masuk sukses; sandi salah → 401 (nama pengguna tak ada: pesan sama); lima kegagalan → 423 dan tetap 423 walau sandi benar; penyegaran memutar token; token yang sudah diputar dipakai lagi → seluruh keluarga dicabut; ganti sandi mencabut sesi lain; `wajib_ganti_sandi` memblokir endpoint lain; pengguna dinonaktifkan langsung ditolak pada permintaan berikutnya (token akses masih berlaku); batas laju masuk.
- **Pengguna**: hanya P; tidak bisa membuat/mengubah/menonaktifkan akun pemilik atau diri sendiri; username ganda lintas apotek → 409; pengguna apotek lain → 404; ubah peran mencabut sesi.
- **Isolasi (RLS)**: apotek B tidak bisa membaca/mengubah data apotek A lewat satu pun endpoint (uji sapuan: panggil setiap GET `/{id}` dengan id apotek A memakai token B → 404); kueri langsung sebagai `pos_app` tanpa konteks → nol baris; pantau: akses hanya ke apotek di `akses_pantau`.
- **UC-01**: FEFO lintas dua batch (kedaluwarsa lebih awal habis dulu, HPP campuran benar); batch kedaluwarsa dilewati; `BARIS_DITOLAK` (`stok_tidak_cukup`, `semua_batch_kedaluwarsa`, `barang_nonaktif`); `UANG_KURANG`; nontunai belum dibayar/kedaluwarsa/jumlah beda/sudah dipakai; kasir tidak melihat `total_hpp`/`harga_beli` dan tidak melihat penjualan orang lain; replay kunci → 200 tanpa efek ganda; kunci sama isi beda → 409; **gagal simpan di tengah transaksi** (suntik galat setelah stok berkurang) → rollback total (tanpa penjualan, stok kembali, tanpa jurnal) dan audit `gagal` tercatat; 20 penjualan paralel atas satu batch tidak pernah membuat stok negatif atau deadlock dan total terjual ≤ stok awal.
- **UC-05**: faktur ganda; tanggal kedaluwarsa lampau; batch ada → `BATCH_SUDAH_ADA`, lalu gabung `true` menambah stok; gabung dengan harga/tanggal beda → `BATCH_BEDA_DATA`; lampiran wajib dan tidak boleh dipakai dua kali; rollback; jurnal dan `mutasi_stok` benar.
- **UC-08/10/12**: daftar-batch tidak memuat stok; `BATCH_BELUM_DIHITUNG`; selisih lebih wajib keterangan dan tidak mengubah stok/jurnal; selisih kurang → pengajuan `menunggu` dan stok tetap; tanpa selisih → tanpa pengajuan; pengajuan kedaluwarsa pada batch belum lewat → `ALASAN_TIDAK_SESUAI`; `JUMLAH_MELEBIHI_STOK`; `LAMPIRAN_WAJIB`; retur_pbf → jurnal ke 2110; hanya APA yang bisa memutuskan; pengesah = pengaju → 403 (siapkan dengan mengubah peran langsung di basis data); `tolak`/`kembalikan` tanpa perubahan stok/jurnal; setuju sebagian wajib alasan; `STOK_BERUBAH` tanpa perubahan apa pun; status bukan `menunggu` → 409.
- **Akuntansi**: jurnal manual tak seimbang → 422; akun terlarang → 422; periode tertutup → 409; prasyarat tutup periode berurutan; `UPDATE`/`DELETE` pada `jurnal`, `baris_jurnal`, `jejak_audit`, `mutasi_stok` gagal.
- **UC-17/19 (job)**: hasil nol tercatat tanpa notifikasi; catch-up mengisi `terlewat`; kirim gagal tiga kali (suntik pengirim gagal) → `belum_terkirim` + audit, dicoba lagi pada putaran berikutnya; job dijalankan dua kali pada hari yang sama tidak menggandakan apa pun; laporan bulanan ditunda + notifikasi `periode_belum_ditutup` maksimal sekali per hari bila periode belum ditutup; laporan bulan tanpa transaksi tetap terbit (angka nol); pantau menerima notifikasi dan hanya bisa membaca laporan apotek yang diizinkan.
- **Laporan**: omzet, margin per kategori, fast/slow (termasuk pengikatan seri dan tanpa tumpang tindih), defekta, golongan khusus (JSON + CSV dengan BOM).
- **Idempotensi** keempat POST: kunci wajib (tanpa header → 400), replay 200, bentrok 409.

### 12.4 Uji mobile
- Unit: format rupiah/tanggal; mesin status antrean (enqueue hanya saat tanpa respons HTTP; 5xx tidak masuk antrean; 4xx → `gagal` tanpa ulang otomatis; backoff; urutan FIFO; unggah lampiran sekali); interceptor token (penyegaran tunggal untuk banyak 401 bersamaan); tata letak struk 32 kolom.
- Widget (repositori palsu): alur Penjualan tunai (tambah barang → bayar → kembalian → simpan → layar berhasil); status baris pratinjau `stok_tidak_cukup`; jalur offline → antrean + pesan tertunda; alur nontunai (menunggu → dibayar → tersimpan); formulir Opname tidak menampilkan stok sistem; dialog `Batch sudah ada`; navigasi per peran menampilkan tab yang benar; `flutter analyze` tanpa peringatan.

---

## 13. Fase kerja (berurutan; tiap fase selesai hanya bila ujinya lulus)

| Fase | Isi | Kriteria selesai |
|---|---|---|
| 0 | Kerangka repo; `docker-compose`; `docker/init.sql`; migrasi 0001-0003; pool, `withApotek`, `Jam`, galat, audit, penomoran; CLI `apotek:buat`; `/kesehatan`; Swagger; kerangka uji | Migrasi berjalan bersih di DB kosong; uji RLS tanpa konteks, hanya-sisip, dan invarian dasar lulus |
| 1 | Autentikasi, token, kunci akun, manajemen pengguna, pengaturan, notifikasi dasar, `/ringkasan` (kerangka), pantau, CLI `pantau:beri`/`seed:demo` | Semua uji Auth/Pengguna/Isolasi 12.3 lulus |
| 2 | Master barang/pemasok/batch, lampiran, `/akun`, saldo awal, mesin jurnal, jurnal manual, periode, tutup periode, laporan keuangan | Uji akuntansi 12.3 lulus; langkah 1 dan 7-14 skenario 12.2 lulus memakai data tiruan untuk stok/penjualan yang belum ada |
| 3 | Pembayaran nontunai (tiruan + webhook), penjualan (pratinjau, simpan, struk), penerimaan | Uji UC-01 dan UC-05 lulus; langkah 2-4 skenario lulus |
| 4 | Opname, pengajuan, pengesahan, `/near-expired`, defekta | Uji UC-08/10/12 lulus; langkah 5-6 lulus |
| 5 | Laporan operasional, golongan khusus, laporan bulanan, worker + job, `/ringkasan` lengkap, jejak audit | **Seluruh skenario 12.2 dan semua uji 12.3 lulus**; laporan cakupan tercetak |
| 6 | Aplikasi mobile: fondasi (token desain, tema, klien API, sesi, drift), Penjualan + antrean + struk, lalu Penerimaan, Opname, Pengajuan, Near-expired, Notifikasi, lalu Laporan, Keuangan, Master, Pengguna, Pengaturan | Uji 12.4 lulus; `flutter analyze` bersih; `flutter build apk --debug` berhasil |
| 7 | Pengerasan: Dockerfile `api`/`worker`, README (setup, env, cara membuat apotek, cara menjalankan, daftar akun demo), tinjauan keamanan (bagian 4.14, 6, RLS), uji beban ringan (50 permintaan paralel `POST /penjualan` pada satu batch: tanpa stok negatif/deadlock), lulus ulang seluruh uji | Semua uji hijau pada eksekusi bersih dari awal; `README.md` memuat langkah yang benar-benar sudah dicoba |

Bila tidak ada emulator/perangkat untuk uji manual mobile, nyatakan itu apa adanya di ringkasan fase 6 dan 7; jangan mengklaim sudah dicoba di perangkat.

## 14. Definisi selesai (global)
- Seluruh endpoint bagian 7 ada, terdokumentasi di OpenAPI, dan lolos uji.
- Seluruh layar bagian 10.5 ada dan memakai token bagian 10.8.
- Tidak ada fitur dari 2.4 yang terbawa. Tidak ada rahasia di repositori.
- `CATATAN-KEPUTUSAN.md` mencatat setiap pertentangan atau celah yang kamu temukan dan keputusanmu.
- Skenario akuntansi 12.2 menghasilkan **laba bersih Rp2.100.000, total aset Rp37.600.000, modal akhir Rp33.700.000**.

## 15. Larangan ringkas
Penjualan kredit, piutang, BPJS, diskon, pajak, resep, pembatalan penjualan, retur pelanggan, push notification, iOS, antarmuka web; float untuk uang; logika bisnis di lapisan UI atau di pengendali HTTP (taruh di `layanan`); mengubah/menghapus jurnal, `mutasi_stok`, atau jejak audit; kueri tanpa `withApotek` pada tabel ber-RLS; menggunakan `new Date()` langsung; menambah endpoint/tabel di luar dokumen ini; mengklaim hasil yang belum dijalankan.

**Mulai sekarang dengan Fase 0.**
