import 'dart:convert';
import 'dart:typed_data';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/klien_api.dart';

class LayarBerandaPemilik extends ConsumerStatefulWidget {
  final VoidCallback? onBukaNotifikasi;
  final int jumlahNotifikasi;

  const LayarBerandaPemilik(
      {super.key, this.onBukaNotifikasi, this.jumlahNotifikasi = 0});

  @override
  ConsumerState<LayarBerandaPemilik> createState() =>
      _LayarBerandaPemilikState();
}

class _LayarBerandaPemilikState extends ConsumerState<LayarBerandaPemilik> {
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
      final res = await k.kirim(() => k.dio.get('/ringkasan'));
      if (mounted) {
        setState(() => _data = res.data['data'] as Map<String, dynamic>);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Widget _kartu(String judul, String nilai) {
    return Container(
      padding: const EdgeInsets.all(TokenJarak.j4),
      decoration: BoxDecoration(
        color: TokenLatar.latar,
        border: Border.all(color: TokenGaris.pemisah),
        borderRadius: BorderRadius.circular(TokenRadius.kecil),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(judul, style: TokenTipografi.keterangan),
          const SizedBox(height: TokenJarak.j1),
          Text(nilai, style: TokenTipografi.angkaTabular(TokenTipografi.judul)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Beranda'),
        actions: [
          if (widget.onBukaNotifikasi != null)
            IconButton(
              onPressed: widget.onBukaNotifikasi,
              icon: Badge(
                isLabelVisible: widget.jumlahNotifikasi > 0,
                label: Text('${widget.jumlahNotifikasi}'),
                child: const Icon(LucideIcons.bell),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _muat,
        child: _memuat || _data == null
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(TokenJarak.j4),
                children: [
                  _kartu(
                      'Omzet Hari Ini',
                      formatRupiah(
                          ((_data!['omzet_hari_ini'] ?? 0) as num).toInt())),
                  const SizedBox(height: TokenJarak.j3),
                  _kartu('Transaksi Hari Ini',
                      '${_data!['jumlah_transaksi_hari_ini'] ?? 0}'),
                  const SizedBox(height: TokenJarak.j3),
                  _kartu('Pengajuan Menunggu',
                      '${_data!['pengajuan_menunggu'] ?? 0}'),
                  const SizedBox(height: TokenJarak.j3),
                  _kartu('Batch Near-Expired',
                      '${_data!['near_expired_batch'] ?? 0}'),
                  const SizedBox(height: TokenJarak.j3),
                  _kartu('Barang Defekta', '${_data!['defekta_barang'] ?? 0}'),
                ],
              ),
      ),
    );
  }
}

class LayarLaporanOperasional extends ConsumerStatefulWidget {
  const LayarLaporanOperasional({super.key});

  @override
  ConsumerState<LayarLaporanOperasional> createState() =>
      _LayarLaporanOperasionalState();
}

class _LayarLaporanOperasionalState
    extends ConsumerState<LayarLaporanOperasional> {
  String _tab = 'omzet';
  Map<String, dynamic>? _omzet;
  List<Map<String, dynamic>> _margin = [];
  Map<String, dynamic>? _fastSlow;
  Map<String, dynamic>? _golKhusus;
  final _periodeCtrl = TextEditingController(
    text:
        '${DateTime.now().year}-${DateTime.now().month.toString().padLeft(2, '0')}',
  );
  bool _memuat = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_muat);
  }

  @override
  void dispose() {
    _periodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _muat() async {
    setState(() => _memuat = true);
    try {
      final k = ref.read(klienApiProvider);
      if (_tab == 'omzet') {
        final r = await k.kirim(() => k.dio.get('/laporan/omzet'));
        _omzet = r.data['data'] as Map<String, dynamic>;
      } else if (_tab == 'margin') {
        final r = await k.kirim(() => k.dio.get('/laporan/margin-kategori'));
        _margin = (r.data['data'] as List).cast<Map<String, dynamic>>();
      } else if (_tab == 'fast_slow') {
        final r = await k.kirim(() => k.dio.get('/laporan/fast-slow'));
        _fastSlow = r.data['data'] as Map<String, dynamic>;
      } else {
        final r = await k.kirim(
          () => k.dio.get(
            '/laporan/golongan-khusus',
            queryParameters: {
              'periode': _periodeCtrl.text.trim(),
              'format': 'json'
            },
          ),
        );
        _golKhusus = r.data['data'] as Map<String, dynamic>;
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _unduhCsv() async {
    final periode = _periodeCtrl.text.trim();
    final k = ref.read(klienApiProvider);
    final res = await k.kirim(
      () => k.dio.get(
        '/laporan/golongan-khusus',
        queryParameters: {'periode': periode, 'format': 'csv'},
      ),
    );
    final bytes = Uint8List.fromList(utf8.encode(res.data.toString()));
    await Share.shareXFiles(
      [
        XFile.fromData(bytes,
            name: 'golongan-khusus-$periode.csv', mimeType: 'text/csv')
      ],
      text: 'Mutasi Golongan Khusus $periode',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Laporan Operasional')),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(TokenJarak.j3),
            child: Row(
              children: [
                ('omzet', 'Omzet'),
                ('margin', 'Margin'),
                ('fast_slow', 'Fast/Slow'),
                ('golongan', 'Gol. Khusus'),
              ].map((e) {
                final aktif = _tab == e.$1;
                return Padding(
                  padding: const EdgeInsets.only(right: TokenJarak.j2),
                  child: TombolPos(
                    label: e.$2,
                    penuh: false,
                    jenis: aktif ? JenisTombol.utama : JenisTombol.sekunder,
                    onPressed: () {
                      setState(() => _tab = e.$1);
                      _muat();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: _memuat
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(TokenJarak.j4),
                    children: [
                      if (_tab == 'omzet' && _omzet != null) ...[
                        TabelBarisPos(
                          kepala: const [
                            'Periode',
                            'Trx',
                            'Omzet',
                            'Laba Kotor'
                          ],
                          rataKanan: const [false, true, true, true],
                          baris: (_omzet!['baris'] as List).map((raw) {
                            final b = raw as Map<String, dynamic>;
                            return [
                              b['periode'] as String,
                              '${b['jumlah_transaksi']}',
                              formatRupiah((b['omzet'] as num).toInt()),
                              formatRupiah((b['laba_kotor'] as num).toInt()),
                            ];
                          }).toList(),
                        ),
                      ] else if (_tab == 'margin') ...[
                        TabelBarisPos(
                          kepala: const [
                            'Kategori',
                            'Penjualan',
                            'HPP',
                            'Margin'
                          ],
                          rataKanan: const [false, true, true, true],
                          baris: _margin
                              .map((m) => [
                                    m['kategori'] as String,
                                    formatRupiah(
                                        (m['penjualan'] as num).toInt()),
                                    formatRupiah((m['hpp'] as num).toInt()),
                                    '${m['persen_margin']}%',
                                  ])
                              .toList(),
                        ),
                      ] else if (_tab == 'fast_slow' && _fastSlow != null) ...[
                        const Text('Fast Moving', style: TokenTipografi.seksi),
                        const SizedBox(height: TokenJarak.j2),
                        TabelBarisPos(
                          kepala: const ['Barang', 'Terjual', 'Stok'],
                          rataKanan: const [false, true, true],
                          baris: (_fastSlow!['fast'] as List).map((raw) {
                            final b = raw as Map<String, dynamic>;
                            return [
                              b['nama'] as String,
                              '${b['jumlah_terjual']}',
                              '${b['stok_total']}'
                            ];
                          }).toList(),
                        ),
                        const SizedBox(height: TokenJarak.j4),
                        const Text('Slow Moving', style: TokenTipografi.seksi),
                        const SizedBox(height: TokenJarak.j2),
                        TabelBarisPos(
                          kepala: const ['Barang', 'Terjual', 'Stok'],
                          rataKanan: const [false, true, true],
                          baris: (_fastSlow!['slow'] as List).map((raw) {
                            final b = raw as Map<String, dynamic>;
                            return [
                              b['nama'] as String,
                              '${b['jumlah_terjual']}',
                              '${b['stok_total']}'
                            ];
                          }).toList(),
                        ),
                      ] else if (_tab == 'golongan') ...[
                        Row(
                          children: [
                            Expanded(
                              child: IsianTeksPos(
                                  controller: _periodeCtrl,
                                  label: 'Periode (YYYY-MM)'),
                            ),
                            const SizedBox(width: TokenJarak.j2),
                            TombolPos(
                                label: 'Muat', penuh: false, onPressed: _muat),
                          ],
                        ),
                        const SizedBox(height: TokenJarak.j3),
                        TombolPos(
                          label: 'Unduh CSV',
                          ikon: LucideIcons.download,
                          jenis: JenisTombol.sekunder,
                          onPressed: _unduhCsv,
                        ),
                        const SizedBox(height: TokenJarak.j3),
                        if (_golKhusus != null)
                          TabelBarisPos(
                            kepala: const [
                              'Barang',
                              'Awal',
                              'Masuk',
                              'Keluar',
                              'Akhir'
                            ],
                            rataKanan: const [false, true, true, true, true],
                            baris: (_golKhusus!['baris'] as List).map((raw) {
                              final b = raw as Map<String, dynamic>;
                              final keluar =
                                  (b['keluar_penjualan'] as num).toInt() +
                                      (b['keluar_pengurangan'] as num).toInt();
                              return [
                                b['nama'] as String,
                                '${b['stok_awal']}',
                                '${b['masuk']}',
                                '$keluar',
                                '${b['stok_akhir']}',
                              ];
                            }).toList(),
                          ),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class LayarPantauBulanan extends ConsumerStatefulWidget {
  const LayarPantauBulanan({super.key});

  @override
  ConsumerState<LayarPantauBulanan> createState() => _LayarPantauBulananState();
}

class _LayarPantauBulananState extends ConsumerState<LayarPantauBulanan> {
  List<Map<String, dynamic>> _apotekList = [];
  int? _apotekId;
  List<Map<String, dynamic>> _laporanList = [];

  @override
  void initState() {
    super.initState();
    Future.microtask(_muatApotek);
  }

  Future<void> _muatApotek() async {
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(() => k.dio.get('/pantau/apotek'));
      final list = (res.data['data'] as List).cast<Map<String, dynamic>>();
      if (mounted && list.isNotEmpty) {
        setState(() {
          _apotekList = list;
          _apotekId = (list.first['id'] as num).toInt();
        });
        await _muatLaporan();
      }
    } catch (_) {}
  }

  Future<void> _muatLaporan() async {
    if (_apotekId == null) return;
    final k = ref.read(klienApiProvider);
    final res = await k.kirim(
      () => k.dio
          .get('/laporan-bulanan', queryParameters: {'apotek_id': _apotekId}),
    );
    if (mounted) {
      setState(() => _laporanList =
          (res.data['data'] as List).cast<Map<String, dynamic>>());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Apotek Pantau & Laporan Bulanan')),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          if (_apotekList.isNotEmpty)
            DropdownButtonFormField<int>(
              initialValue: _apotekId,
              decoration: const InputDecoration(labelText: 'Pilih Apotek'),
              items: _apotekList
                  .map((a) => DropdownMenuItem<int>(
                        value: (a['id'] as num).toInt(),
                        child: Text('${a['nama']} (${a['kode']})'),
                      ))
                  .toList(),
              onChanged: (v) {
                setState(() => _apotekId = v);
                _muatLaporan();
              },
            ),
          const SizedBox(height: TokenJarak.j4),
          ..._laporanList.map((l) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Periode ${l['periode']}'),
                trailing: LencanaStatusPos(status: l['status'] as String),
              )),
        ],
      ),
    );
  }
}
