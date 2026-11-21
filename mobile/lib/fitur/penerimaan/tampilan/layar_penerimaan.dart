import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:uuid/uuid.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/antrean.dart';
import '../../../inti/format.dart';
import '../../../inti/galat.dart';
import '../../../inti/klien_api.dart';

class _BarisTerima {
  final int barangId;
  final String barangNama;
  final String nomorBatch;
  final String tanggalKedaluwarsa;
  final int jumlah;
  final int hargaBeli;
  bool gabungKeBatchAda;

  _BarisTerima({
    required this.barangId,
    required this.barangNama,
    required this.nomorBatch,
    required this.tanggalKedaluwarsa,
    required this.jumlah,
    required this.hargaBeli,
  }) : gabungKeBatchAda = false;
}

class LayarPenerimaan extends ConsumerStatefulWidget {
  const LayarPenerimaan({super.key});

  @override
  ConsumerState<LayarPenerimaan> createState() => _LayarPenerimaanState();
}

class _LayarPenerimaanState extends ConsumerState<LayarPenerimaan> {
  List<Map<String, dynamic>> _pemasok = [];
  List<Map<String, dynamic>> _barang = [];
  int? _pemasokId;
  final _fakturCtrl = TextEditingController();
  final _tglFakturCtrl = TextEditingController(
    text: DateTime.now().toIso8601String().substring(0, 10),
  );
  final List<_BarisTerima> _baris = [];
  String? _fotoPath;
  Uint8List? _fotoBytes;
  String? _fotoNama;
  String _kunciIdempoten = const Uuid().v4();
  bool _memuat = false;
  String? _pesanGalat;
  String? _pesanSukses;
  String? _peringatanFaktur;

  @override
  void initState() {
    super.initState();
    Future.microtask(_muatMaster);
  }

  @override
  void dispose() {
    _fakturCtrl.dispose();
    _tglFakturCtrl.dispose();
    super.dispose();
  }

  Future<void> _muatMaster() async {
    try {
      final k = ref.read(klienApiProvider);
      final resP = await k.kirim(
          () => k.dio.get('/pemasok', queryParameters: {'per_halaman': 100}));
      final resB = await k.kirim(
          () => k.dio.get('/barang', queryParameters: {'per_halaman': 100}));
      if (mounted) {
        setState(() {
          _pemasok = (resP.data['data'] as List).cast<Map<String, dynamic>>();
          _barang = (resB.data['data'] as List).cast<Map<String, dynamic>>();
        });
      }
    } catch (_) {}
  }

  Future<void> _cekFaktur() async {
    if (_pemasokId == null || _fakturCtrl.text.trim().isEmpty) return;
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(
        () => k.dio.get(
          '/penerimaan/cek-faktur',
          queryParameters: {
            'pemasok_id': _pemasokId,
            'nomor_faktur': _fakturCtrl.text.trim(),
          },
        ),
      );
      final d = res.data['data'] as Map<String, dynamic>;
      if (mounted) {
        setState(() {
          _peringatanFaktur = d['ada'] == true
              ? 'Nomor faktur ini sudah pernah dicatat.'
              : null;
        });
      }
    } catch (_) {}
  }

  Future<void> _ambilFoto() async {
    final picker = ImagePicker();
    final xfile = await picker.pickImage(
      source: kIsWeb ? ImageSource.gallery : ImageSource.camera,
      maxWidth: 1600,
      maxHeight: 1600,
      imageQuality: 80,
    );
    if (xfile != null) {
      final bytes = await xfile.readAsBytes();
      if (mounted) {
        setState(() {
          _fotoPath = xfile.path;
          _fotoBytes = bytes;
          _fotoNama = xfile.name.isNotEmpty ? xfile.name : 'faktur.jpg';
        });
      }
    }
  }

  Future<void> _tambahBarisDialog() async {
    if (_barang.isEmpty) return;
    int selectedBarangId = (_barang.first['id'] as num).toInt();
    final batchCtrl = TextEditingController();
    final expCtrl = TextEditingController(text: '2027-12-31');
    final jmlCtrl = TextEditingController();
    final hargaCtrl = TextEditingController();

    final ok = await tampilkanDialogPos<bool>(
      context: context,
      judul: 'Tambah Barang Diterima',
      isi: SizedBox(
        width: 320,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<int>(
                initialValue: selectedBarangId,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Barang'),
                items: _barang
                    .map((b) => DropdownMenuItem<int>(
                          value: (b['id'] as num).toInt(),
                          child: Text(b['nama'] as String,
                              overflow: TextOverflow.ellipsis),
                        ))
                    .toList(),
                onChanged: (v) {
                  if (v != null) selectedBarangId = v;
                },
              ),
              const SizedBox(height: TokenJarak.j2),
              IsianTeksPos(controller: batchCtrl, label: 'Nomor Batch'),
              const SizedBox(height: TokenJarak.j2),
              IsianTeksPos(
                  controller: expCtrl,
                  label: 'Tanggal Kedaluwarsa (YYYY-MM-DD)'),
              const SizedBox(height: TokenJarak.j2),
              IsianTeksPos(
                controller: jmlCtrl,
                label: 'Jumlah',
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: TokenJarak.j2),
              IsianRupiahPos(controller: hargaCtrl, label: 'Harga Beli Satuan'),
            ],
          ),
        ),
      ),
      tombol: [
        TombolPos(
          label: 'Batal',
          jenis: JenisTombol.sekunder,
          penuh: false,
          onPressed: () => Navigator.pop(context, false),
        ),
        TombolPos(
          label: 'Tambah',
          penuh: false,
          onPressed: () => Navigator.pop(context, true),
        ),
      ],
    );

    if (ok != true) return;
    final brg =
        _barang.firstWhere((b) => (b['id'] as num).toInt() == selectedBarangId);
    final jml = int.tryParse(jmlCtrl.text.trim()) ?? 0;
    final harga = parseRupiahInput(hargaCtrl.text);
    if (batchCtrl.text.trim().isEmpty || jml <= 0) return;

    if (mounted) {
      setState(() {
        _baris.add(_BarisTerima(
          barangId: selectedBarangId,
          barangNama: brg['nama'] as String,
          nomorBatch: batchCtrl.text.trim(),
          tanggalKedaluwarsa: expCtrl.text.trim(),
          jumlah: jml,
          hargaBeli: harga,
        ));
      });
    }
  }

  Future<void> _simpan() async {
    if (_pemasokId == null ||
        _fakturCtrl.text.trim().isEmpty ||
        _baris.isEmpty ||
        _fotoPath == null) {
      setState(() => _pesanGalat =
          'Lengkapi pemasok, nomor faktur, minimal 1 barang, dan foto faktur.');
      return;
    }

    setState(() {
      _memuat = true;
      _pesanGalat = null;
      _pesanSukses = null;
    });

    final payload = {
      'pemasok_id': _pemasokId,
      'nomor_faktur': _fakturCtrl.text.trim(),
      'tanggal_faktur': _tglFakturCtrl.text.trim(),
      'waktu_perangkat': DateTime.now().toIso8601String(),
      'baris': _baris
          .map((b) => {
                'barang_id': b.barangId,
                'nomor_batch': b.nomorBatch,
                'tanggal_kedaluwarsa': b.tanggalKedaluwarsa,
                'jumlah': b.jumlah,
                'harga_beli': b.hargaBeli,
                'gabung_ke_batch_ada': b.gabungKeBatchAda,
              })
          .toList(),
    };

    try {
      final k = ref.read(klienApiProvider);
      final form = FormData.fromMap({
        'jenis': 'faktur',
        'berkas': MultipartFile.fromBytes(_fotoBytes!, filename: _fotoNama ?? 'faktur.jpg'),
      });
      final upRes = await k.kirim(() => k.dio.post('/lampiran', data: form));
      final lampiranId =
          (upRes.data['data'] as Map<String, dynamic>)['id'] as String;
      payload['lampiran_id'] = lampiranId;

      await k.kirim(
        () => k.dio.post(
          '/penerimaan',
          data: payload,
          options: Options(headers: {'Idempotency-Key': _kunciIdempoten}),
        ),
      );
      if (mounted) {
        setState(() {
          _pesanSukses = 'Penerimaan barang berhasil disimpan.';
          _baris.clear();
          _fakturCtrl.clear();
          _fotoPath = null;
          _kunciIdempoten = const Uuid().v4();
        });
      }
    } on GalatApi catch (g) {
      if (g.adalahGalatJaringan) {
        await ref.read(antreanProvider.notifier).masukkan(
              jenis: 'penerimaan',
              kunciIdempoten: _kunciIdempoten,
              payload: payload,
              lampiranPath: _fotoPath,
              lampiranJenis: 'faktur',
            );
        if (mounted) {
          setState(() {
            _pesanSukses =
                'Transaksi tertunda. Akan dikirim otomatis saat tersambung.';
            _baris.clear();
            _fakturCtrl.clear();
            _fotoPath = null;
            _kunciIdempoten = const Uuid().v4();
          });
        }
      } else if (g.kode == 'BATCH_SUDAH_ADA' && mounted) {
        final idx = (g.detail['indeks'] as num?)?.toInt() ?? 0;
        final stokBatch =
            ((g.detail['batch'] as Map?)?['stok'] as num?)?.toInt() ?? 0;
        final gabung = await tampilkanDialogPos<bool>(
          context: context,
          judul: 'Batch Sudah Ada',
          isi: Text(
              'Batch sudah ada (stok $stokBatch). Tambahkan ke batch ini?'),
          tombol: [
            TombolPos(
              label: 'Ubah Nomor Batch',
              jenis: JenisTombol.sekunder,
              penuh: false,
              onPressed: () => Navigator.pop(context, false),
            ),
            TombolPos(
              label: 'Ya',
              penuh: false,
              onPressed: () => Navigator.pop(context, true),
            ),
          ],
        );
        if (gabung == true && idx < _baris.length) {
          _baris[idx].gabungKeBatchAda = true;
          await _simpan();
        }
      } else if (mounted) {
        setState(() => _pesanGalat = g.pesan);
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Penerimaan Barang')),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          if (_pesanGalat != null) ...[
            PesanPos(jenis: JenisPesan.bahaya, teks: _pesanGalat!),
            const SizedBox(height: TokenJarak.j3),
          ],
          if (_pesanSukses != null) ...[
            PesanPos(jenis: JenisPesan.berhasil, teks: _pesanSukses!),
            const SizedBox(height: TokenJarak.j3),
          ],
          DropdownButtonFormField<int>(
            initialValue: _pemasokId,
            decoration: const InputDecoration(labelText: 'Pemasok (PBF)'),
            items: _pemasok
                .map((p) => DropdownMenuItem<int>(
                      value: (p['id'] as num).toInt(),
                      child: Text(p['nama'] as String),
                    ))
                .toList(),
            onChanged: (v) => setState(() => _pemasokId = v),
          ),
          const SizedBox(height: TokenJarak.j3),
          IsianTeksPos(
            controller: _fakturCtrl,
            label: 'Nomor Faktur',
            pesanSalah: _peringatanFaktur,
            onEditingComplete: _cekFaktur,
          ),
          const SizedBox(height: TokenJarak.j3),
          IsianTeksPos(
              controller: _tglFakturCtrl, label: 'Tanggal Faktur (YYYY-MM-DD)'),
          const SizedBox(height: TokenJarak.j4),
          Row(
            children: [
              const Expanded(
                  child: Text('Daftar Barang', style: TokenTipografi.seksi)),
              TombolPos(
                label: 'Tambah',
                ikon: LucideIcons.plus,
                jenis: JenisTombol.sekunder,
                penuh: false,
                onPressed: _tambahBarisDialog,
              ),
            ],
          ),
          const SizedBox(height: TokenJarak.j2),
          ..._baris.map((b) {
            final expDt = DateTime.tryParse(b.tanggalKedaluwarsa);
            final sisaHari =
                expDt != null ? expDt.difference(DateTime.now()).inDays : 0;
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${b.barangNama} (${b.nomorBatch})'),
              subtitle: Text(
                  '${b.jumlah} x ${formatRupiah(b.hargaBeli)} · Sisa $sisaHari hari'),
              trailing: Text(
                formatRupiah(b.jumlah * b.hargaBeli),
                style: TokenTipografi.angkaTabular(TokenTipografi.dasar),
              ),
            );
          }),
          const SizedBox(height: TokenJarak.j4),
          TombolPos(
            label: _fotoPath == null
                ? 'Ambil Foto Faktur (Wajib)'
                : 'Foto Faktur Tersimpan',
            ikon: LucideIcons.camera,
            jenis: JenisTombol.sekunder,
            onPressed: _ambilFoto,
          ),
          if (_fotoBytes != null) ...[
            const SizedBox(height: TokenJarak.j2),
            Image.memory(_fotoBytes!, height: 120, fit: BoxFit.cover),
          ],
          const SizedBox(height: TokenJarak.j6),
          TombolPos(
              label: 'Simpan Penerimaan', memuat: _memuat, onPressed: _simpan),
        ],
      ),
    );
  }
}
