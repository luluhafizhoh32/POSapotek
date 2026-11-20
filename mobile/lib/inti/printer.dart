import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'format.dart';

class DataStruk {
  final String kepala;
  final String nomor;
  final String waktu;
  final String kasir;
  final List<({String nama, int jumlah, int hargaSatuan, int subtotal})> baris;
  final int total;
  final String caraBayar;
  final int? uangDiterima;
  final int? kembalian;
  final String kaki;

  const DataStruk({
    required this.kepala,
    required this.nomor,
    required this.waktu,
    required this.kasir,
    required this.baris,
    required this.total,
    required this.caraBayar,
    this.uangDiterima,
    this.kembalian,
    required this.kaki,
  });
}

abstract interface class IPencetak {
  Future<void> cetakStruk(DataStruk struk, String alamatMac);
  Future<void> cetakBuktiSementara({
    required List<({String nama, int jumlah, int hargaSatuan, int subtotal})> baris,
    required int total,
    required String alamatMac,
  });
}

/// Tata letak struk 58 mm, 32 karakter per baris, ASCII saja (Bagian 10.7).
class StrukFormatter {
  static const int lebar = 32;

  static String bersihkanAscii(String teks) {
    return teks.replaceAll(RegExp(r'[^\x20-\x7E]'), '');
  }

  static List<String> bungkusTengah(String teks) {
    final bersih = bersihkanAscii(teks.trim());
    if (bersih.isEmpty) return [];
    final hasil = <String>[];
    for (int i = 0; i < bersih.length; i += lebar) {
      final potong = bersih.substring(i, (i + lebar).clamp(0, bersih.length));
      final padKiri = ((lebar - potong.length) / 2).floor();
      hasil.add('${' ' * padKiri}$potong');
    }
    return hasil;
  }

  static String kiriKanan(String kiri, String kanan) {
    final k = bersihkanAscii(kiri);
    final kn = bersihkanAscii(kanan);
    final sisa = lebar - k.length - kn.length;
    if (sisa >= 1) {
      return '$k${' ' * sisa}$kn';
    }
    final maksKiri = (lebar - kn.length - 1).clamp(0, lebar);
    return '${k.substring(0, maksKiri)} $kn';
  }

  static List<String> susunStruk(DataStruk s) {
    final garis = '-' * lebar;
    final out = <String>[
      ...bungkusTengah(s.kepala),
      garis,
      bersihkanAscii(s.nomor),
      bersihkanAscii('${formatTanggal(s.waktu)} ${formatJam(s.waktu)}'),
      bersihkanAscii('Kasir: ${s.kasir}'),
      garis,
    ];

    for (final b in s.baris) {
      final nama = bersihkanAscii(b.nama);
      out.add(nama.length > lebar ? nama.substring(0, lebar) : nama);
      out.add(kiriKanan('${b.jumlah} x ${formatRupiah(b.hargaSatuan)}', formatRupiah(b.subtotal)));
    }

    out.add(garis);
    out.add(kiriKanan('TOTAL', formatRupiah(s.total)));
    final labelCara = s.caraBayar.toUpperCase();
    out.add(kiriKanan(labelCara, formatRupiah(s.uangDiterima ?? s.total)));
    if (s.caraBayar == 'tunai' && s.kembalian != null) {
      out.add(kiriKanan('KEMBALI', formatRupiah(s.kembalian!)));
    }
    out.add(garis);
    out.addAll(bungkusTengah(s.kaki));
    return out;
  }

  static List<String> susunBuktiSementara({
    required List<({String nama, int jumlah, int hargaSatuan, int subtotal})> baris,
    required int total,
  }) {
    final garis = '-' * lebar;
    final out = <String>[
      ...bungkusTengah('BUKTI SEMENTARA'),
      ...bungkusTengah('BUKAN STRUK RESMI'),
      garis,
    ];
    for (final b in baris) {
      final nama = bersihkanAscii(b.nama);
      out.add(nama.length > lebar ? nama.substring(0, lebar) : nama);
      out.add(kiriKanan('${b.jumlah} x ${formatRupiah(b.hargaSatuan)}', formatRupiah(b.subtotal)));
    }
    out.add(garis);
    out.add(kiriKanan('TOTAL', formatRupiah(total)));
    out.add(garis);
    return out;
  }
}

class PencetakBluetooth implements IPencetak {
  @override
  Future<void> cetakStruk(DataStruk struk, String alamatMac) async {
    await _cetakBaris(StrukFormatter.susunStruk(struk), alamatMac);
  }

  @override
  Future<void> cetakBuktiSementara({
    required List<({String nama, int jumlah, int hargaSatuan, int subtotal})> baris,
    required int total,
    required String alamatMac,
  }) async {
    await _cetakBaris(
      StrukFormatter.susunBuktiSementara(baris: baris, total: total),
      alamatMac,
    );
  }

  Future<void> _cetakBaris(List<String> lines, String alamatMac) async {
    final connected = await PrintBluetoothThermal.connect(macPrinterAddress: alamatMac);
    if (!connected) {
      throw Exception('Gagal menyambung ke printer Bluetooth.');
    }
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm58, profile);
    final bytes = <int>[];
    for (final l in lines) {
      bytes.addAll(generator.text(l));
    }
    bytes.addAll(generator.feed(2));
    await PrintBluetoothThermal.writeBytes(bytes);
  }
}
