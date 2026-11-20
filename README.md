# Aplikasi POS Apotek KADIN Bengkalis

Sistem kasir dan manajemen stok apotek swasta UMKM binaan KADIN Bengkalis (Riau):
- **Backend REST API & Worker**: Node.js, TypeScript, Fastify, PostgreSQL 16/18 (SQL murni + RLS), `zod`, `argon2id`, `jose`, `node-cron`, `vitest`.
- **Aplikasi Mobile**: Flutter (Android, `minSdk 26`, potret, locale `id_ID`), Riverpod, `go_router`, `dio`, Drift (SQLite antrean offline), ESC/POS 58 mm.

---

## 1. Persiapan Basis Data PostgreSQL

1. Jalankan [docker/init.sql](docker/init.sql) sebagai superuser `postgres` untuk membuat peran `pos_migrator`, `pos_app`, serta basis data `pos_apotek` dan `pos_apotek_test`:
   ```bash
   psql -U postgres -f docker/init.sql
   ```
   (Atau gunakan `docker compose up -d postgres` jika menggunakan Docker.)
2. Salin `.env.example` menjadi `backend/.env`, lalu sesuaikan `DATABASE_URL`, `DATABASE_URL_MIGRATOR`, `JWT_SECRET` (minimal 32 karakter), dan `PEMBAYARAN_WEBHOOK_SECRET`.

---

## 2. Setup dan Menjalankan Backend

```bash
cd backend
npm install
npm run migrate
```

### Membuat Apotek Baru (CLI)
```bash
npm run apotek:buat -- --kode BKS01 --nama "Apotek Contoh" --alamat "Jl. Sudirman" --pemilik-username rina --pemilik-nama "Rina" --pemilik-sandi "Sementara1"
```

### Memberi Akses Pemantau KADIN
```bash
npm run pantau:beri -- --username rina --apotek-kode BKS02
```

### Mengisi Data Demo (Hanya Non-Production)
```bash
npm run seed:demo
```
Akun demo pada apotek `DEMO1` (kata sandi semua akun: `Demo12345`):
- `pemilik1` (Pemilik)
- `apoteker1` (Apoteker)
- `gudang1` (Staf Gudang)
- `kasir1` (Kasir)

### Menjalankan API & Worker
```bash
npm run dev       # Server API di http://localhost:3000 (Swagger: /dokumentasi)
npm run worker    # Penjadwal near-expired & laporan bulanan
```

### Pengujian Backend
```bash
npm run lint
npm test
```

---

## 3. Setup dan Menjalankan Aplikasi Mobile (Flutter Android)

```bash
cd mobile
flutter pub get
flutter analyze --no-fatal-infos
flutter test
flutter build apk --debug
```

Untuk menjalankan pada perangkat/emulator Android yang terhubung:
```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1 --dart-define=MODE_DEV=true
```
