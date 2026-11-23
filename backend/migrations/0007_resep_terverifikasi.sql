-- Migrasi 0007: Resep Terverifikasi Apoteker -> Antrean Siap Tebus di Kasir POS

CREATE TABLE resep_terverifikasi (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apotek_id bigint NOT NULL REFERENCES apotek(id),
  nomor_resep text NOT NULL,
  nama_dokter text NOT NULL,
  nama_pasien text NOT NULL,
  daftar_obat jsonb NOT NULL DEFAULT '[]'::jsonb,
  peringatan_ai jsonb NOT NULL DEFAULT '[]'::jsonb,
  catatan_klinis text,
  status text NOT NULL DEFAULT 'siap_ditebus' CHECK (status IN ('siap_ditebus', 'ditebus', 'batal')),
  diverifikasi_oleh bigint NOT NULL REFERENCES pengguna(id),
  diverifikasi_pada timestamptz NOT NULL DEFAULT now(),
  penjualan_id bigint REFERENCES penjualan(id),
  ditebus_pada timestamptz,
  UNIQUE (apotek_id, nomor_resep)
);

CREATE INDEX idx_resep_terverifikasi_apotek_status
  ON resep_terverifikasi (apotek_id, status, diverifikasi_pada DESC);

DO $$
BEGIN
  ALTER TABLE resep_terverifikasi ENABLE ROW LEVEL SECURITY;
  ALTER TABLE resep_terverifikasi FORCE ROW LEVEL SECURITY;
  CREATE POLICY resep_terverifikasi_rls_apotek ON resep_terverifikasi
    USING (apotek_id = nullif(current_setting('app.apotek_id', true), '')::bigint)
    WITH CHECK (apotek_id = nullif(current_setting('app.apotek_id', true), '')::bigint);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE resep_terverifikasi TO pos_app;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pos_app;
