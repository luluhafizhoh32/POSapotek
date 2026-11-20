export const BATAS_MIN_UANG = 0;
export const BATAS_MAKS_UANG = 9_999_999_999;

export function validasiUang(nilai: unknown): nilai is number {
  return (
    typeof nilai === 'number' &&
    Number.isInteger(nilai) &&
    Number.isSafeInteger(nilai) &&
    nilai >= BATAS_MIN_UANG &&
    nilai <= BATAS_MAKS_UANG
  );
}

export function keUangBulat(nilai: string | number | bigint): number {
  const angka = typeof nilai === 'bigint' ? Number(nilai) : Number(nilai);
  if (!Number.isSafeInteger(angka) || !Number.isInteger(angka)) {
    throw new Error(`Nilai uang tidak valid atau melebihi batas aman: ${String(nilai)}`);
  }
  return angka;
}

export function formatRupiah(nilai: number): string {
  const negatif = nilai < 0;
  const absolut = Math.abs(Math.trunc(nilai));
  const bagian = absolut.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negatif ? '-' : ''}Rp${bagian}`;
}
