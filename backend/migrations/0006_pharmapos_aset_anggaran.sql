-- Migrasi 0006: Aset Tetap, Penyusutan Bulanan, dan Anggaran Beban (PharmaPOS v2.1 SHOULD)

CREATE TABLE aset_tetap (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  kode text NOT NULL,
  nama text NOT NULL,
  tanggal_perolehan date NOT NULL,
  nilai_perolehan bigint NOT NULL CHECK (nilai_perolehan > 0),
  nilai_residu bigint NOT NULL DEFAULT 0 CHECK (nilai_residu >= 0 AND nilai_residu < nilai_perolehan),
  umur_manfaat_bulan int NOT NULL CHECK (umur_manfaat_bulan > 0),
  akumulasi_penyusutan bigint NOT NULL DEFAULT 0 CHECK (akumulasi_penyusutan >= 0),
  aktif boolean NOT NULL DEFAULT true,
  dibuat_oleh bigint NOT NULL REFERENCES pengguna(id),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apotek_id, kode)
);

CREATE TABLE penyusutan_bulanan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  aset_id bigint NOT NULL REFERENCES aset_tetap(id),
  periode text NOT NULL CHECK (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  nominal bigint NOT NULL CHECK (nominal > 0),
  jurnal_id bigint NOT NULL REFERENCES jurnal(id),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apotek_id, aset_id, periode)
);

CREATE TABLE anggaran_beban (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  periode text NOT NULL CHECK (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  akun_kode text NOT NULL,
  nominal_anggaran bigint NOT NULL CHECK (nominal_anggaran > 0),
  dibuat_oleh bigint NOT NULL REFERENCES pengguna(id),
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apotek_id, periode, akun_kode)
);

DO $$
DECLARE
  t text;
  tabel_baru text[] := ARRAY['aset_tetap', 'penyusutan_bulanan', 'anggaran_beban'];
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
