import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/komponen_v2.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/galat.dart';
import '../../../inti/klien_api.dart';
import '../../../inti/sesi.dart';

class LayarMasterBarang extends ConsumerStatefulWidget {
  const LayarMasterBarang({super.key});

  @override
  ConsumerState<LayarMasterBarang> createState() => _LayarMasterBarangState();
}

class _LayarMasterBarangState extends ConsumerState<LayarMasterBarang> {
  List<Map<String, dynamic>> _daftar = [];
  bool _memuat = true;
  String _q = '';

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
        () => k.dio.get('/barang',
            queryParameters: {if (_q.isNotEmpty) 'q': _q, 'per_halaman': 100}),
      );
      if (mounted) {
        setState(() =>
            _daftar = (res.data['data'] as List).cast<Map<String, dynamic>>());
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _tambahBarang() async {
    final kodeCtrl = TextEditingController();
    final namaCtrl = TextEditingController();
    final satuanCtrl = TextEditingController(text: 'strip');
    final hargaCtrl = TextEditingController();
    String kategori = 'generik';
    String golongan = 'bebas';
    String? errMsg;

    await tampilkanDialogPos<void>(
      context: context,
      judul: 'Tambah Barang',
      isi: StatefulBuilder(
        builder: (ctx, setD) => SizedBox(
          width: 320,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (errMsg != null)
                  PesanPos(jenis: JenisPesan.bahaya, teks: errMsg!),
                IsianTeksPos(controller: kodeCtrl, label: 'Kode'),
                const SizedBox(height: TokenJarak.j2),
                IsianTeksPos(controller: namaCtrl, label: 'Nama Barang'),
                const SizedBox(height: TokenJarak.j2),
                IsianTeksPos(controller: satuanCtrl, label: 'Satuan'),
                const SizedBox(height: TokenJarak.j2),
                IsianRupiahPos(controller: hargaCtrl, label: 'Harga Jual'),
                const SizedBox(height: TokenJarak.j2),
                DropdownButtonFormField<String>(
                  initialValue: kategori,
                  decoration: const InputDecoration(labelText: 'Kategori'),
                  items: const [
                    DropdownMenuItem(value: 'generik', child: Text('Generik')),
                    DropdownMenuItem(value: 'paten', child: Text('Paten')),
                  ],
                  onChanged: (v) => kategori = v ?? 'generik',
                ),
                const SizedBox(height: TokenJarak.j2),
                DropdownButtonFormField<String>(
                  initialValue: golongan,
                  decoration: const InputDecoration(labelText: 'Golongan'),
                  items: const [
                    DropdownMenuItem(value: 'bebas', child: Text('Bebas')),
                    DropdownMenuItem(
                        value: 'bebas_terbatas', child: Text('Bebas Terbatas')),
                    DropdownMenuItem(value: 'keras', child: Text('Keras')),
                    DropdownMenuItem(
                        value: 'narkotika', child: Text('Narkotika')),
                    DropdownMenuItem(
                        value: 'psikotropika', child: Text('Psikotropika')),
                    DropdownMenuItem(
                        value: 'prekursor', child: Text('Prekursor')),
                  ],
                  onChanged: (v) => golongan = v ?? 'bebas',
                ),
              ],
            ),
          ),
        ),
      ),
      tombol: [
        TombolPos(
          label: 'Batal',
          jenis: JenisTombol.sekunder,
          penuh: false,
          onPressed: () => Navigator.pop(context),
        ),
        TombolPos(
          label: 'Simpan',
          penuh: false,
          onPressed: () async {
            try {
              final k = ref.read(klienApiProvider);
              await k.kirim(
                () => k.dio.post('/barang', data: {
                  'kode': kodeCtrl.text.trim(),
                  'nama': namaCtrl.text.trim(),
                  'kategori': kategori,
                  'golongan': golongan,
                  'satuan': satuanCtrl.text.trim(),
                  'harga_jual': parseRupiahInput(hargaCtrl.text),
                }),
              );
              if (mounted) Navigator.pop(context);
              await _muat();
            } on GalatApi catch (g) {
              errMsg = g.pesan;
            }
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final peran = ref.watch(sesiProvider).pengguna?.peran;
    final bolehEdit = peran == 'staf_gudang' || peran == 'pemilik';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Stok & Barang'),
        actions: [
          if (bolehEdit)
            IconButton(
                icon: const Icon(LucideIcons.plus), onPressed: _tambahBarang),
        ],
      ),
      body: PageContainer(
        child: Column(
          children: [
            IsianTeksPos(
              label: 'Cari Barang',
              placeholder: 'Nama, kode, atau barcode...',
              onChanged: (v) {
                _q = v;
                _muat();
              },
            ),
            const SizedBox(height: TokenJarak.j4),
            Expanded(
              child: _memuat
                  ? const SkeletonLoader()
                  : _daftar.isEmpty
                      ? EmptyState(
                          ikon: LucideIcons.packageOpen,
                          judul: 'Belum ada produk',
                          keterangan:
                              'Tambahkan produk obat pertama untuk mulai mengelola stok dan penjualan.',
                          labelTombol: bolehEdit ? 'Tambah Barang' : null,
                          onAksi: bolehEdit ? _tambahBarang : null,
                        )
                      : ListView.separated(
                          itemCount: _daftar.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: TokenJarak.j2),
                          itemBuilder: (ctx, i) {
                            final b = _daftar[i];
                            final stok =
                                ((b['stok_total'] ?? 0) as num).toInt();
                            final min =
                                ((b['stok_minimum'] ?? 0) as num).toInt();
                            final menipis = stok <= min;
                            return Container(
                              padding: const EdgeInsets.all(TokenJarak.j3),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius:
                                    BorderRadius.circular(TokenRadius.besar),
                                border: Border.all(color: AppColors.border),
                                boxShadow: AppShadows.card,
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: menipis
                                          ? AppColors.dangerBg
                                          : AppColors.primaryTint,
                                      borderRadius: BorderRadius.circular(
                                          TokenRadius.sedang),
                                    ),
                                    child: Icon(
                                      LucideIcons.pill,
                                      size: 20,
                                      color: menipis
                                          ? AppColors.danger
                                          : AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(width: TokenJarak.j3),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          b['nama'] as String,
                                          style: TokenTipografi.dasar.copyWith(
                                              fontWeight: FontWeight.w600),
                                        ),
                                        const SizedBox(height: 3),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 4,
                                          crossAxisAlignment:
                                              WrapCrossAlignment.center,
                                          children: [
                                            Text(
                                              '${b['kode']} · ${b['satuan']} · Stok $stok',
                                              style: TokenTipografi.keterangan,
                                            ),
                                            StatusBadge(
                                              label: menipis
                                                  ? 'Stok Menipis'
                                                  : 'Tersedia',
                                              varian: menipis
                                                  ? VarianStatus.danger
                                                  : VarianStatus.success,
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: TokenJarak.j2),
                                  Text(
                                    formatRupiah(
                                        (b['harga_jual'] as num).toInt()),
                                    style: TokenTipografi.angkaTabular(
                                            TokenTipografi.subjudul)
                                        .copyWith(color: AppColors.primary),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class LayarMasterPemasok extends ConsumerStatefulWidget {
  const LayarMasterPemasok({super.key});

  @override
  ConsumerState<LayarMasterPemasok> createState() => _LayarMasterPemasokState();
}

class _LayarMasterPemasokState extends ConsumerState<LayarMasterPemasok> {
  List<Map<String, dynamic>> _daftar = [];
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
      final res = await k.kirim(
          () => k.dio.get('/pemasok', queryParameters: {'per_halaman': 100}));
      if (mounted) {
        setState(() =>
            _daftar = (res.data['data'] as List).cast<Map<String, dynamic>>());
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _tambahPemasok() async {
    final kodeCtrl = TextEditingController();
    final namaCtrl = TextEditingController();
    final telpCtrl = TextEditingController();
    await tampilkanDialogPos<void>(
      context: context,
      judul: 'Tambah Pemasok',
      isi: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IsianTeksPos(controller: kodeCtrl, label: 'Kode'),
          const SizedBox(height: TokenJarak.j2),
          IsianTeksPos(controller: namaCtrl, label: 'Nama PBF'),
          const SizedBox(height: TokenJarak.j2),
          IsianTeksPos(controller: telpCtrl, label: 'Telepon (Opsional)'),
        ],
      ),
      tombol: [
        TombolPos(
          label: 'Batal',
          jenis: JenisTombol.sekunder,
          penuh: false,
          onPressed: () => Navigator.pop(context),
        ),
        TombolPos(
          label: 'Simpan',
          penuh: false,
          onPressed: () async {
            final k = ref.read(klienApiProvider);
            await k.kirim(() => k.dio.post('/pemasok', data: {
                  'kode': kodeCtrl.text.trim(),
                  'nama': namaCtrl.text.trim(),
                  if (telpCtrl.text.trim().isNotEmpty)
                    'telepon': telpCtrl.text.trim(),
                }));
            if (mounted) Navigator.pop(context);
            await _muat();
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final peran = ref.watch(sesiProvider).pengguna?.peran;
    final bolehEdit = peran == 'staf_gudang' || peran == 'pemilik';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pemasok'),
        actions: [
          if (bolehEdit)
            IconButton(
                icon: const Icon(LucideIcons.plus), onPressed: _tambahPemasok),
        ],
      ),
      body: _memuat
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: const EdgeInsets.all(TokenJarak.j4),
              itemCount: _daftar.length,
              separatorBuilder: (_, __) => const Divider(),
              itemBuilder: (ctx, i) {
                final p = _daftar[i];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(p['nama'] as String),
                  subtitle: Text(
                      '${p['kode']}${p['telepon'] != null ? ' · ${p['telepon']}' : ''}'),
                );
              },
            ),
    );
  }
}
