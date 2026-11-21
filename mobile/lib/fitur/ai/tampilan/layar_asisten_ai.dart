import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/komponen_v2.dart';
import '../../../app/token.dart';
import '../../../inti/klien_api.dart';

class _PesanChat {
  final bool dariPengguna;
  final String teks;
  final String? sumber;
  const _PesanChat({
    required this.dariPengguna,
    required this.teks,
    this.sumber,
  });
}

class LayarAsistenAi extends ConsumerStatefulWidget {
  const LayarAsistenAi({super.key});

  @override
  ConsumerState<LayarAsistenAi> createState() => _LayarAsistenAiState();
}

class _LayarAsistenAiState extends ConsumerState<LayarAsistenAi> {
  final _ctrl = TextEditingController();
  final List<_PesanChat> _pesan = [
    const _PesanChat(
      dariPengguna: false,
      teks:
          'Halo! Saya Asisten AI PharmaPOS. Tanyakan tentang omzet, laba bulan ini, stok menipis, atau batch mendekati kedaluwarsa. Semua angka berasal langsung dari data apotek Anda.',
      sumber: 'Baca-saja · Data apotek Anda',
    ),
  ];
  bool _memuat = false;

  static const _saran = [
    'Berapa laba dan omzet bulan ini?',
    'Berapa batch yang mendekati kedaluwarsa?',
    'Berapa barang stok menipis / defekta?',
  ];

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _kirim(String teks) async {
    final q = teks.trim();
    if (q.isEmpty || _memuat) return;
    _ctrl.clear();
    setState(() {
      _pesan.add(_PesanChat(dariPengguna: true, teks: q));
      _memuat = true;
    });
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(
        () => k.dio.post('/ai/tanya', data: {'pertanyaan': q}),
      );
      final d = res.data['data'] as Map<String, dynamic>;
      if (mounted) {
        setState(() {
          _pesan.add(_PesanChat(
            dariPengguna: false,
            teks: d['jawaban'] as String,
            sumber: 'Periode ${d['periode']} · ${d['sumber']}',
          ));
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _pesan.add(const _PesanChat(
            dariPengguna: false,
            teks: 'Maaf, gagal mengambil jawaban dari server. Coba lagi.',
          ));
        });
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Asisten AI PharmaPOS')),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: AppColors.primaryTint,
            child: const Row(
              children: [
                StatusBadge(
                  label: 'Baca-saja · Tidak mengubah data',
                  varian: VarianStatus.info,
                  ikon: LucideIcons.sparkles,
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(TokenJarak.j4),
              itemCount: _pesan.length + (_memuat ? 1 : 0),
              itemBuilder: (ctx, i) {
                if (i == _pesan.length) {
                  return const Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text('Asisten sedang membaca data...',
                          style: TokenTipografi.keterangan),
                    ),
                  );
                }
                final p = _pesan[i];
                return Align(
                  alignment: p.dariPengguna
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: TokenJarak.j3),
                    padding: const EdgeInsets.all(TokenJarak.j3),
                    constraints: const BoxConstraints(maxWidth: 420),
                    decoration: BoxDecoration(
                      color: p.dariPengguna
                          ? AppColors.primary
                          : AppColors.surface,
                      borderRadius: BorderRadius.circular(TokenRadius.besar),
                      border: p.dariPengguna
                          ? null
                          : Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.teks,
                          style: TokenTipografi.dasar.copyWith(
                            color: p.dariPengguna
                                ? AppColors.textOnPrimary
                                : AppColors.textPrimary,
                          ),
                        ),
                        if (p.sumber != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            p.sumber!,
                            style: TokenTipografi.keterangan.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: _saran
                  .map(
                    (s) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ActionChip(
                        label: Text(s),
                        onPressed: () => _kirim(s),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    onSubmitted: _kirim,
                    decoration: InputDecoration(
                      hintText: 'Tanya data penjualan, stok, atau laba...',
                      filled: true,
                      fillColor: AppColors.background,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(TokenRadius.sedang),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                TombolPos(
                  label: 'Kirim',
                  penuh: false,
                  memuat: _memuat,
                  onPressed: () => _kirim(_ctrl.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
