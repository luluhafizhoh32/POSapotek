import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/antrean.dart';
import '../../../inti/format.dart';
import '../../../inti/galat.dart';
import '../../../inti/klien_api.dart';

class BatchOpnameItem {
  final int batchId;
  final String barangNama;
  final String satuan;
  final String nomorBatch;
  final String tanggalKedaluwarsa;
  int? stokFisik;
  String keterangan;

  BatchOpnameItem({
    required this.batchId,
    required this.barangNama,
    required this.satuan,
    required this.nomorBatch,
    required this.tanggalKedaluwarsa,
    this.stokFisik,
    this.keterangan = '',
  });
}

class LayarOpname extends ConsumerStatefulWidget {
  const LayarOpname({super.key});

  @override
  ConsumerState<LayarOpname> createState() => _LayarOpnameState();
}

class _LayarOpnameState extends ConsumerState<LayarOpname> {
  List<BatchOpnameItem> _daftar = [];
  String _kunciIdempoten = const Uuid().v4();
  bool _memuat = true;
  bool _menyimpan = false;
  String? _pesanGalat;
  Map<String, dynamic>? _hasilOpname;
  final Set<int> _butuhKeterangan = {};

  @override
  void initState() {
    super.initState();
    Future.microtask(_muat);
  }

  Future<void> _muat() async {
    setState(() => _memuat = true);
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(() => k.dio.get('/opname/daftar-batch'));
      final list = (res.data['data'] as List).cast<Map<String, dynamic>>();
      if (mounted) {
        setState(() {
          _daftar = list.map((r) {
            final brg = r['barang'] as Map<String, dynamic>;
            return BatchOpnameItem(
              batchId: (r['batch_id'] as num).toInt(),
              barangNama: brg['nama'] as String,
              satuan: brg['satuan'] as String,
              nomorBatch: r['nomor_batch'] as String,
              tanggalKedaluwarsa: r['tanggal_kedaluwarsa'] as String,
            );
          }).toList();
        });
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  bool get _semuaTerhitung =>
      _daftar.isNotEmpty && _daftar.every((b) => b.stokFisik != null);

  Future<void> _simpan() async {
    if (!_semuaTerhitung) {
      setState(() => _pesanGalat = 'Semua batch harus dihitung terlebih dahulu.');
      return;
    }

    setState(() {
      _menyimpan = true;
      _pesanGalat = null;
    });

    final payload = {
      'waktu_perangkat': DateTime.now().toIso8601String(),
      'baris': _daftar
          .map((b) => {
                'batch_id': b.batchId,
                'stok_fisik': b.stokFisik!,
                if (b.keterangan.trim().isNotEmpty) 'keterangan': b.keterangan.trim(),
              })
          .toList(),
    };

    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(
        () => k.dio.post(
          '/opname',
          data: payload,
          options: Options(headers: {'Idempotency-Key': _kunciIdempoten}),
        ),
      );
      if (mounted) {
        setState(() {
          _hasilOpname = res.data['data'] as Map<String, dynamic>;
          _kunciIdempoten = const Uuid().v4();
        });
      }
    } on GalatApi catch (g) {
      if (g.adalahGalatJaringan) {
        await ref.read(antreanProvider.notifier).masukkan(
              jenis: 'opname',
              kunciIdempoten: _kunciIdempoten,
              payload: payload,
            );
        if (mounted) {
          setState(() {
            _pesanGalat = null;
            _hasilOpname = {'tertunda': true};
            _kunciIdempoten = const Uuid().v4();
          });
        }
      } else if (g.kode == 'KETERANGAN_WAJIB' && mounted) {
        final ids = ((g.detail['batch_id'] as List?) ?? []).map((e) => (e as num).toInt()).toSet();
        setState(() {
          _butuhKeterangan.addAll(ids);
          // Kunci idempotensi BARU karena isi permintaan akan berubah
          _kunciIdempoten = const Uuid().v4();
          _pesanGalat = 'Batch dengan selisih lebih wajib mengisi keterangan.';
        });
      } else if (mounted) {
        setState(() => _pesanGalat = g.pesan);
      }
    } finally {
      if (mounted) setState(() => _menyimpan = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_hasilOpname != null) {
      final tertunda = _hasilOpname!['tertunda'] == true;
      final ringkasan = _hasilOpname!['ringkasan'] as Map<String, dynamic>?;
      final pengajuan = _hasilOpname!['pengajuan'] as Map<String, dynamic>?;

      return Scaffold(
        appBar: AppBar(title: const Text('Hasil Opname')),
        body: Padding(
          padding: const EdgeInsets.all(TokenJarak.j4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PesanPos(
                jenis: tertunda ? JenisPesan.informasi : JenisPesan.berhasil,
                teks: tertunda
                    ? 'Transaksi tertunda. Akan dikirim otomatis saat tersambung.'
                    : 'Opname ${_hasilOpname!['nomor']} selesai.',
              ),
              if (ringkasan != null) ...[
                const SizedBox(height: TokenJarak.j4),
                Text('Jumlah batch: ${ringkasan['jumlah_batch']}'),
                Text('Sama: ${ringkasan['jumlah_sama']}'),
                Text('Selisih kurang: ${ringkasan['jumlah_selisih_kurang']}'),
                Text('Selisih lebih: ${ringkasan['jumlah_selisih_lebih']}'),
              ],
              if (pengajuan != null) ...[
                const SizedBox(height: TokenJarak.j3),
                Row(
                  children: [
                    Text('Pengajuan ${pengajuan['nomor']}: '),
                    LencanaStatusPos(status: pengajuan['status'] as String),
                  ],
                ),
              ],
              const SizedBox(height: TokenJarak.j6),
              TombolPos(
                label: 'Opname Baru',
                onPressed: () {
                  setState(() {
                    _hasilOpname = null;
                    _butuhKeterangan.clear();
                  });
                  _muat();
                },
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Opname Stok')),
      body: _memuat
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_pesanGalat != null)
                  Padding(
                    padding: const EdgeInsets.all(TokenJarak.j3),
                    child: PesanPos(jenis: JenisPesan.bahaya, teks: _pesanGalat!),
                  ),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(TokenJarak.j4),
                    itemCount: _daftar.length,
                    separatorBuilder: (_, __) => const Divider(),
                    itemBuilder: (ctx, i) {
                      final b = _daftar[i];
                      final sudah = b.stokFisik != null;
                      final wajibKet = _butuhKeterangan.contains(b.batchId);

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${b.barangNama} (${b.nomorBatch})',
                                  style: TokenTipografi.dasar.copyWith(fontWeight: FontWeight.w600),
                                ),
                              ),
                              LencanaStatusPos(status: sudah ? 'disahkan' : 'tertunda'),
                            ],
                          ),
                          Text(
                            'Kedaluwarsa: ${formatTanggal(b.tanggalKedaluwarsa)} · ${b.satuan}',
                            style: TokenTipografi.keterangan,
                          ),
                          const SizedBox(height: TokenJarak.j2),
                          IsianTeksPos(
                            label: 'Jumlah Fisik',
                            keyboardType: TextInputType.number,
                            onChanged: (v) {
                              setState(() {
                                b.stokFisik = int.tryParse(v.trim());
                              });
                            },
                          ),
                          if (wajibKet) ...[
                            const SizedBox(height: TokenJarak.j2),
                            IsianTeksPos(
                              label: 'Keterangan Selisih Lebih (Wajib)',
                              onChanged: (v) => b.keterangan = v,
                            ),
                          ],
                        ],
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(TokenJarak.j4),
                  child: TombolPos(
                    label: 'Selesai Menghitung',
                    memuat: _menyimpan,
                    onPressed: _semuaTerhitung ? _simpan : null,
                  ),
                ),
              ],
            ),
    );
  }
}
