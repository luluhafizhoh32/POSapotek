import { describe, it, expect } from 'vitest';
import { formatRupiah, keUangBulat, validasiUang } from '../../src/lib/uang.js';

describe('uang', () => {
  it('memvalidasi bilangan bulat rupiah dalam batas aman', () => {
    expect(validasiUang(0)).toBe(true);
    expect(validasiUang(12500)).toBe(true);
    expect(validasiUang(9_999_999_999)).toBe(true);
    expect(validasiUang(-1)).toBe(false);
    expect(validasiUang(12.5)).toBe(false);
    expect(validasiUang(10_000_000_000)).toBe(false);
  });

  it('mengkonversi bigint/string ke angka bulat aman', () => {
    expect(keUangBulat('32600000')).toBe(32_600_000);
    expect(keUangBulat(15000000n)).toBe(15_000_000);
  });

  it('memformat rupiah tanpa sen', () => {
    expect(formatRupiah(12500)).toBe('Rp12.500');
    expect(formatRupiah(-1000)).toBe('-Rp1.000');
    expect(formatRupiah(0)).toBe('Rp0');
  });
});
