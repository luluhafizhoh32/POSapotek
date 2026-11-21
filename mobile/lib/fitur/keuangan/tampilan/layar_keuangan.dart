import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/komponen_v2.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/galat.dart';
import '../../../inti/klien_api.dart';

class LayarKeuangan extends ConsumerStatefulWidget {
  const LayarKeuangan({super.key});

  @override
  ConsumerState<LayarKeuangan> createState() => _LayarKeuanganState();
}

class _LayarKeuanganState extends ConsumerState<LayarKeuangan> {
  String _tab = 'neraca-saldo';
  final _periodeCtrl = TextEditingController(
    text:
        '${DateTime.now().year}-${DateTime.now().month.toString().padLeft(2, '0')}',
  );
  Map<String, dynamic>? _data;
  bool _memuat = false;
  String? _galat;

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

  void _geserBulan(int delta) {
    final parts = _periodeCtrl.text.trim().split('-');
    final now = DateTime.now();
    final tahun =
        parts.length == 2 ? (int.tryParse(parts[0]) ?? now.year) : now.year;
    final bulan =
        parts.length == 2 ? (int.tryParse(parts[1]) ?? now.month) : now.month;
    final target = DateTime(tahun, bulan + delta, 1);
    _periodeCtrl.text =
        '${target.year}-${target.month.toString().padLeft(2, '0')}';
    _muat();
  }

  Future<void> _muat() async {
    setState(() {
      _memuat = true;
      _galat = null;
    });
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(
        () => k.dio.get(
          '/laporan-keuangan/$_tab',
          queryParameters: {'periode': _periodeCtrl.text.trim()},
        ),
      );
      if (mounted) {
        setState(() => _data = res.data['data'] as Map<String, dynamic>);
      }
    } on GalatApi catch (g) {
      if (mounted) setState(() => _galat = g.pesan);
    } catch (_) {
      if (mounted) setState(() => _galat = 'Gagal memuat laporan keuangan.');
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Widget _buildSegmentedTabs() {
    const tabs = [
      ('neraca-saldo', 'Neraca Saldo', LucideIcons.scale),
      ('laba-rugi', 'Laba Rugi', LucideIcons.trendingUp),
    ];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(TokenRadius.sedang),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: tabs.map((t) {
          final aktif = _tab == t.$1;
          return Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(TokenRadius.kecil),
              onTap: () {
                if (_tab == t.$1) return;
                setState(() {
                  _tab = t.$1;
                  _data = null;
                });
                _muat();
              },
              child: AnimatedContainer(
                duration: AppMotion.fast,
                padding: const EdgeInsets.symmetric(
                  horizontal: TokenJarak.j3,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: aktif ? AppColors.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(TokenRadius.kecil),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      t.$3,
                      size: 16,
                      color: aktif
                          ? AppColors.textOnPrimary
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      t.$2,
                      style: TokenTipografi.tabel.copyWith(
                        fontWeight: FontWeight.w600,
                        color: aktif
                            ? AppColors.textOnPrimary
                            : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildNeracaSaldo(Map<String, dynamic> data) {
    final baris = (data['baris'] as List? ?? const []);
    final totalDebit = (data['total_debit'] as num?)?.toInt() ?? 0;
    final totalKredit = (data['total_kredit'] as num?)?.toInt() ?? 0;
    final statusPeriode = (data['status_periode'] as String?) ?? 'terbuka';
    final seimbang = totalDebit == totalKredit;

    if (baris.isEmpty) {
      return EmptyState(
        ikon: LucideIcons.scale,
        judul: 'Belum ada transaksi di periode ini',
        keterangan:
            'Neraca saldo akan tampil otomatis setelah ada jurnal transaksi pada periode ${_periodeCtrl.text.trim()}.',
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        TokenJarak.j4,
        TokenJarak.j2,
        TokenJarak.j4,
        TokenJarak.j6,
      ),
      children: [
        Wrap(
          spacing: TokenJarak.j2,
          runSpacing: TokenJarak.j2,
          children: [
            StatusBadge(
              label: seimbang ? 'Seimbang' : 'Tidak Seimbang',
              varian: seimbang ? VarianStatus.success : VarianStatus.danger,
            ),
            StatusBadge(
              label: statusPeriode == 'ditutup'
                  ? 'Periode Ditutup'
                  : 'Periode Terbuka',
              varian: statusPeriode == 'ditutup'
                  ? VarianStatus.neutral
                  : VarianStatus.info,
            ),
          ],
        ),
        const SizedBox(height: TokenJarak.j3),
        Row(
          children: [
            Expanded(
              child: KpiCard(
                label: 'Total Debit',
                nilai: formatRupiah(totalDebit),
                hero: true,
              ),
            ),
            const SizedBox(width: TokenJarak.j3),
            Expanded(
              child: KpiCard(
                label: 'Total Kredit',
                nilai: formatRupiah(totalKredit),
              ),
            ),
          ],
        ),
        const SizedBox(height: TokenJarak.j4),
        const SectionHeader(judul: 'Rincian Saldo Akun'),
        const SizedBox(height: TokenJarak.j2),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(TokenRadius.besar),
            border: Border.all(color: AppColors.border),
            boxShadow: AppShadows.card,
          ),
          clipBehavior: Clip.antiAlias,
          child: TabelBarisPos(
            kepala: const ['Akun', 'Debit', 'Kredit'],
            rataKanan: const [false, true, true],
            baris: [
              ...baris.map((raw) {
                final b = raw as Map<String, dynamic>;
                return [
                  '${b['akun_kode']} · ${b['akun_nama']}',
                  formatRupiah((b['debit'] as num).toInt()),
                  formatRupiah((b['kredit'] as num).toInt()),
                ];
              }),
              [
                'TOTAL',
                formatRupiah(totalDebit),
                formatRupiah(totalKredit),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLabaRugi(Map<String, dynamic> data) {
    final pendapatan = (data['pendapatan'] as List? ?? const []);
    final beban = (data['beban'] as List? ?? const []);
    final totalPendapatan = (data['total_pendapatan'] as num?)?.toInt() ?? 0;
    final totalBeban = (data['total_beban'] as num?)?.toInt() ?? 0;
    final labaKotor = (data['laba_kotor'] as num?)?.toInt() ?? 0;
    final labaBersih = (data['laba_bersih'] as num?)?.toInt() ?? 0;
    final marginPersen = totalPendapatan > 0
        ? (labaBersih * 100 / totalPendapatan).toStringAsFixed(1)
        : null;

    if (pendapatan.isEmpty && beban.isEmpty) {
      return EmptyState(
        ikon: LucideIcons.trendingUp,
        judul: 'Belum ada pendapatan atau beban',
        keterangan:
            'Laporan laba rugi akan terisi otomatis dari transaksi penjualan dan beban pada periode ${_periodeCtrl.text.trim()}.',
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        TokenJarak.j4,
        TokenJarak.j2,
        TokenJarak.j4,
        TokenJarak.j6,
      ),
      children: [
        KpiCard(
          label: 'Laba Bersih (${_periodeCtrl.text.trim()})',
          nilai: formatRupiah(labaBersih),
          hero: true,
          delta: marginPersen != null ? 'Margin $marginPersen%' : null,
          deltaPositif: labaBersih >= 0,
          catatan: 'Laba kotor: ${formatRupiah(labaKotor)}',
        ),
        const SizedBox(height: TokenJarak.j3),
        Row(
          children: [
            Expanded(
              child: KpiCard(
                label: 'Total Pendapatan',
                nilai: formatRupiah(totalPendapatan),
              ),
            ),
            const SizedBox(width: TokenJarak.j3),
            Expanded(
              child: KpiCard(
                label: 'Total Beban & HPP',
                nilai: formatRupiah(totalBeban),
              ),
            ),
          ],
        ),
        const SizedBox(height: TokenJarak.j4),
        const SectionHeader(judul: 'Pendapatan'),
        const SizedBox(height: TokenJarak.j2),
        _KartuRincianAkun(
          item: pendapatan,
          labelTotal: 'Subtotal Pendapatan',
          total: totalPendapatan,
          warnaNilai: AppColors.success,
        ),
        const SizedBox(height: TokenJarak.j4),
        const SectionHeader(judul: 'Beban & HPP'),
        const SizedBox(height: TokenJarak.j2),
        _KartuRincianAkun(
          item: beban,
          labelTotal: 'Subtotal Beban & HPP',
          total: totalBeban,
          warnaNilai: AppColors.textPrimary,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Keuangan'),
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.fromLTRB(
              TokenJarak.j4,
              TokenJarak.j3,
              TokenJarak.j4,
              TokenJarak.j3,
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    IconButton(
                      tooltip: 'Bulan sebelumnya',
                      onPressed: () => _geserBulan(-1),
                      icon: const Icon(LucideIcons.chevronLeft, size: 18),
                    ),
                    Expanded(
                      child: IsianTeksPos(
                        controller: _periodeCtrl,
                        label: 'Periode (YYYY-MM)',
                      ),
                    ),
                    IconButton(
                      tooltip: 'Bulan berikutnya',
                      onPressed: () => _geserBulan(1),
                      icon: const Icon(LucideIcons.chevronRight, size: 18),
                    ),
                    const SizedBox(width: TokenJarak.j1),
                    TombolPos(label: 'Muat', penuh: false, onPressed: _muat),
                  ],
                ),
                const SizedBox(height: TokenJarak.j3),
                _buildSegmentedTabs(),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: _memuat
                ? const SkeletonLoader(jumlahBaris: 5, tinggiKartu: 72)
                : _galat != null
                    ? ErrorState(pesan: _galat!, onCobaLagi: _muat)
                    : _data == null
                        ? const SkeletonLoader(jumlahBaris: 4, tinggiKartu: 72)
                        : _tab == 'neraca-saldo'
                            ? _buildNeracaSaldo(_data!)
                            : _buildLabaRugi(_data!),
          ),
        ],
      ),
    );
  }
}

class _KartuRincianAkun extends StatelessWidget {
  final List item;
  final String labelTotal;
  final int total;
  final Color warnaNilai;

  const _KartuRincianAkun({
    required this.item,
    required this.labelTotal,
    required this.total,
    required this.warnaNilai,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(TokenRadius.besar),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        children: [
          if (item.isEmpty)
            Padding(
              padding: const EdgeInsets.all(TokenJarak.j4),
              child: Text(
                'Tidak ada catatan pada bagian ini.',
                style: TokenTipografi.tabel
                    .copyWith(color: AppColors.textSecondary),
              ),
            )
          else
            ...item.asMap().entries.map((entry) {
              final r = entry.value as Map<String, dynamic>;
              final kode = r['akun_kode'] as String?;
              final nama = (r['akun_nama'] as String?) ?? '-';
              final jumlah = (r['jumlah'] as num?)?.toInt() ?? 0;
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: TokenJarak.j4,
                  vertical: TokenJarak.j3,
                ),
                decoration: BoxDecoration(
                  border: entry.key == 0
                      ? null
                      : const Border(
                          top: BorderSide(color: AppColors.border),
                        ),
                ),
                child: Row(
                  children: [
                    if (kode != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceAlt,
                          borderRadius:
                              BorderRadius.circular(TokenRadius.kecil),
                        ),
                        child: Text(
                          kode,
                          style: TokenTipografi.angkaTabular(
                            TokenTipografi.keterangan,
                          ).copyWith(color: AppColors.textSecondary),
                        ),
                      ),
                      const SizedBox(width: TokenJarak.j2),
                    ],
                    Expanded(
                      child: Text(
                        nama,
                        style: TokenTipografi.tabel.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(width: TokenJarak.j2),
                    Text(
                      formatRupiah(jumlah),
                      style: TokenTipografi.angkaTabular(TokenTipografi.tabel)
                          .copyWith(
                        fontWeight: FontWeight.w600,
                        color: warnaNilai,
                      ),
                    ),
                  ],
                ),
              );
            }),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: TokenJarak.j4,
              vertical: TokenJarak.j3,
            ),
            decoration: const BoxDecoration(
              color: AppColors.surfaceAlt,
              borderRadius: BorderRadius.vertical(
                bottom: Radius.circular(TokenRadius.besar),
              ),
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  labelTotal,
                  style: TokenTipografi.tabel.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  formatRupiah(total),
                  style: TokenTipografi.angkaTabular(TokenTipografi.tabel)
                      .copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class LayarSaldoAwal extends ConsumerStatefulWidget {
  const LayarSaldoAwal({super.key});

  @override
  ConsumerState<LayarSaldoAwal> createState() => _LayarSaldoAwalState();
}

class _LayarSaldoAwalState extends ConsumerState<LayarSaldoAwal> {
  final _tglCtrl = TextEditingController(
      text: DateTime.now().toIso8601String().substring(0, 10));
  final _kasCtrl = TextEditingController(text: '0');
  final _bankCtrl = TextEditingController(text: '0');
  final _peralatanCtrl = TextEditingController(text: '0');
  final _utangCtrl = TextEditingController(text: '0');
  String? _pesan;
  bool _memuat = false;

  int get _modalTerhitung =>
      parseRupiahInput(_kasCtrl.text) +
      parseRupiahInput(_bankCtrl.text) +
      parseRupiahInput(_peralatanCtrl.text) -
      parseRupiahInput(_utangCtrl.text);

  Future<void> _simpan() async {
    setState(() {
      _memuat = true;
      _pesan = null;
    });
    try {
      final k = ref.read(klienApiProvider);
      await k.kirim(() => k.dio.post('/saldo-awal', data: {
            'tanggal': _tglCtrl.text.trim(),
            'akun': [
              {'kode': '1110', 'saldo': parseRupiahInput(_kasCtrl.text)},
              {'kode': '1120', 'saldo': parseRupiahInput(_bankCtrl.text)},
              {'kode': '1210', 'saldo': parseRupiahInput(_peralatanCtrl.text)},
              {'kode': '2110', 'saldo': parseRupiahInput(_utangCtrl.text)},
            ],
            'stok': [],
          }));
      if (mounted) setState(() => _pesan = 'Saldo awal berhasil disimpan.');
    } on GalatApi catch (g) {
      if (mounted) setState(() => _pesan = g.pesan);
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Saldo Awal')),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          if (_pesan != null) ...[
            PesanPos(jenis: JenisPesan.informasi, teks: _pesan!),
            const SizedBox(height: TokenJarak.j3),
          ],
          IsianTeksPos(controller: _tglCtrl, label: 'Tanggal (YYYY-MM-DD)'),
          const SizedBox(height: TokenJarak.j3),
          IsianRupiahPos(
              controller: _kasCtrl,
              label: '1110 Kas',
              onChangedNominal: (_) => setState(() {})),
          const SizedBox(height: TokenJarak.j3),
          IsianRupiahPos(
              controller: _bankCtrl,
              label: '1120 Bank & QRIS',
              onChangedNominal: (_) => setState(() {})),
          const SizedBox(height: TokenJarak.j3),
          IsianRupiahPos(
              controller: _peralatanCtrl,
              label: '1210 Peralatan',
              onChangedNominal: (_) => setState(() {})),
          const SizedBox(height: TokenJarak.j3),
          IsianRupiahPos(
              controller: _utangCtrl,
              label: '2110 Utang Usaha',
              onChangedNominal: (_) => setState(() {})),
          const SizedBox(height: TokenJarak.j4),
          Text(
            'Modal Terhitung: ${formatRupiah(_modalTerhitung)}',
            style: TokenTipografi.angkaTabular(TokenTipografi.seksi),
          ),
          const SizedBox(height: TokenJarak.j6),
          TombolPos(
              label: 'Simpan Saldo Awal', memuat: _memuat, onPressed: _simpan),
        ],
      ),
    );
  }
}

class LayarJurnalManual extends ConsumerStatefulWidget {
  const LayarJurnalManual({super.key});

  @override
  ConsumerState<LayarJurnalManual> createState() => _LayarJurnalManualState();
}

class _LayarJurnalManualState extends ConsumerState<LayarJurnalManual> {
  String _jenis = 'beban';
  final _tglCtrl = TextEditingController(
      text: DateTime.now().toIso8601String().substring(0, 10));
  final _ketCtrl = TextEditingController();
  final _nominalCtrl = TextEditingController();
  String _debitKode = '5210';
  String _kreditKode = '1110';
  String? _pesan;

  static const _opsiAkun = {
    'bayar_utang': (d: ['2110', '2120'], k: ['1110', '1120']),
    'beban': (d: ['5210', '5220'], k: ['1110', '1120', '2120']),
    'prive': (d: ['3120'], k: ['1110', '1120']),
    'peralatan': (d: ['1210'], k: ['1110', '1120', '2110']),
    'penyesuaian': (
      d: ['5130', '5210', '5220', '5240'],
      k: ['1141', '1211', '2120']
    ),
  };

  Future<void> _simpan() async {
    final nominal = parseRupiahInput(_nominalCtrl.text);
    try {
      final k = ref.read(klienApiProvider);
      await k.kirim(() => k.dio.post('/jurnal-manual', data: {
            'tanggal': _tglCtrl.text.trim(),
            'jenis': _jenis,
            'keterangan': _ketCtrl.text.trim(),
            'baris': [
              {'akun_kode': _debitKode, 'debit': nominal, 'kredit': 0},
              {'akun_kode': _kreditKode, 'debit': 0, 'kredit': nominal},
            ],
          }));
      if (mounted) setState(() => _pesan = 'Jurnal berhasil disimpan.');
    } on GalatApi catch (g) {
      if (mounted) setState(() => _pesan = g.pesan);
    }
  }

  @override
  Widget build(BuildContext context) {
    final aturan = _opsiAkun[_jenis]!;

    return Scaffold(
      appBar: AppBar(title: const Text('Jurnal Manual')),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          if (_pesan != null) ...[
            PesanPos(jenis: JenisPesan.informasi, teks: _pesan!),
            const SizedBox(height: TokenJarak.j3),
          ],
          DropdownButtonFormField<String>(
            initialValue: _jenis,
            decoration: const InputDecoration(labelText: 'Jenis Jurnal'),
            items: const [
              DropdownMenuItem(
                  value: 'bayar_utang', child: Text('Bayar Utang')),
              DropdownMenuItem(value: 'beban', child: Text('Beban')),
              DropdownMenuItem(value: 'prive', child: Text('Prive')),
              DropdownMenuItem(value: 'peralatan', child: Text('Peralatan')),
              DropdownMenuItem(
                  value: 'penyesuaian', child: Text('Penyesuaian')),
            ],
            onChanged: (v) {
              if (v != null) {
                setState(() {
                  _jenis = v;
                  _debitKode = _opsiAkun[v]!.d.first;
                  _kreditKode = _opsiAkun[v]!.k.first;
                });
              }
            },
          ),
          const SizedBox(height: TokenJarak.j3),
          IsianTeksPos(controller: _tglCtrl, label: 'Tanggal (YYYY-MM-DD)'),
          const SizedBox(height: TokenJarak.j3),
          DropdownButtonFormField<String>(
            initialValue: _debitKode,
            decoration: const InputDecoration(labelText: 'Akun Debit'),
            items: aturan.d
                .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                .toList(),
            onChanged: (v) => setState(() => _debitKode = v!),
          ),
          const SizedBox(height: TokenJarak.j3),
          DropdownButtonFormField<String>(
            initialValue: _kreditKode,
            decoration: const InputDecoration(labelText: 'Akun Kredit'),
            items: aturan.k
                .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                .toList(),
            onChanged: (v) => setState(() => _kreditKode = v!),
          ),
          const SizedBox(height: TokenJarak.j3),
          IsianRupiahPos(controller: _nominalCtrl, label: 'Nominal'),
          const SizedBox(height: TokenJarak.j3),
          IsianTeksPos(controller: _ketCtrl, label: 'Keterangan'),
          const SizedBox(height: TokenJarak.j6),
          TombolPos(label: 'Simpan Jurnal', onPressed: _simpan),
        ],
      ),
    );
  }
}

class LayarTutupPeriode extends ConsumerStatefulWidget {
  const LayarTutupPeriode({super.key});

  @override
  ConsumerState<LayarTutupPeriode> createState() => _LayarTutupPeriodeState();
}

class _LayarTutupPeriodeState extends ConsumerState<LayarTutupPeriode> {
  List<Map<String, dynamic>> _daftar = [];
  String? _pesanGalat;

  @override
  void initState() {
    super.initState();
    Future.microtask(_muat);
  }

  Future<void> _muat() async {
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(() => k.dio.get('/periode'));
      if (mounted) {
        setState(() =>
            _daftar = (res.data['data'] as List).cast<Map<String, dynamic>>());
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tutup Periode')),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          if (_pesanGalat != null) ...[
            PesanPos(jenis: JenisPesan.bahaya, teks: _pesanGalat!),
            const SizedBox(height: TokenJarak.j3),
          ],
          ..._daftar.map((p) {
            final periode = p['periode'] as String;
            final status = p['status'] as String;
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(periode, style: TokenTipografi.seksi),
              subtitle: LencanaStatusPos(status: status),
              trailing: status == 'terbuka'
                  ? TombolPos(
                      label: 'Tutup Periode',
                      penuh: false,
                      onPressed: () async {
                        final yakin = await tampilkanDialogPos<bool>(
                          context: context,
                          judul: 'Tutup Periode $periode',
                          isi: const Text(
                              'Periode yang ditutup tidak dapat menerima jurnal baru.'),
                          tombol: [
                            TombolPos(
                              label: 'Batal',
                              jenis: JenisTombol.sekunder,
                              penuh: false,
                              onPressed: () => Navigator.pop(context, false),
                            ),
                            TombolPos(
                              label: 'Tutup Periode',
                              penuh: false,
                              onPressed: () => Navigator.pop(context, true),
                            ),
                          ],
                        );
                        if (yakin != true) return;
                        try {
                          final k = ref.read(klienApiProvider);
                          await k.kirim(
                              () => k.dio.post('/periode/$periode/tutup'));
                          await _muat();
                        } on GalatApi catch (g) {
                          if (mounted) setState(() => _pesanGalat = g.pesan);
                        }
                      },
                    )
                  : null,
            );
          }),
        ],
      ),
    );
  }
}
