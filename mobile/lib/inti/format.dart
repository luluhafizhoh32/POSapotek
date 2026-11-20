import 'package:intl/intl.dart';

String formatRibuan(int nilai) {
  final negatif = nilai < 0;
  final absStr = nilai.abs().toString();
  final buf = StringBuffer();
  for (int i = 0; i < absStr.length; i++) {
    if (i > 0 && (absStr.length - i) % 3 == 0) {
      buf.write('.');
    }
    buf.write(absStr[i]);
  }
  return negatif ? '-$buf' : buf.toString();
}

String formatRupiah(int nilai) {
  if (nilai < 0) {
    return '-Rp${formatRibuan(nilai.abs())}';
  }
  return 'Rp${formatRibuan(nilai)}';
}

int parseRupiahInput(String teks) {
  final digits = teks.replaceAll(RegExp(r'[^0-9]'), '');
  if (digits.isEmpty) return 0;
  return int.tryParse(digits) ?? 0;
}

String formatTanggal(dynamic nilai) {
  if (nilai == null) return '-';
  final dt = nilai is DateTime ? nilai : DateTime.tryParse(nilai.toString());
  if (dt == null) return nilai.toString();
  return DateFormat('d MMM yyyy', 'id_ID').format(dt.toLocal());
}

String formatJam(dynamic nilai) {
  if (nilai == null) return '-';
  final dt = nilai is DateTime ? nilai : DateTime.tryParse(nilai.toString());
  if (dt == null) return nilai.toString();
  return DateFormat('HH:mm', 'id_ID').format(dt.toLocal());
}

String formatTanggalJam(dynamic nilai) {
  if (nilai == null) return '-';
  final dt = nilai is DateTime ? nilai : DateTime.tryParse(nilai.toString());
  if (dt == null) return nilai.toString();
  return DateFormat('d MMM yyyy HH:mm', 'id_ID').format(dt.toLocal());
}
