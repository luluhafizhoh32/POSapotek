import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/komponen_v2.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/klien_api.dart';

class LayarAsetAnggaran extends ConsumerStatefulWidget {
  const LayarAsetAnggaran({super.key});

  @override
  ConsumerState<LayarAsetAnggaran> createState() => _LayarAsetAnggaranState();
}

class _LayarAsetAnggaranState extends ConsumerState<LayarAsetAnggaran> {
  int _tab = 0; // 0: Aset Tetap, 1: Anggaran Beban
  List<Map<String, dynamic>> _aset = [];
  List<Map<String, dynamic>> _anggaran = [];
  bool _memuat = true;
  String? _pesan;

  String get _periodeKini {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}';
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(_muat);
  }

  Future<void> _muat() async {
    setState(() => _memuat = true);
    try {
      final k = ref.read(klienApiProvider);
      final resA = await k.kirim(() => k.dio.get('/aset-tetap'));
      final resB = await k.kirim(
        () => k.dio
            .get('/anggaran', queryParameters: {'periode': _periodeKini}),
      );
      if (mounted) {
        setState(() {
          _aset = (resA.data['data'] as List).cast<Map<String, dynamic>>();
          _anggaran = (resB.data['data'] as List).cast<Map<String, dynamic>>();
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _susutkan() async {
    final k = ref.read(klienApiProvider);
    final res = await k.kirim(
      () => k.dio.post('/aset-tetap/susutkan', data: {'periode': _periodeKini}),
    );
    final d = res.data['data'] as Map<String, dynamic>;
    if (mounted) {
      setState(() => _pesan =
          'Penyusutan $_periodeKini selesai: ${d['jumlah_aset_disusutkan']} aset (${formatRupiah((d['total_nominal'] as num).toInt())}).');
    }
    await _muat();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Aset Tetap & Anggaran')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(TokenJarak.j3),
            child: Row(
              children: [
                Expanded(
                  child: TombolPos(
                    label: 'Aset Tetap',
                    jenis: _tab == 0 ? JenisTombol.utama : JenisTombol.sekunder,
                    onPressed: () => setState(() => _tab = 0),
                  ),
                ),
                const SizedBox(width: TokenJarak.j2),
                Expanded(
                  child: TombolPos(
                    label: 'Anggaran Beban',
                    jenis: _tab == 1 ? JenisTombol.utama : JenisTombol.sekunder,
                    onPressed: () => setState(() => _tab = 1),
                  ),
                ),
              ],
            ),
          ),
          if (_pesan != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: TokenJarak.j4),
              child: PesanPos(jenis: JenisPesan.berhasil, teks: _pesan!),
            ),
          Expanded(
            child: _memuat
                ? const SkeletonLoader()
                : _tab == 0
                    ? ListView(
                        padding: const EdgeInsets.all(TokenJarak.j4),
                        children: [
                          TombolPos(
                            label: 'Jalankan Penyusutan ($_periodeKini)',
                            ikon: LucideIcons.calculator,
                            onPressed: _susutkan,
                          ),
                          const SizedBox(height: TokenJarak.j4),
                          if (_aset.isEmpty)
                            const EmptyState(
                              ikon: LucideIcons.building2,
                              judul: 'Belum ada aset tetap',
                              keterangan:
                                  'Daftarkan peralatan apotek (kulkas vaksin, rak, komputer) untuk penyusutan otomatis.',
                            )
                          else
                            ..._aset.map((a) => Container(
                                  margin: const EdgeInsets.only(
                                      bottom: TokenJarak.j3),
                                  padding: const EdgeInsets.all(TokenJarak.j4),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(
                                        TokenRadius.besar),
                                    border:
                                        Border.all(color: AppColors.border),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text('${a['kode']} · ${a['nama']}',
                                          style: TokenTipografi.subjudul),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Perolehan: ${formatRupiah((a['nilai_perolehan'] as num).toInt())} · Umur ${a['umur_manfaat_bulan']} bln',
                                        style: TokenTipografi.keterangan,
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        'Nilai Buku: ${formatRupiah((a['nilai_buku'] as num).toInt())}',
                                        style: TokenTipografi.angkaTabular(
                                                TokenTipografi.tabel)
                                            .copyWith(
                                                color: AppColors.primary,
                                                fontWeight: FontWeight.w700),
                                      ),
                                    ],
                                  ),
                                )),
                        ],
                      )
                    : _anggaran.isEmpty
                        ? const EmptyState(
                            ikon: LucideIcons.pieChart,
                            judul: 'Belum ada anggaran beban',
                            keterangan:
                                'Atur batas anggaran bulanan per akun beban untuk memantau realisasi.',
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(TokenJarak.j4),
                            itemCount: _anggaran.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: TokenJarak.j3),
                            itemBuilder: (ctx, i) {
                              final b = _anggaran[i];
                              final over = b['melampaui'] == true;
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
                                        Expanded(
                                          child: Text(
                                            '${b['akun_kode']} · ${b['akun_nama']}',
                                            style: TokenTipografi.subjudul,
                                          ),
                                        ),
                                        StatusBadge(
                                          label: over ? 'Melampaui' : 'Aman',
                                          varian: over
                                              ? VarianStatus.danger
                                              : VarianStatus.success,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Anggaran: ${formatRupiah((b['nominal_anggaran'] as num).toInt())}  ·  Realisasi: ${formatRupiah((b['realisasi'] as num).toInt())}',
                                      style: TokenTipografi.tabel,
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
