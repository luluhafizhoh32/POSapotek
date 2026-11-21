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
  Map<String, dynamic>? _insight;
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
      Map<String, dynamic>? ins;
      try {
        final resIns = await k.kirim(() => k.dio.get('/ai/insight'));
        ins = resIns.data['data'] as Map<String, dynamic>?;
      } catch (_) {}
      if (mounted) {
        setState(() {
          _data = res.data['data'] as Map<String, dynamic>;
          _insight = ins;
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Widget _kartuMini(String judul, String nilai, Color latar, Color aksen) {
    return Container(
      padding: const EdgeInsets.all(TokenJarak.j3),
      decoration: BoxDecoration(
        color: latar,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: aksen.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            nilai,
            style: TokenTipografi.angkaTabular(TokenTipografi.judul)
                .copyWith(color: aksen, fontSize: 22),
          ),
          const SizedBox(height: 2),
          Text(
            judul,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TokenTipografi.keterangan
                .copyWith(color: aksen, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final omzetHariIni = ((_data?['omzet_hari_ini'] ?? 0) as num).toInt();
    final trxHariIni =
        ((_data?['jumlah_transaksi_hari_ini'] ?? 0) as num).toInt();
    final labaBulanIni =
        ((_insight?['ringkasan']?['laba_bulan_ini'] ?? 0) as num).toInt();
    final tren =
        (_insight?['tren_7_hari'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final bayar = (_insight?['distribusi_pembayaran'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        [];
    final maxOmzet = tren.fold<int>(
      1,
      (m, e) {
        final v = (e['omzet'] as num).toInt();
        return v > m ? v : m;
      },
    );

    return Scaffold(
      appBar: AppBarPharma(
        peranLabel: 'OWNER',
        subjudul: 'Dashboard Pemilik',
        onBukaNotifikasi: widget.onBukaNotifikasi,
        jumlahNotifikasi: widget.jumlahNotifikasi,
      ),
      body: RefreshIndicator(
        onRefresh: _muat,
        child: _memuat || _data == null
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(TokenJarak.j4),
                children: [
                  Text('Selamat datang, Pemilik Apotek',
                      style: TokenTipografi.seksi),
                  const SizedBox(height: 2),
                  Text('Ringkasan performa apotek hari ini secara real-time',
                      style: TokenTipografi.keterangan),
                  const SizedBox(height: TokenJarak.j4),
                  // 2 Kartu Hero KPI berdampingan seperti video PharmaPOS
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF047857), Color(0xFF10B981)],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x26059669),
                                blurRadius: 14,
                                offset: Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Omzet Hari Ini',
                                style: TokenTipografi.keterangan.copyWith(
                                    color: Colors.white.withValues(alpha: 0.9)),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                formatRupiah(omzetHariIni),
                                style: TokenTipografi.angkaTabular(
                                        TokenTipografi.seksi)
                                    .copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  '$trxHariIni transaksi hari ini',
                                  style: TokenTipografi.keterangan.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: TokenJarak.j3),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: TokenGaris.pemisah),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x0D064E3B),
                                blurRadius: 12,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Laba Bulan Ini',
                                  style: TokenTipografi.keterangan),
                              const SizedBox(height: 6),
                              Text(
                                formatRupiah(labaBulanIni),
                                style: TokenTipografi.angkaTabular(
                                        TokenTipografi.seksi)
                                    .copyWith(
                                        color: TokenAksi.utama,
                                        fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: TokenStatus.berhasilLatar,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  'Margin real-time',
                                  style: TokenTipografi.keterangan.copyWith(
                                      color: TokenStatus.berhasilTeks,
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: TokenJarak.j3),
                  // 3 Status Operasional
                  Row(
                    children: [
                      Expanded(
                        child: _kartuMini(
                          'Pengajuan',
                          '${_data!['pengajuan_menunggu'] ?? 0}',
                          TokenStatus.informasiLatar,
                          TokenStatus.informasiTeks,
                        ),
                      ),
                      const SizedBox(width: TokenJarak.j2),
                      Expanded(
                        child: _kartuMini(
                          'Near-Expired',
                          '${_data!['near_expired_batch'] ?? 0}',
                          TokenStatus.peringatanLatar,
                          TokenStatus.peringatanTeks,
                        ),
                      ),
                      const SizedBox(width: TokenJarak.j2),
                      Expanded(
                        child: _kartuMini(
                          'Defekta',
                          '${_data!['defekta_barang'] ?? 0}',
                          TokenStatus.bahayaLatar,
                          TokenStatus.bahayaTeks,
                        ),
                      ),
                    ],
                  ),
                  if (tren.isNotEmpty) ...[
                    const SizedBox(height: TokenJarak.j4),
                    Container(
                      padding: const EdgeInsets.all(TokenJarak.j4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: TokenGaris.pemisah),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Grafik Penjualan 7 Hari Terakhir',
                              style: TokenTipografi.dasar
                                  .copyWith(fontWeight: FontWeight.w700)),
                          const SizedBox(height: TokenJarak.j3),
                          SizedBox(
                            height: 116,
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: tren.map((t) {
                                final omz = (t['omzet'] as num).toInt();
                                final rasio = maxOmzet > 0
                                    ? (omz / maxOmzet).clamp(0.1, 1.0)
                                    : 0.1;
                                return Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 4),
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
                                                  gradient:
                                                      const LinearGradient(
                                                    begin:
                                                        Alignment.bottomCenter,
                                                    end: Alignment.topCenter,
                                                    colors: [
                                                      Color(0xFF059669),
                                                      Color(0xFF34D399),
                                                    ],
                                                  ),
                                                  borderRadius:
                                                      BorderRadius.circular(6),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(t['label'] as String,
                                            style: TokenTipografi.keterangan),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (bayar.isNotEmpty) ...[
                    const SizedBox(height: TokenJarak.j4),
                    Container(
                      padding: const EdgeInsets.all(TokenJarak.j4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: TokenGaris.pemisah),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Distribusi Metode Pembayaran',
                              style: TokenTipografi.dasar
                                  .copyWith(fontWeight: FontWeight.w700)),
                          const SizedBox(height: TokenJarak.j3),
                          ...bayar.map((b) {
                            final persen = (b['persen'] as num).toInt();
                            return Padding(
                              padding:
                                  const EdgeInsets.only(bottom: TokenJarak.j2),
                              child: Column(
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(b['label'] as String,
                                          style: TokenTipografi.tabel),
                                      Text('$persen%',
                                          style: TokenTipografi.tabel.copyWith(
                                              fontWeight: FontWeight.w700,
                                              color: TokenAksi.utama)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  LinearProgressIndicator(
                                    value: persen / 100.0,
                                    minHeight: 7,
                                    backgroundColor: TokenLatar.selang,
                                    color: TokenAksi.utama,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ],
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
