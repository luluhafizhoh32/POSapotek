import { describe, it, expect, afterEach } from 'vitest';
import { Jam } from '../../src/lib/jam.js';

describe('Jam', () => {
  afterEach(() => {
    Jam.reset();
  });

  it('menggunakan zona Asia/Jakarta dan dapat diatur saat NODE_ENV=test', () => {
    process.env['NODE_ENV'] = 'test';
    Jam.atur('2026-11-19T23:30:00+07:00');
    expect(Jam.hariIniWib()).toBe('2026-11-19');
    expect(Jam.periodeSekarangWib()).toBe('2026-11');
    expect(Jam.sekarang().zoneName).toBe('Asia/Jakarta');
  });

  it('mengkonversi UTC ke tanggal bisnis WIB dengan benar', () => {
    // 2026-11-19T18:00:00Z = 2026-11-20T01:00:00+07:00
    expect(Jam.keTanggalWib('2026-11-19T18:00:00Z')).toBe('2026-11-20');
  });
});
