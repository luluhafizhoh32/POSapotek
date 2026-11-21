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
  String? _galat;

  @override
  void initState() {
    super.initState();
    Future.microtask(_muat);
  }

  Future<void> _muat() async {
    setState(() {
      _memuat = true;
      _galat = null;
    });
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(() => k.dio.get('/ai/insight'));
      if (mounted) {
        setState(() => _data = res.data['data'] as Map<String, dynamic>);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _galat =
            'Gagal memuat AI Insight. Pastikan backend sudah di-restart (npm run dev).');
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final forecast =
        (_data?['forecast'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final rfm = (_data?['rfm'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final ring = _data?['ringkasan'] as Map<String, dynamic>?;

    final maxPred = forecast.fold<int>(
      1,
      (m, e) {
        final v = (e['prediksi_minggu_depan'] as num).toInt();
        return v > m ? v : m;
      },
    );

    return Scaffold(
      appBar: const AppBarPharma(
        peranLabel: 'OWNER',
        subjudul: 'AI Insight & Prediksi',
      ),
      body: RefreshIndicator(
        onRefresh: _muat,
        child: _memuat
            ? const Center(child: CircularProgressIndicator())
            : _galat != null || _data == null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(TokenJarak.j4),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          PesanPos(
                            jenis: JenisPesan.bahaya,
                            teks: _galat ?? 'Data AI Insight belum tersedia.',
                          ),
                          const SizedBox(height: TokenJarak.j3),
                          TombolPos(
                            label: 'Muat Ulang',
                            penuh: false,
                            onPressed: _muat,
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(TokenJarak.j4),
                    children: [
                      // Ringkasan cepat
                      Row(
                        children: [
                          Expanded(
                            child: _KartuRingkas(
                              judul: 'Omzet Hari Ini',
                              nilai: formatRupiah(
                                  ((ring?['omzet_hari_ini'] ?? 0) as num)
                                      .toInt()),
                              aksen: TokenAksi.utama,
                            ),
                          ),
                          const SizedBox(width: TokenJarak.j3),
                          Expanded(
                            child: _KartuRingkas(
                              judul: 'Laba Bulan Ini',
                              nilai: formatRupiah(
                                  ((ring?['laba_bulan_ini'] ?? 0) as num)
                                      .toInt()),
                              aksen: WarnaMentah.ai600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: TokenJarak.j4),

                      // Kartu Ungu AI Demand Forecasting seperti di video
                      Container(
                        padding: const EdgeInsets.all(TokenJarak.j4),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFF7C3AED), Color(0xFF5B21B6)],
                          ),
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x2E7C3AED),
                              blurRadius: 16,
                              offset: Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(LucideIcons.sparkles,
                                    color: Colors.white, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'AI Demand Forecasting',
                                    style: TokenTipografi.dasar.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    '7 Hari Ke Depan',
                                    style: TokenTipografi.keterangan.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: TokenJarak.j3),
                            if (forecast.isNotEmpty) ...[
                              // Bar chart Aktual vs Prediksi
                              SizedBox(
                                height: 110,
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: forecast.take(5).map((f) {
                                    final pred =
                                        (f['prediksi_minggu_depan'] as num)
                                            .toInt();
                                    final rasio =
                                        (pred / maxPred).clamp(0.18, 1.0);
                                    final namaPendek =
                                        (f['nama'] as String).split(' ').first;
                                    return Expanded(
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 4),
                                        child: Column(
                                          mainAxisAlignment:
                                              MainAxisAlignment.end,
                                          children: [
                                            Text(
                                              '$pred',
                                              style: TokenTipografi.keterangan
                                                  .copyWith(
                                                color: Colors.white,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Expanded(
                                              child: Align(
                                                alignment:
                                                    Alignment.bottomCenter,
                                                child: FractionallySizedBox(
                                                  heightFactor: rasio,
                                                  child: Container(
                                                    decoration: BoxDecoration(
                                                      color: Colors.white
                                                          .withValues(
                                                              alpha: 0.85),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              6),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              namaPendek,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TokenTipografi.keterangan
                                                  .copyWith(
                                                color: Colors.white
                                                    .withValues(alpha: 0.9),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                              const SizedBox(height: TokenJarak.j3),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(TokenJarak.j3),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Permintaan ${forecast.first['nama']} diprediksi naik +${forecast.first['perubahan_persen']}% minggu depan',
                                      style: TokenTipografi.tabel.copyWith(
                                        fontWeight: FontWeight.w700,
                                        color: WarnaMentah.ai700,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      forecast.first['rekomendasi'] as String,
                                      style: TokenTipografi.keterangan,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: TokenJarak.j4),

                      // AI Segmentasi Pelanggan RFM (Grid 2x2 berwarna seperti di video)
                      Container(
                        padding: const EdgeInsets.all(TokenJarak.j4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: TokenGaris.pemisah),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(LucideIcons.users,
                                    size: 18, color: WarnaMentah.ai600),
                                const SizedBox(width: 8),
                                Text(
                                  'AI Segmentasi Pelanggan RFM',
                                  style: TokenTipografi.dasar
                                      .copyWith(fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Recency · Frequency · Monetary',
                              style: TokenTipografi.keterangan,
                            ),
                            const SizedBox(height: TokenJarak.j3),
                            GridView.count(
                              crossAxisCount: 2,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              mainAxisSpacing: TokenJarak.j2,
                              crossAxisSpacing: TokenJarak.j2,
                              childAspectRatio: 1.5,
                              children: rfm.map((s) {
                                final w = s['warna'] as String? ?? 'utama';
                                final (bg, fg) = switch (w) {
                                  'berhasil' => (
                                      TokenStatus.berhasilLatar,
                                      TokenStatus.berhasilTeks
                                    ),
                                  'peringatan' => (
                                      TokenStatus.peringatanLatar,
                                      TokenStatus.peringatanTeks
                                    ),
                                  'info' => (
                                      WarnaMentah.ai50,
                                      WarnaMentah.ai700
                                    ),
                                  _ => (
                                      TokenStatus.informasiLatar,
                                      TokenStatus.informasiTeks
                                    ),
                                };
                                return Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: bg,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                        color: fg.withValues(alpha: 0.25)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        s['segmen'] as String,
                                        style: TokenTipografi.tabel.copyWith(
                                          fontWeight: FontWeight.w700,
                                          color: fg,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${s['jumlah']} pelanggan (${s['persen']}%)',
                                        style:
                                            TokenTipografi.keterangan.copyWith(
                                          fontWeight: FontWeight.w700,
                                          color: TokenTeks.utama,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        s['deskripsi'] as String,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TokenTipografi.keterangan,
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: TokenJarak.j3),
                            Container(
                              padding: const EdgeInsets.all(TokenJarak.j3),
                              decoration: BoxDecoration(
                                color: WarnaMentah.ai50,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.sparkles,
                                      size: 16, color: WarnaMentah.ai600),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Saran AI: Kirim promo vitamin ke pelanggan segmen "Berisiko" untuk meningkatkan kunjungan ulang.',
                                      style: TokenTipografi.keterangan.copyWith(
                                        color: WarnaMentah.ai700,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
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
        borderRadius: BorderRadius.circular(14),
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
