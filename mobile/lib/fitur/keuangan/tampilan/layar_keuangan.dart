import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/komponen.dart';
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
    text: '${DateTime.now().year}-${DateTime.now().month.toString().padLeft(2, '0')}',
  );
  Map<String, dynamic>? _data;
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
      final res = await k.kirim(
        () => k.dio.get(
          '/laporan-keuangan/$_tab',
          queryParameters: {'periode': _periodeCtrl.text.trim()},
        ),
      );
      if (mounted) setState(() => _data = res.data['data'] as Map<String, dynamic>);
    } catch (_) {} finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Keuangan')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(TokenJarak.j3),
            child: Row(
              children: [
                Expanded(child: IsianTeksPos(controller: _periodeCtrl, label: 'Periode (YYYY-MM)')),
                const SizedBox(width: TokenJarak.j2),
                TombolPos(label: 'Muat', penuh: false, onPressed: _muat),
              ],
            ),
          ),
          Row(
            children: [
              ('neraca-saldo', 'Neraca Saldo'),
              ('laba-rugi', 'Laba Rugi'),
              ('neraca', 'Neraca'),
            ].map((e) {
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: TokenJarak.j1),
                  child: TombolPos(
                    label: e.$2,
                    jenis: _tab == e.$1 ? JenisTombol.utama : JenisTombol.sekunder,
                    onPressed: () {
                      setState(() => _tab = e.$1);
                      _muat();
                    },
                  ),
                ),
              );
            }).toList(),
          ),
          Expanded(
            child: _memuat || _data == null
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(TokenJarak.j4),
                    children: [
                      if (_tab == 'neraca-saldo') ...[
                        TabelBarisPos(
                          kepala: const ['Akun', 'Debit', 'Kredit'],
                          rataKanan: const [false, true, true],
                          baris: (_data!['baris'] as List).map((raw) {
                            final b = raw as Map<String, dynamic>;
                            return [
                              '${b['akun_kode']} ${b['akun_nama']}',
                              formatRupiah((b['debit'] as num).toInt()),
                              formatRupiah((b['kredit'] as num).toInt()),
                            ];
                          }).toList(),
                        ),
                      ] else if (_tab == 'laba-rugi') ...[
                        Text(
                          'Laba Bersih: ${formatRupiah((_data!['laba_bersih'] as num).toInt())}',
                          style: TokenTipografi.angkaTabular(TokenTipografi.judul),
                        ),
                        const SizedBox(height: TokenJarak.j3),
                        TabelBarisPos(
                          kepala: const ['Akun', 'Jumlah'],
                          rataKanan: const [false, true],
                          baris: [
                            ...(_data!['pendapatan'] as List).map((raw) {
                              final r = raw as Map<String, dynamic>;
                              return [r['akun_nama'] as String, formatRupiah((r['jumlah'] as num).toInt())];
                            }),
                            ...(_data!['beban'] as List).map((raw) {
                              final r = raw as Map<String, dynamic>;
                              return [r['akun_nama'] as String, formatRupiah((r['jumlah'] as num).toInt())];
                            }),
                          ],
                        ),
                      ] else ...[
                        Text(
                          'Total Aset: ${formatRupiah((_data!['total_aset'] as num).toInt())}',
                          style: TokenTipografi.angkaTabular(TokenTipografi.seksi),
                        ),
                        Text(
                          'Kewajiban + Ekuitas: ${formatRupiah((_data!['total_kewajiban'] as num).toInt() + (_data!['total_ekuitas'] as num).toInt())}',
                          style: TokenTipografi.angkaTabular(TokenTipografi.seksi),
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

class LayarSaldoAwal extends ConsumerStatefulWidget {
  const LayarSaldoAwal({super.key});

  @override
  ConsumerState<LayarSaldoAwal> createState() => _LayarSaldoAwalState();
}

class _LayarSaldoAwalState extends ConsumerState<LayarSaldoAwal> {
  final _tglCtrl = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 10));
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
          IsianRupiahPos(controller: _kasCtrl, label: '1110 Kas', onChangedNominal: (_) => setState(() {})),
          const SizedBox(height: TokenJarak.j3),
          IsianRupiahPos(controller: _bankCtrl, label: '1120 Bank & QRIS', onChangedNominal: (_) => setState(() {})),
          const SizedBox(height: TokenJarak.j3),
          IsianRupiahPos(controller: _peralatanCtrl, label: '1210 Peralatan', onChangedNominal: (_) => setState(() {})),
          const SizedBox(height: TokenJarak.j3),
          IsianRupiahPos(controller: _utangCtrl, label: '2110 Utang Usaha', onChangedNominal: (_) => setState(() {})),
          const SizedBox(height: TokenJarak.j4),
          Text(
            'Modal Terhitung: ${formatRupiah(_modalTerhitung)}',
            style: TokenTipografi.angkaTabular(TokenTipografi.seksi),
          ),
          const SizedBox(height: TokenJarak.j6),
          TombolPos(label: 'Simpan Saldo Awal', memuat: _memuat, onPressed: _simpan),
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
  final _tglCtrl = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 10));
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
    'penyesuaian': (d: ['5130', '5210', '5220', '5240'], k: ['1141', '1211', '2120']),
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
            value: _jenis,
            decoration: const InputDecoration(labelText: 'Jenis Jurnal'),
            items: const [
              DropdownMenuItem(value: 'bayar_utang', child: Text('Bayar Utang')),
              DropdownMenuItem(value: 'beban', child: Text('Beban')),
              DropdownMenuItem(value: 'prive', child: Text('Prive')),
              DropdownMenuItem(value: 'peralatan', child: Text('Peralatan')),
              DropdownMenuItem(value: 'penyesuaian', child: Text('Penyesuaian')),
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
            value: _debitKode,
            decoration: const InputDecoration(labelText: 'Akun Debit'),
            items: aturan.d.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
            onChanged: (v) => setState(() => _debitKode = v!),
          ),
          const SizedBox(height: TokenJarak.j3),
          DropdownButtonFormField<String>(
            value: _kreditKode,
            decoration: const InputDecoration(labelText: 'Akun Kredit'),
            items: aturan.k.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
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
        setState(() => _daftar = (res.data['data'] as List).cast<Map<String, dynamic>>());
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
                          isi: const Text('Periode yang ditutup tidak dapat menerima jurnal baru.'),
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
                          await k.kirim(() => k.dio.post('/periode/$periode/tutup'));
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
