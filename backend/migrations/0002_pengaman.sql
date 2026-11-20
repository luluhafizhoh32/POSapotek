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
