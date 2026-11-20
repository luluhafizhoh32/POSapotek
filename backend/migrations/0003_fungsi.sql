CREATE FUNCTION apotek_dari_referensi(p_ref text) RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public AS
$$ SELECT apotek_id FROM pembayaran_nontunai WHERE referensi = p_ref $$;
GRANT EXECUTE ON FUNCTION apotek_dari_referensi(text) TO pos_app;
