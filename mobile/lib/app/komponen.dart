import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../inti/format.dart';
import 'token.dart';

enum JenisTombol { utama, sekunder, bahaya }

/// 1. Tombol (tinggi 48, radius 4)
class TombolPos extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final JenisTombol jenis;
  final IconData? ikon;
  final bool penuh;
  final bool memuat;

  const TombolPos({
    super.key,
    required this.label,
    required this.onPressed,
    this.jenis = JenisTombol.utama,
    this.ikon,
    this.penuh = true,
    this.memuat = false,
  });

  @override
  Widget build(BuildContext context) {
    final aktif = onPressed != null && !memuat;

    Color latar;
    Color warnaTeks;
    BorderSide? garis;

    switch (jenis) {
      case JenisTombol.utama:
        latar = aktif ? TokenAksi.utama : TokenLatar.nonaktif;
        warnaTeks = aktif ? TokenTeks.diUtama : TokenTeks.nonaktif;
        garis = null;
      case JenisTombol.sekunder:
        latar = aktif ? TokenLatar.latar : TokenLatar.nonaktif;
        warnaTeks = aktif ? TokenTeks.utama : TokenTeks.nonaktif;
        garis = BorderSide(
          color: aktif ? TokenGaris.isian : TokenGaris.pemisah,
          width: TokenGarisTebal.t1,
        );
      case JenisTombol.bahaya:
        latar = aktif ? TokenStatus.bahayaTeks : TokenLatar.nonaktif;
        warnaTeks = aktif ? TokenTeks.diUtama : TokenTeks.nonaktif;
        garis = null;
    }

    final child = memuat
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(warnaTeks),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (ikon != null) ...[
                Icon(ikon, size: TokenUkuran.ukuranIkon, color: warnaTeks),
                const SizedBox(width: TokenJarak.j2),
              ],
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TokenTipografi.dasar.copyWith(
                    color: warnaTeks,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          );

    return SizedBox(
      width: penuh ? double.infinity : null,
      height: TokenUkuran.tinggiTombol,
      child: ElevatedButton(
        onPressed: aktif ? onPressed : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: latar,
          disabledBackgroundColor: TokenLatar.nonaktif,
          foregroundColor: warnaTeks,
          elevation: 0,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(horizontal: TokenJarak.j4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(TokenRadius.kecil),
            side: garis ?? BorderSide.none,
          ),
        ),
        child: child,
      ),
    );
  }
}

/// 2. Isian teks (tinggi 48, garis-isian 1 px; fokus 2 px; salah bahaya-600 2 px + pesan)
class IsianTeksPos extends StatelessWidget {
  final TextEditingController? controller;
  final String label;
  final String? placeholder;
  final String? pesanSalah;
  final String? teksBantu;
  final bool sembunyikan;
  final Widget? akhiran;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onEditingComplete;
  final bool readOnly;
  final int maksBaris;

  const IsianTeksPos({
    super.key,
    this.controller,
    required this.label,
    this.placeholder,
    this.pesanSalah,
    this.teksBantu,
    this.sembunyikan = false,
    this.akhiran,
    this.keyboardType,
    this.inputFormatters,
    this.onChanged,
    this.onEditingComplete,
    this.readOnly = false,
    this.maksBaris = 1,
  });

  @override
  Widget build(BuildContext context) {
    final adaSalah = pesanSalah != null && pesanSalah!.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: TokenTipografi.tabel.copyWith(
            fontWeight: FontWeight.w600,
            color: TokenTeks.sekunder,
          ),
        ),
        const SizedBox(height: TokenJarak.j1),
        SizedBox(
          height: maksBaris == 1 ? TokenUkuran.tinggiIsian : null,
          child: TextField(
            controller: controller,
            obscureText: sembunyikan,
            keyboardType: keyboardType,
            inputFormatters: inputFormatters,
            onChanged: onChanged,
            onEditingComplete: onEditingComplete,
            readOnly: readOnly,
            maxLines: maksBaris,
            style: TokenTipografi.dasar,
            decoration: InputDecoration(
              hintText: placeholder,
              hintStyle:
                  TokenTipografi.dasar.copyWith(color: TokenTeks.placeholder),
              filled: true,
              fillColor: readOnly ? TokenLatar.nonaktif : TokenLatar.latar,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: TokenJarak.j3,
                vertical: TokenJarak.j2,
              ),
              suffixIcon: akhiran,
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(TokenRadius.kecil),
                borderSide: BorderSide(
                  color: adaSalah ? TokenStatus.bahayaTeks : TokenGaris.isian,
                  width: adaSalah ? TokenGarisTebal.t2 : TokenGarisTebal.t1,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(TokenRadius.kecil),
                borderSide: BorderSide(
                  color: adaSalah ? TokenStatus.bahayaTeks : TokenAksi.fokus,
                  width: TokenGarisTebal.t2,
                ),
              ),
            ),
          ),
        ),
        if (adaSalah) ...[
          const SizedBox(height: TokenJarak.j1),
          Text(
            pesanSalah!,
            style: TokenTipografi.keterangan
                .copyWith(color: TokenStatus.bahayaTeks),
          ),
        ] else if (teksBantu != null && teksBantu!.isNotEmpty) ...[
          const SizedBox(height: TokenJarak.j1),
          Text(teksBantu!, style: TokenTipografi.keterangan),
        ],
      ],
    );
  }
}

/// 3. Isian angka rupiah (pemisah ribuan titik, awalan Rp, papan angka)
class IsianRupiahPos extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? pesanSalah;
  final ValueChanged<int>? onChangedNominal;

  const IsianRupiahPos({
    super.key,
    required this.controller,
    required this.label,
    this.pesanSalah,
    this.onChangedNominal,
  });

  @override
  Widget build(BuildContext context) {
    final adaSalah = pesanSalah != null && pesanSalah!.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: TokenTipografi.tabel.copyWith(
            fontWeight: FontWeight.w600,
            color: TokenTeks.sekunder,
          ),
        ),
        const SizedBox(height: TokenJarak.j1),
        SizedBox(
          height: TokenUkuran.tinggiIsian,
          child: TextField(
            controller: controller,
            keyboardType: TextInputType.number,
            style: TokenTipografi.angkaTabular(TokenTipografi.dasar),
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              _FormatterRibuan(),
            ],
            onChanged: (teks) {
              if (onChangedNominal != null) {
                onChangedNominal!(parseRupiahInput(teks));
              }
            },
            decoration: InputDecoration(
              prefixText: 'Rp',
              prefixStyle: TokenTipografi.dasar.copyWith(
                color: TokenTeks.sekunder,
                fontWeight: FontWeight.w600,
              ),
              filled: true,
              fillColor: TokenLatar.latar,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: TokenJarak.j3,
                vertical: TokenJarak.j2,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(TokenRadius.kecil),
                borderSide: BorderSide(
                  color: adaSalah ? TokenStatus.bahayaTeks : TokenGaris.isian,
                  width: adaSalah ? TokenGarisTebal.t2 : TokenGarisTebal.t1,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(TokenRadius.kecil),
                borderSide: BorderSide(
                  color: adaSalah ? TokenStatus.bahayaTeks : TokenAksi.fokus,
                  width: TokenGarisTebal.t2,
                ),
              ),
            ),
          ),
        ),
        if (adaSalah) ...[
          const SizedBox(height: TokenJarak.j1),
          Text(
            pesanSalah!,
            style: TokenTipografi.keterangan
                .copyWith(color: TokenStatus.bahayaTeks),
          ),
        ],
      ],
    );
  }
}

class _FormatterRibuan extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.isEmpty) return const TextEditingValue();
    final angka = int.tryParse(digits) ?? 0;
    final formatted = formatRibuan(angka);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

/// 4. Daftar pilihan (baris 48, penanda terpilih latar-terpilih)
class DaftarPilihanPos<T> extends StatelessWidget {
  final String label;
  final T? nilai;
  final List<({T nilai, String teks})> opsi;
  final ValueChanged<T> onPilih;

  const DaftarPilihanPos({
    super.key,
    required this.label,
    required this.nilai,
    required this.opsi,
    required this.onPilih,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: TokenTipografi.tabel.copyWith(
            fontWeight: FontWeight.w600,
            color: TokenTeks.sekunder,
          ),
        ),
        const SizedBox(height: TokenJarak.j1),
        Container(
          decoration: BoxDecoration(
            color: TokenLatar.latar,
            border:
                Border.all(color: TokenGaris.isian, width: TokenGarisTebal.t1),
            borderRadius: BorderRadius.circular(TokenRadius.kecil),
          ),
          child: Column(
            children: opsi.map((o) {
              final terpilih = o.nilai == nilai;
              return InkWell(
                onTap: () => onPilih(o.nilai),
                child: Container(
                  height: TokenUkuran.tinggiBarisDaftar,
                  padding:
                      const EdgeInsets.symmetric(horizontal: TokenJarak.j3),
                  color: terpilih ? TokenLatar.terpilih : Colors.transparent,
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          o.teks,
                          style: TokenTipografi.dasar.copyWith(
                            fontWeight:
                                terpilih ? FontWeight.w600 : FontWeight.w400,
                          ),
                        ),
                      ),
                      if (terpilih)
                        const Icon(LucideIcons.check,
                            size: 20, color: TokenAksi.utama),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

/// 5. Tabel data sebagai daftar baris (baris >= 48, kepala 40 latar-kepala-tabel, angka rata kanan)
class TabelBarisPos extends StatelessWidget {
  final List<String> kepala;
  final List<List<String>> baris;
  final List<bool>? rataKanan;

  const TabelBarisPos({
    super.key,
    required this.kepala,
    required this.baris,
    this.rataKanan,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: TokenLatar.latar,
        border:
            Border.all(color: TokenGaris.pemisah, width: TokenGarisTebal.t1),
        borderRadius: BorderRadius.circular(TokenRadius.kecil),
      ),
      child: Column(
        children: [
          Container(
            height: TokenUkuran.tinggiKepalaTabel,
            color: TokenLatar.kepalaTabel,
            padding: const EdgeInsets.symmetric(horizontal: TokenJarak.j3),
            child: Row(
              children: List.generate(kepala.length, (i) {
                final kanan = rataKanan != null && i < rataKanan!.length
                    ? rataKanan![i]
                    : false;
                return Expanded(
                  child: Text(
                    kepala[i],
                    textAlign: kanan ? TextAlign.right : TextAlign.left,
                    style: TokenTipografi.tabel
                        .copyWith(fontWeight: FontWeight.w600),
                  ),
                );
              }),
            ),
          ),
          ...List.generate(baris.length, (idx) {
            final row = baris[idx];
            return Container(
              constraints: const BoxConstraints(
                  minHeight: TokenUkuran.tinggiBarisDaftar),
              padding: const EdgeInsets.symmetric(
                horizontal: TokenJarak.j3,
                vertical: TokenJarak.j2,
              ),
              decoration: BoxDecoration(
                color: idx.isOdd ? TokenLatar.selang : TokenLatar.latar,
                border: const Border(
                  top: BorderSide(
                      color: TokenGaris.pemisah, width: TokenGarisTebal.t1),
                ),
              ),
              child: Row(
                children: List.generate(row.length, (i) {
                  final kanan = rataKanan != null && i < rataKanan!.length
                      ? rataKanan![i]
                      : false;
                  return Expanded(
                    child: Text(
                      row[i],
                      textAlign: kanan ? TextAlign.right : TextAlign.left,
                      style: kanan
                          ? TokenTipografi.angkaTabular(TokenTipografi.tabel)
                          : TokenTipografi.tabel,
                    ),
                  );
                }),
              ),
            );
          }),
        ],
      ),
    );
  }
}

enum JenisPesan { berhasil, peringatan, bahaya, informasi }

/// 6. Pesan (4 jenis, penanda kiri 4 px, ikon + teks)
class PesanPos extends StatelessWidget {
  final JenisPesan jenis;
  final String teks;

  const PesanPos({super.key, required this.jenis, required this.teks});

  @override
  Widget build(BuildContext context) {
    final (Color warnaTeks, Color warnaLatar, IconData ikon) = switch (jenis) {
      JenisPesan.berhasil => (
          TokenStatus.berhasilTeks,
          TokenStatus.berhasilLatar,
          LucideIcons.checkCircle2
        ),
      JenisPesan.peringatan => (
          TokenStatus.peringatanTeks,
          TokenStatus.peringatanLatar,
          LucideIcons.alertTriangle
        ),
      JenisPesan.bahaya => (
          TokenStatus.bahayaTeks,
          TokenStatus.bahayaLatar,
          LucideIcons.alertCircle
        ),
      JenisPesan.informasi => (
          TokenStatus.informasiTeks,
          TokenStatus.informasiLatar,
          LucideIcons.info
        ),
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(TokenJarak.j3),
      decoration: BoxDecoration(
        color: warnaLatar,
        border: Border(
          left:
              BorderSide(color: warnaTeks, width: TokenGarisTebal.penandaPesan),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(ikon, size: TokenUkuran.ukuranIkon, color: warnaTeks),
          const SizedBox(width: TokenJarak.j2),
          Expanded(
            child: Text(
              teks,
              style: TokenTipografi.tabel
                  .copyWith(color: warnaTeks, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

/// 7. Kotak dialog (radius 8, bayangan-dialog, tombol di bawah)
Future<T?> tampilkanDialogPos<T>({
  required BuildContext context,
  required String judul,
  required Widget isi,
  required List<Widget> tombol,
}) {
  return showDialog<T>(
    context: context,
    barrierColor: TokenLatar.lapisanDialog,
    builder: (ctx) => Dialog(
      backgroundColor: TokenLatar.latar,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(TokenRadius.sedang),
      ),
      child: Container(
        padding: const EdgeInsets.all(TokenJarak.j4),
        decoration: BoxDecoration(
          color: TokenLatar.latar,
          borderRadius: BorderRadius.circular(TokenRadius.sedang),
          boxShadow: TokenBayangan.dialog,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(judul, style: TokenTipografi.seksi),
            const SizedBox(height: TokenJarak.j3),
            isi,
            const SizedBox(height: TokenJarak.j4),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: tombol
                  .map((w) => Padding(
                        padding: const EdgeInsets.only(left: TokenJarak.j2),
                        child: w,
                      ))
                  .toList(),
            ),
          ],
        ),
      ),
    ),
  );
}

/// 8. Penanda status (lencana radius 4, ikon + teks)
class LencanaStatusPos extends StatelessWidget {
  final String status;

  const LencanaStatusPos({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (String label, Color warnaTeks, Color warnaLatar, IconData ikon) =
        switch (status) {
      'tertunda' => (
          'Tertunda',
          TokenStatus.informasiTeks,
          TokenStatus.informasiLatar,
          LucideIcons.clock
        ),
      'mengirim' => (
          'Mengirim',
          TokenStatus.informasiTeks,
          TokenStatus.informasiLatar,
          LucideIcons.upload
        ),
      'gagal' => (
          'Gagal',
          TokenStatus.bahayaTeks,
          TokenStatus.bahayaLatar,
          LucideIcons.xCircle
        ),
      'menunggu' => (
          'Menunggu pengesahan',
          TokenStatus.peringatanTeks,
          TokenStatus.peringatanLatar,
          LucideIcons.clock
        ),
      'disahkan' => (
          'Disahkan',
          TokenStatus.berhasilTeks,
          TokenStatus.berhasilLatar,
          LucideIcons.checkCircle2
        ),
      'ditolak' => (
          'Ditolak',
          TokenStatus.bahayaTeks,
          TokenStatus.bahayaLatar,
          LucideIcons.xCircle
        ),
      'dikembalikan' => (
          'Dikembalikan',
          TokenStatus.informasiTeks,
          TokenStatus.informasiLatar,
          LucideIcons.rotateCcw
        ),
      'mendekati' => (
          'Mendekati kedaluwarsa',
          TokenStatus.peringatanTeks,
          TokenStatus.peringatanLatar,
          LucideIcons.alertTriangle
        ),
      'kedaluwarsa' => (
          'Kedaluwarsa',
          TokenStatus.bahayaTeks,
          TokenStatus.bahayaLatar,
          LucideIcons.alertCircle
        ),
      'terbuka' => (
          'Terbuka',
          TokenStatus.informasiTeks,
          TokenStatus.informasiLatar,
          LucideIcons.unlock
        ),
      'ditutup' => (
          'Ditutup',
          TokenStatus.berhasilTeks,
          TokenStatus.berhasilLatar,
          LucideIcons.lock
        ),
      'terbit' => (
          'Terbit',
          TokenStatus.berhasilTeks,
          TokenStatus.berhasilLatar,
          LucideIcons.checkCircle2
        ),
      'belum_terkirim' => (
          'Belum terkirim',
          TokenStatus.peringatanTeks,
          TokenStatus.peringatanLatar,
          LucideIcons.alertTriangle
        ),
      _ => (status, TokenTeks.sekunder, TokenLatar.selang, LucideIcons.info),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: TokenJarak.j2, vertical: TokenJarak.j1),
      decoration: BoxDecoration(
        color: warnaLatar,
        borderRadius: BorderRadius.circular(TokenRadius.kecil),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(ikon, size: 16, color: warnaTeks),
          const SizedBox(width: TokenJarak.j1),
          Text(
            label,
            style: TokenTipografi.keterangan.copyWith(
              color: warnaTeks,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
