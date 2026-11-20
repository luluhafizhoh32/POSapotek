import { DateTime } from 'luxon';

export const ZONA_BISNIS = 'Asia/Jakarta';

let _jamOverride: DateTime | null = null;

export const Jam = {
  /**
   * Mengembalikan DateTime saat ini dalam zona bisnis Asia/Jakarta (WIB).
   */
  sekarang(): DateTime {
    if (_jamOverride) {
      return _jamOverride;
    }
    if (process.env['NODE_ENV'] === 'test' && process.env['JAM_UJI']) {
      const parsed = DateTime.fromISO(process.env['JAM_UJI'], { zone: ZONA_BISNIS });
      if (parsed.isValid) {
        return parsed;
      }
    }
    return DateTime.now().setZone(ZONA_BISNIS);
  },

  /**
   * Tanggal bisnis hari ini dalam format YYYY-MM-DD (WIB).
   */
  hariIniWib(): string {
    return this.sekarang().toFormat('yyyy-MM-dd');
  },

  /**
   * Periode bisnis bulan berjalan dalam format YYYY-MM (WIB).
   */
  periodeSekarangWib(): string {
    return this.sekarang().toFormat('yyyy-MM');
  },

  /**
   * Format DateTime atau Date menjadi ISO 8601 dengan offset +07:00.
   */
  keIsoWib(waktu: DateTime | Date | string): string {
    if (typeof waktu === 'string') {
      return DateTime.fromISO(waktu, { zone: ZONA_BISNIS }).toISO() ?? waktu;
    }
    if (waktu instanceof Date) {
      return DateTime.fromJSDate(waktu, { zone: ZONA_BISNIS }).toISO() ?? waktu.toISOString();
    }
    return waktu.setZone(ZONA_BISNIS).toISO() ?? '';
  },

  /**
   * Format tanggal saja (YYYY-MM-DD) dalam zona WIB.
   */
  keTanggalWib(waktu: DateTime | Date | string): string {
    if (typeof waktu === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(waktu)) return waktu;
      return DateTime.fromISO(waktu, { zone: ZONA_BISNIS }).toFormat('yyyy-MM-dd');
    }
    if (waktu instanceof Date) {
      return DateTime.fromJSDate(waktu, { zone: ZONA_BISNIS }).toFormat('yyyy-MM-dd');
    }
    return waktu.setZone(ZONA_BISNIS).toFormat('yyyy-MM-dd');
  },

  /**
   * Hanya untuk pengujian: mengatur waktu tetap.
   */
  atur(isoAtauDate: string | Date | DateTime): void {
    if (process.env['NODE_ENV'] !== 'test') {
      throw new Error('Jam.atur hanya boleh dipanggil saat NODE_ENV=test');
    }
    if (typeof isoAtauDate === 'string') {
      const dt = DateTime.fromISO(isoAtauDate, { zone: ZONA_BISNIS });
      if (!dt.isValid) throw new Error(`Format waktu Jam.atur tidak valid: ${isoAtauDate}`);
      _jamOverride = dt;
    } else if (isoAtauDate instanceof Date) {
      _jamOverride = DateTime.fromJSDate(isoAtauDate, { zone: ZONA_BISNIS });
    } else {
      _jamOverride = isoAtauDate.setZone(ZONA_BISNIS);
    }
  },

  reset(): void {
    _jamOverride = null;
  },
};
