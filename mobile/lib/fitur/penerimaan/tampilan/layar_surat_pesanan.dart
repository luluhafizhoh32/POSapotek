import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../../app/komponen.dart';
import '../../../app/komponen_v2.dart';
import '../../../app/token.dart';
import '../../../inti/klien_api.dart';
import '../../../inti/sesi.dart';

class LayarSuratPesanan extends ConsumerStatefulWidget {
  const LayarSuratPesanan({super.key});

  @override
  ConsumerState<LayarSuratPesanan> createState() => _LayarSuratPesananState();
}

class _LayarSuratPesananState extends ConsumerState<LayarSuratPesanan> {
  List<Map<String, dynamic>> _daftar = [];
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
      final res = await k.kirim(() => k.dio.get('/surat-pesanan'));
      if (mounted) {
        setState(() => _daftar =
            (res.data['data'] as List).cast<Map<String, dynamic>>());
      }
    } catch (_) {
      if (mounted) setState(() => _galat = 'Gagal memuat daftar Surat Pesanan.');
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _tandatangani(int id) async {
    final k = ref.read(klienApiProvider);
    await k.kirim(() => k.dio.post('/surat-pesanan/$id/tandatangani'));
    await _muat();
  }

  Future<void> _bagikan(Map<String, dynamic> sp) async {
    final k = ref.read(klienApiProvider);
    await Share.share(
      'Surat Pesanan ${sp['nomor']} (${sp['golongan']})\nPemasok: ${sp['pemasok_nama']}\nJumlah item: ${sp['jumlah_item']}',
      subject: 'Surat Pesanan ${sp['nomor']}',
    );
    await k.kirim(() => k.dio.post('/surat-pesanan/${sp['id']}/bagikan'));
    await _muat();
  }

  @override
  Widget build(BuildContext context) {
    final peran = ref.watch(sesiProvider).pengguna?.peran;
    return Scaffold(
      appBar: AppBar(title: const Text('Surat Pesanan (SP)')),
      body: _memuat
          ? const SkeletonLoader()
          : _galat != null
              ? ErrorState(pesan: _galat!, onCobaLagi: _muat)
              : _daftar.isEmpty
                  ? const EmptyState(
                      ikon: LucideIcons.fileText,
                      judul: 'Belum ada Surat Pesanan',
                      keterangan:
                          'Surat Pesanan dibuat dari item Defekta lalu ditandatangani Apoteker Penanggung Jawab (APA).',
                    )
                  : RefreshIndicator(
                      onRefresh: _muat,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(TokenJarak.j4),
                        itemCount: _daftar.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: TokenJarak.j3),
                        itemBuilder: (ctx, i) {
                          final sp = _daftar[i];
                          final status = sp['status'] as String;
                          final varian = switch (status) {
                            'ditandatangani' || 'terpenuhi' =>
                              VarianStatus.success,
                            'dibagikan' => VarianStatus.info,
                            'menunggu_ttd' => VarianStatus.warning,
                            _ => VarianStatus.neutral,
                          };
                          return Container(
                            padding: const EdgeInsets.all(TokenJarak.j4),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius:
                                  BorderRadius.circular(TokenRadius.besar),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(sp['nomor'] as String,
                                        style: TokenTipografi.subjudul),
                                    StatusBadge(
                                        label: status.replaceAll('_', ' '),
                                        varian: varian),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${sp['pemasok_nama']} · Golongan ${sp['golongan']} · ${sp['jumlah_item']} item',
                                  style: TokenTipografi.keterangan,
                                ),
                                const SizedBox(height: TokenJarak.j3),
                                Wrap(
                                  spacing: 8,
                                  children: [
                                    if (peran == 'apa' &&
                                        status == 'menunggu_ttd')
                                      TombolPos(
                                        label: 'Tandatangani APA',
                                        penuh: false,
                                        onPressed: () => _tandatangani(
                                            (sp['id'] as num).toInt()),
                                      ),
                                    if (status == 'ditandatangani' ||
                                        status == 'dibagikan')
                                      TombolPos(
                                        label: 'Bagikan ke PBF',
                                        ikon: LucideIcons.share2,
                                        jenis: JenisTombol.sekunder,
                                        penuh: false,
                                        onPressed: () => _bagikan(sp),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
