import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/komponen_v2.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/klien_api.dart';

class LayarUtangPemasok extends ConsumerStatefulWidget {
  const LayarUtangPemasok({super.key});

  @override
  ConsumerState<LayarUtangPemasok> createState() => _LayarUtangPemasokState();
}

class _LayarUtangPemasokState extends ConsumerState<LayarUtangPemasok> {
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
      final res = await k.kirim(() => k.dio.get('/utang-pemasok'));
      if (mounted) {
        setState(() => _data = res.data['data'] as Map<String, dynamic>);
      }
    } catch (_) {
      if (mounted) setState(() => _galat = 'Gagal memuat data utang usaha.');
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _bayarDialog(Map<String, dynamic> u) async {
    final jmlCtrl = TextEditingController(text: '${u['sisa']}');
    final refCtrl = TextEditingController();
    final ok = await tampilkanDialogPos<bool>(
      context: context,
      judul: 'Bayar Faktur ${u['nomor_faktur']}',
      isi: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IsianRupiahPos(controller: jmlCtrl, label: 'Jumlah Bayar'),
          const SizedBox(height: TokenJarak.j2),
          IsianTeksPos(controller: refCtrl, label: 'Referensi Transfer (Opsional)'),
        ],
      ),
      tombol: [
        TombolPos(
          label: 'Batal',
          jenis: JenisTombol.sekunder,
          penuh: false,
          onPressed: () => Navigator.pop(context, false),
        ),
        TombolPos(
          label: 'Bayar',
          penuh: false,
          onPressed: () => Navigator.pop(context, true),
        ),
      ],
    );
    if (ok != true) return;
    final jumlah = parseRupiahInput(jmlCtrl.text);
    if (jumlah <= 0) return;
    final k = ref.read(klienApiProvider);
    await k.kirim(() => k.dio.post('/utang-pemasok/${u['id']}/bayar', data: {
          'jumlah': jumlah,
          'akun_bayar_kode': '1120',
          if (refCtrl.text.trim().isNotEmpty) 'referensi': refCtrl.text.trim(),
        }));
    await _muat();
  }

  @override
  Widget build(BuildContext context) {
    final daftar =
        (_data?['daftar'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final totalSisa = ((_data?['total_sisa_utang'] ?? 0) as num).toInt();

    return Scaffold(
      appBar: AppBar(title: const Text('Utang Usaha (PBF)')),
      body: _memuat
          ? const SkeletonLoader()
          : _galat != null
              ? ErrorState(pesan: _galat!, onCobaLagi: _muat)
              : ListView(
                  padding: const EdgeInsets.all(TokenJarak.j4),
                  children: [
                    KpiCard(
                      label: 'Total Sisa Utang Usaha (Akun 2110)',
                      nilai: formatRupiah(totalSisa),
                      catatan: '${daftar.length} faktur tercatat',
                    ),
                    const SizedBox(height: TokenJarak.j4),
                    if (daftar.isEmpty)
                      const EmptyState(
                        ikon: LucideIcons.receipt,
                        judul: 'Tidak ada utang usaha',
                        keterangan:
                            'Faktur pembelian tempo dari PBF akan muncul di sini.',
                      )
                    else
                      ...daftar.map((u) {
                        final status = u['status'] as String;
                        return Container(
                          margin: const EdgeInsets.only(bottom: TokenJarak.j3),
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
                                  Text(u['nomor_faktur'] as String,
                                      style: TokenTipografi.subjudul),
                                  StatusBadge(
                                    label: status,
                                    varian: status == 'lunas'
                                        ? VarianStatus.success
                                        : status == 'sebagian'
                                            ? VarianStatus.warning
                                            : VarianStatus.danger,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${u['pemasok_nama']} · Jatuh tempo ${u['jatuh_tempo']}',
                                style: TokenTipografi.keterangan,
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Sisa: ${formatRupiah((u['sisa'] as num).toInt())}',
                                    style: TokenTipografi.angkaTabular(
                                            TokenTipografi.subjudul)
                                        .copyWith(color: AppColors.primary),
                                  ),
                                  if (status != 'lunas')
                                    TombolPos(
                                      label: 'Bayar',
                                      penuh: false,
                                      onPressed: () => _bayarDialog(u),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }),
                  ],
                ),
    );
  }
}

class LayarBukuBesar extends ConsumerStatefulWidget {
  const LayarBukuBesar({super.key});

  @override
  ConsumerState<LayarBukuBesar> createState() => _LayarBukuBesarState();
}

class _LayarBukuBesarState extends ConsumerState<LayarBukuBesar> {
  String _akunKode = '1110';
  Map<String, dynamic>? _data;
  bool _memuat = true;

  static const _opsiAkun = [
    ('1110', '1110 · Kas'),
    ('1120', '1120 · Bank & QRIS'),
    ('1140', '1140 · Persediaan Obat'),
    ('2110', '2110 · Utang Usaha'),
    ('3110', '3110 · Modal Pemilik'),
    ('4110', '4110 · Penjualan'),
    ('5110', '5110 · Harga Pokok Penjualan'),
  ];

  @override
  void initState() {
    super.initState();
    Future.microtask(_muat);
  }

  Future<void> _muat() async {
    setState(() => _memuat = true);
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(
        () => k.dio.get(
          '/laporan-keuangan/buku-besar-akun',
          queryParameters: {'akun_kode': _akunKode},
        ),
      );
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
    final baris =
        (_data?['baris'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return Scaffold(
      appBar: AppBar(title: const Text('Buku Besar')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(TokenJarak.j4),
            child: DropdownButtonFormField<String>(
              initialValue: _akunKode,
              decoration: const InputDecoration(labelText: 'Pilih Akun'),
              items: _opsiAkun
                  .map((a) => DropdownMenuItem(value: a.$1, child: Text(a.$2)))
                  .toList(),
              onChanged: (v) {
                if (v != null) {
                  setState(() => _akunKode = v);
                  _muat();
                }
              },
            ),
          ),
          Expanded(
            child: _memuat
                ? const SkeletonLoader()
                : _data == null
                    ? ErrorState(
                        pesan: 'Gagal memuat Buku Besar.', onCobaLagi: _muat)
                    : ListView(
                        padding: const EdgeInsets.symmetric(
                            horizontal: TokenJarak.j4),
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: KpiCard(
                                  label: 'Saldo Awal',
                                  nilai: formatRupiah(
                                      ((_data!['saldo_awal'] ?? 0) as num)
                                          .toInt()),
                                ),
                              ),
                              const SizedBox(width: TokenJarak.j3),
                              Expanded(
                                child: KpiCard(
                                  label: 'Saldo Akhir',
                                  nilai: formatRupiah(
                                      ((_data!['saldo_akhir'] ?? 0) as num)
                                          .toInt()),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: TokenJarak.j4),
                          if (baris.isEmpty)
                            const EmptyState(
                              ikon: LucideIcons.bookOpen,
                              judul: 'Belum ada mutasi',
                              keterangan:
                                  'Tidak ada jurnal Posted untuk akun ini pada periode berjalan.',
                            )
                          else
                            ...baris.map((b) => Container(
                                  margin: const EdgeInsets.only(
                                      bottom: TokenJarak.j2),
                                  padding: const EdgeInsets.all(TokenJarak.j3),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(
                                        TokenRadius.sedang),
                                    border:
                                        Border.all(color: AppColors.border),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '${b['tanggal']} · ${b['nomor']}',
                                            style: TokenTipografi.keterangan,
                                          ),
                                          Text(
                                            formatRupiah(
                                                (b['saldo_berjalan'] as num)
                                                    .toInt()),
                                            style: TokenTipografi.angkaTabular(
                                                    TokenTipografi.tabel)
                                                .copyWith(
                                                    fontWeight: FontWeight.w700,
                                                    color: AppColors.primary),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(b['keterangan'] as String,
                                          style: TokenTipografi.tabel),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Debit (Bertambah): ${formatRupiah((b['debit'] as num).toInt())}  ·  Kredit (Berkurang): ${formatRupiah((b['kredit'] as num).toInt())}',
                                        style: TokenTipografi.keterangan,
                                      ),
                                    ],
                                  ),
                                )),
                        ],
                      ),
          ),
        ],
      ),
    );
  }
}
