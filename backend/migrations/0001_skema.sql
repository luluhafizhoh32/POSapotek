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
