-- Migrasi 0005: Fitur Inti PharmaPOS v2.1
-- 1. Resep penjualan (wajib untuk golongan khusus: narkotika, psikotropika, prekursor)
-- 2. Surat Pesanan (SP) dari Defekta dengan tanda tangan APA
-- 3. Utang Usaha (AP) subledger per pemasok & pembayaran sebagian/penuh

CREATE TABLE resep_penjualan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  penjualan_id bigint NOT NULL UNIQUE REFERENCES penjualan(id),
  nomor_resep text NOT NULL,
  tanggal_resep date NOT NULL,
  nama_dokter text NOT NULL,
  nama_pasien text NOT NULL,
  catatan text,
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resep_penjualan_apotek_idx ON resep_penjualan (apotek_id, tanggal_resep);

CREATE TABLE surat_pesanan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  nomor text NOT NULL,
  pemasok_id bigint NOT NULL REFERENCES pemasok(id),
  golongan text NOT NULL DEFAULT 'umum'
    CHECK (golongan IN ('umum','prekursor','psikotropika','narkotika')),
  status text NOT NULL DEFAULT 'draf'
    CHECK (status IN ('draf','menunggu_ttd','ditandatangani','dibagikan','terpenuhi')),
  catatan text,
  dibuat_oleh bigint NOT NULL REFERENCES pengguna(id),
  ditandatangani_oleh bigint REFERENCES pengguna(id),
  ditandatangani_pada timestamptz,
  dibagikan_pada timestamptz,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apotek_id, nomor)
);
CREATE INDEX surat_pesanan_apotek_idx ON surat_pesanan (apotek_id, status);

CREATE TABLE baris_surat_pesanan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  surat_pesanan_id bigint NOT NULL REFERENCES surat_pesanan(id) ON DELETE CASCADE,
  barang_id bigint NOT NULL REFERENCES barang(id),
  jumlah int NOT NULL CHECK (jumlah > 0),
  satuan text NOT NULL
);

CREATE TABLE utang_pemasok (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  pemasok_id bigint NOT NULL REFERENCES pemasok(id),
  nomor_faktur text NOT NULL,
  tanggal_faktur date NOT NULL,
  jatuh_tempo date NOT NULL,
  total bigint NOT NULL CHECK (total > 0),
  terbayar bigint NOT NULL DEFAULT 0 CHECK (terbayar >= 0 AND terbayar <= total),
  status text NOT NULL DEFAULT 'belum' CHECK (status IN ('belum','sebagian','lunas')),
  dibuat_oleh bigint NOT NULL REFERENCES pengguna(id),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apotek_id, pemasok_id, nomor_faktur)
);
CREATE INDEX utang_pemasok_apotek_idx ON utang_pemasok (apotek_id, status, jatuh_tempo);

CREATE TABLE pembayaran_utang (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  utang_id bigint NOT NULL REFERENCES utang_pemasok(id),
  tanggal date NOT NULL,
  jumlah bigint NOT NULL CHECK (jumlah > 0),
  akun_bayar_kode text NOT NULL CHECK (akun_bayar_kode IN ('1110','1120')),
  referensi text,
  jurnal_id bigint REFERENCES jurnal(id),
  dibuat_oleh bigint NOT NULL REFERENCES pengguna(id),
  dibuat_pada timestamptz NOT NULL DEFAULT now()
);

-- RLS & Hak Akses pos_app
DO $$
DECLARE
  t text;
  tabel_baru text[] := ARRAY[
    'resep_penjualan',
    'surat_pesanan',
    'baris_surat_pesanan',
    'utang_pemasok',
    'pembayaran_utang'
  ];
BEGIN
  FOREACH t IN ARRAY tabel_baru LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (apotek_id = nullif(current_setting(''app.apotek_id'', true), '''')::bigint) WITH CHECK (apotek_id = nullif(current_setting(''app.apotek_id'', true), '''')::bigint)',
      t || '_rls_apotek', t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO pos_app', t);
  END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pos_app;
