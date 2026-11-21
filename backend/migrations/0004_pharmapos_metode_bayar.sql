-- Memperluas metode pembayaran non-tunai untuk mendukung 5 metode pembayaran PharmaPOS:
-- tunai, qris, debit, transfer, ewallet.

ALTER TABLE pembayaran_nontunai
  DROP CONSTRAINT IF EXISTS pembayaran_nontunai_cara_check;

ALTER TABLE pembayaran_nontunai
  ADD CONSTRAINT pembayaran_nontunai_cara_check
  CHECK (cara IN ('qris', 'debit', 'transfer', 'ewallet'));

ALTER TABLE penjualan
  DROP CONSTRAINT IF EXISTS penjualan_cara_bayar_check;

ALTER TABLE penjualan
  ADD CONSTRAINT penjualan_cara_bayar_check
  CHECK (cara_bayar IN ('tunai', 'qris', 'debit', 'transfer', 'ewallet'));
