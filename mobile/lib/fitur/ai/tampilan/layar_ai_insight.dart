import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/klien_api.dart';

class LayarAiInsight extends ConsumerStatefulWidget {
  const LayarAiInsight({super.key});

  @override
  ConsumerState<LayarAiInsight> createState() => _LayarAiInsightState();
}

class _LayarAiInsightState extends ConsumerState<LayarAiInsight> {
  Map<String, dynamic>? _data;
  bool _memuat = true;

  @override
  void initState() {
    super.initState();
    Future.microtask(_muat);
  }

  Future<void> _muat() async {
    setState(() => _memuat = true);
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(() => k.dio.get('/ai/insight'));
      if (mounted) {
        setState(() => _data = res.data['data'] as Map<String, dynamic>);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ring = _data?['ringkasan'] as Map<String, dynamic>?;
    final tren =
        (_data?['tren_7_hari'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final bayar = (_data?['distribusi_pembayaran'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        [];
    final forecast =
        (_data?['forecast'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final rfm = (_data?['rfm'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    final maxOmzet = tren.fold<int>(
      1,
      (m, e) {
        final v = (e['omzet'] as num).toInt();
        return v > m ? v : m;
      },
    );

    return Scaffold(
      appBar: const AppBarPharma(
        peranLabel: 'OWNER',
        subjudul: 'AI Insight & Analitik',
      ),
      body: RefreshIndicator(
        onRefresh: _muat,
        child: _memuat || _data == null
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(TokenJarak.j4),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _KartuRingkas(
                          judul: 'Omzet Hari Ini',
                          nilai: formatRupiah(
                              ((ring?['omzet_hari_ini'] ?? 0) as num).toInt()),
                          aksen: TokenAksi.utama,
                        ),
                      ),
                      const SizedBox(width: TokenJarak.j3),
                      Expanded(
                        child: _KartuRingkas(
                          judul: 'Laba Bulan Ini',
                          nilai: formatRupiah(
                              ((ring?['laba_bulan_ini'] ?? 0) as num).toInt()),
                          aksen: WarnaMentah.ai600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: TokenJarak.j4),
                  _KartuBagian(
                    judul: 'Grafik Penjualan 7 Hari Terakhir',
                    ikon: LucideIcons.trendingUp,
                    warnaIkon: TokenAksi.utama,
                    child: SizedBox(
                      height: 140,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: tren.map((t) {
                          final omz = (t['omzet'] as num).toInt();
                          final rasio =
                              maxOmzet > 0 ? (omz / maxOmzet).clamp(0.08, 1.0) : 0.08;
                          return Expanded(
                            child: Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 4),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  Expanded(
                                    child: Align(
                                      alignment: Alignment.bottomCenter,
                                      child: FractionallySizedBox(
                                        heightFactor: rasio,
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color: TokenAksi.utama,
                                            borderRadius: BorderRadius.circular(
                                                TokenRadius.kecil),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    t['label'] as String,
                                    style: TokenTipografi.keterangan,
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                  const SizedBox(height: TokenJarak.j4),
                  _KartuBagian(
                    judul: 'Distribusi Metode Pembayaran',
                    ikon: LucideIcons.creditCard,
                    warnaIkon: TokenAksi.utama,
                    child: Column(
                      children: bayar.map((b) {
                        final persen = (b['persen'] as num).toInt();
                        return Padding(
                          padding: const EdgeInsets.only(bottom: TokenJarak.j2),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(b['label'] as String,
                                      style: TokenTipografi.tabel),
                                  Text(
                                    '$persen% (${b['jumlah']} trx)',
                                    style: TokenTipografi.tabel
                                        .copyWith(fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              LinearProgressIndicator(
                                value: persen / 100.0,
                                minHeight: 8,
                                backgroundColor: TokenLatar.selang,
                                color: TokenAksi.utama,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: TokenJarak.j4),
                  _KartuBagian(
                    judul: 'AI Demand Forecasting (7 Hari Ke Depan)',
                    ikon: LucideIcons.sparkles,
                    warnaIkon: WarnaMentah.ai600,
                    latar: WarnaMentah.ai50,
                    child: Column(
                      children: forecast.map((f) {
                        final naik = (f['perubahan_persen'] as num) >= 0;
                        return Container(
                          margin: const EdgeInsets.only(bottom: TokenJarak.j2),
                          padding: const EdgeInsets.all(TokenJarak.j3),
                          decoration: BoxDecoration(
                            color: TokenLatar.latar,
                            borderRadius:
                                BorderRadius.circular(TokenRadius.kecil),
                            border: Border.all(color: TokenGaris.pemisah),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      f['nama'] as String,
                                      style: TokenTipografi.tabel.copyWith(
                                          fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                  Text(
                                    '${naik ? '+' : ''}${f['perubahan_persen']}%',
                                    style: TokenTipografi.keterangan.copyWith(
                                      fontWeight: FontWeight.w700,
                                      color: naik
                                          ? TokenStatus.berhasilTeks
                                          : TokenStatus.peringatanTeks,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Prediksi: ${f['prediksi_minggu_depan']} ${f['satuan']} · Stok saat ini: ${f['stok_saat_ini']}',
                                style: TokenTipografi.keterangan,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                f['rekomendasi'] as String,
                                style: TokenTipografi.keterangan.copyWith(
                                  color: WarnaMentah.ai700,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: TokenJarak.j4),
                  _KartuBagian(
                    judul: 'AI Segmentasi Pelanggan RFM',
                    ikon: LucideIcons.users,
                    warnaIkon: WarnaMentah.ai600,
                    child: GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: TokenJarak.j2,
                      crossAxisSpacing: TokenJarak.j2,
                      childAspectRatio: 1.55,
                      children: rfm.map((s) {
                        return Container(
                          padding: const EdgeInsets.all(TokenJarak.j3),
                          decoration: BoxDecoration(
                            color: TokenLatar.halaman,
                            borderRadius:
                                BorderRadius.circular(TokenRadius.kecil),
                            border: Border.all(color: TokenGaris.pemisah),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                s['segmen'] as String,
                                style: TokenTipografi.tabel
                                    .copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${s['jumlah']} pelanggan (${s['persen']}%)',
                                style: TokenTipografi.keterangan.copyWith(
                                  color: TokenAksi.utama,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                s['deskripsi'] as String,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TokenTipografi.keterangan,
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _KartuRingkas extends StatelessWidget {
  final String judul;
  final String nilai;
  final Color aksen;
  const _KartuRingkas(
      {required this.judul, required this.nilai, required this.aksen});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(TokenJarak.j3),
      decoration: BoxDecoration(
        color: TokenLatar.latar,
        borderRadius: BorderRadius.circular(TokenRadius.sedang),
        border: Border.all(color: TokenGaris.pemisah),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(judul, style: TokenTipografi.keterangan),
          const SizedBox(height: 4),
          Text(
            nilai,
            style: TokenTipografi.angkaTabular(TokenTipografi.seksi)
                .copyWith(color: aksen, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _KartuBagian extends StatelessWidget {
  final String judul;
  final IconData ikon;
  final Color warnaIkon;
  final Color? latar;
  final Widget child;
  const _KartuBagian({
    required this.judul,
    required this.ikon,
    required this.warnaIkon,
    this.latar,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(TokenJarak.j4),
      decoration: BoxDecoration(
        color: latar ?? TokenLatar.latar,
        borderRadius: BorderRadius.circular(TokenRadius.sedang),
        border: Border.all(color: TokenGaris.pemisah),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(ikon, size: 18, color: warnaIkon),
              const SizedBox(width: TokenJarak.j2),
              Expanded(
                child: Text(
                  judul,
                  style: TokenTipografi.dasar
                      .copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: TokenJarak.j3),
          child,
        ],
      ),
    );
  }
}
