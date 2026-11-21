import 'package:dio/dio.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:uuid/uuid.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/antrean.dart';
import '../../../inti/format.dart';
import '../../../inti/galat.dart';
import '../../../inti/klien_api.dart';

enum _TahapOpname { menghitung, tinjauan, hasil }

class BatchOpnameItem {
  final int batchId;
  final String barangNama;
  final String satuan;
  final String nomorBatch;
  final String tanggalKedaluwarsa;
  final TextEditingController fisikCtrl;
  int? stokFisik;

  BatchOpnameItem({
    required this.batchId,
    required this.barangNama,
    required this.satuan,
    required this.nomorBatch,
    required this.tanggalKedaluwarsa,
    this.stokFisik,
  }) : fisikCtrl = TextEditingController(
          text: stokFisik != null ? '$stokFisik' : '',
        );

  void dispose() {
    fisikCtrl.dispose();
  }
}

class _BarisTinjauan {
  final int batchId;
  final String barangNama;
  final String satuan;
  final String nomorBatch;
  final int stokSistem;
  final int stokFisik;
  final int selisih;
  final int nilaiSelisih;
  final TextEditingController keteranganCtrl;

  _BarisTinjauan({
    required this.batchId,
    required this.barangNama,
    required this.satuan,
    required this.nomorBatch,
    required this.stokSistem,
    required this.stokFisik,
    required this.selisih,
    required this.nilaiSelisih,
    String keteranganAwal = '',
  }) : keteranganCtrl = TextEditingController(text: keteranganAwal);

  void dispose() {
    keteranganCtrl.dispose();
  }
}

class LayarOpname extends ConsumerStatefulWidget {
  const LayarOpname({super.key});

  @override
  ConsumerState<LayarOpname> createState() => _LayarOpnameState();
}

class _LayarOpnameState extends ConsumerState<LayarOpname> {
  _TahapOpname _tahap = _TahapOpname.menghitung;
  List<BatchOpnameItem> _daftar = [];
  List<_BarisTinjauan> _barisTinjauan = [];
  List<BatchOpnameItem> _daftarBelumDihitung = [];
  String _kunciIdempoten = const Uuid().v4();
  bool _memuat = true;
  bool _memuatTinjauan = false;
  bool _menyimpan = false;
  String? _pesanGalatHitung;
  String? _pesanGalatTinjauan;
  Map<String, dynamic>? _hasilOpname;

  @override
  void initState() {
    super.initState();
    Future.microtask(_muat);
  }

  @override
  void dispose() {
    for (final b in _daftar) {
      b.dispose();
    }
    for (final t in _barisTinjauan) {
      t.dispose();
    }
    super.dispose();
  }

  void _bersihkanTinjauan() {
    for (final t in _barisTinjauan) {
      t.dispose();
    }
    _barisTinjauan = [];
    _pesanGalatTinjauan = null;
  }

  Future<void> _muat() async {
    setState(() {
      _memuat = true;
      _pesanGalatHitung = null;
      _daftarBelumDihitung = [];
    });
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(() => k.dio.get('/opname/daftar-batch'));
      final list = (res.data['data'] as List).cast<Map<String, dynamic>>();
      if (mounted) {
        for (final b in _daftar) {
          b.dispose();
        }
        _bersihkanTinjauan();
        setState(() {
          _tahap = _TahapOpname.menghitung;
          _hasilOpname = null;
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
    } on GalatApi catch (g) {
      if (mounted) setState(() => _pesanGalatHitung = g.pesan);
    } catch (_) {
      if (mounted) {
        setState(() => _pesanGalatHitung = 'Gagal memuat daftar batch opname.');
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _selesaiMenghitung() async {
    final belum = _daftar.where((b) => b.stokFisik == null).toList();
    if (belum.isNotEmpty) {
      setState(() {
        _daftarBelumDihitung = belum;
        _pesanGalatHitung = 'Masih ada batch yang belum dihitung';
      });
      return;
    }

    setState(() {
      _memuatTinjauan = true;
      _pesanGalatHitung = null;
      _daftarBelumDihitung = [];
    });

    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(
        () => k.dio.post(
          '/opname/tinjau',
          data: {
            'baris': _daftar
                .map((b) => {
                      'batch_id': b.batchId,
                      'stok_fisik': b.stokFisik!,
                    })
                .toList(),
          },
        ),
      );
      final data = res.data['data'] as Map<String, dynamic>;
      final barisJson = (data['baris'] as List).cast<Map<String, dynamic>>();

      if (mounted) {
        _bersihkanTinjauan();
        setState(() {
          _barisTinjauan = barisJson.map((r) {
            final brg = r['barang'] as Map<String, dynamic>;
            return _BarisTinjauan(
              batchId: (r['batch_id'] as num).toInt(),
              barangNama: brg['nama'] as String,
              satuan: brg['satuan'] as String,
              nomorBatch: r['nomor_batch'] as String,
              stokSistem: (r['stok_sistem'] as num).toInt(),
              stokFisik: (r['stok_fisik'] as num).toInt(),
              selisih: (r['selisih'] as num).toInt(),
              nilaiSelisih: (r['nilai_selisih'] as num).toInt(),
            );
          }).toList();
          _tahap = _TahapOpname.tinjauan;
        });
      }
    } on GalatApi catch (g) {
      if (mounted) {
        if (g.kode == 'BATCH_BELUM_DIHITUNG') {
          setState(() {
            _pesanGalatHitung =
                'Masih ada batch baru yang belum dihitung. Muat ulang daftar batch terlebih dahulu.';
          });
        } else {
          setState(() => _pesanGalatHitung = g.pesan);
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() => _pesanGalatHitung =
            'Gagal memuat tinjauan selisih. Periksa koneksi ke server.');
      }
    } finally {
      if (mounted) setState(() => _memuatTinjauan = false);
    }
  }

  Future<void> _simpanOpname() async {
    final lebihKosong = _barisTinjauan
        .where((b) => b.selisih > 0 && b.keteranganCtrl.text.trim().isEmpty)
        .toList();
    if (lebihKosong.isNotEmpty) {
      setState(() {
        _pesanGalatTinjauan =
            'Batch dengan selisih lebih wajib mengisi keterangan';
      });
      return;
    }

    setState(() {
      _menyimpan = true;
      _pesanGalatTinjauan = null;
    });

    final payload = {
      'waktu_perangkat': DateTime.now().toIso8601String(),
      'baris': _barisTinjauan
          .map((b) => {
                'batch_id': b.batchId,
                'stok_fisik': b.stokFisik,
                if (b.selisih > 0 && b.keteranganCtrl.text.trim().isNotEmpty)
                  'keterangan': b.keteranganCtrl.text.trim(),
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
          _tahap = _TahapOpname.hasil;
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
            _pesanGalatTinjauan = null;
            _hasilOpname = {'tertunda': true};
            _kunciIdempoten = const Uuid().v4();
            _tahap = _TahapOpname.hasil;
          });
        }
      } else if (g.kode == 'KETERANGAN_WAJIB' && mounted) {
        setState(() {
          _kunciIdempoten = const Uuid().v4();
          _pesanGalatTinjauan =
              'Batch dengan selisih lebih wajib mengisi keterangan';
        });
      } else if (mounted) {
        setState(() => _pesanGalatTinjauan = g.pesan);
      }
    } finally {
      if (mounted) setState(() => _menyimpan = false);
    }
  }

  Widget _buildTahapMenghitung() {
    final sudahCount = _daftar.where((b) => b.stokFisik != null).length;

    return Scaffold(
      appBar: AppBar(title: const Text('Opname Stok')),
      body: _memuat
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_daftar.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      TokenJarak.j4,
                      TokenJarak.j3,
                      TokenJarak.j4,
                      0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Tahap 1 · Hitung Fisik',
                          style: TokenTipografi.tabel.copyWith(
                            fontWeight: FontWeight.w600,
                            color: TokenTeks.sekunder,
                          ),
                        ),
                        Text(
                          '$sudahCount / ${_daftar.length} batch',
                          style: TokenTipografi.angkaTabular(
                            TokenTipografi.tabel,
                          ).copyWith(
                            fontWeight: FontWeight.w600,
                            color: TokenAksi.utama,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (_pesanGalatHitung != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      TokenJarak.j4,
                      TokenJarak.j3,
                      TokenJarak.j4,
                      0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        PesanPos(
                          jenis: JenisPesan.bahaya,
                          teks: _pesanGalatHitung!,
                        ),
                        if (_daftarBelumDihitung.isNotEmpty)
                          Container(
                            margin: const EdgeInsets.only(top: TokenJarak.j2),
                            padding: const EdgeInsets.all(TokenJarak.j3),
                            decoration: BoxDecoration(
                              color: TokenStatus.bahayaLatar,
                              borderRadius:
                                  BorderRadius.circular(TokenRadius.kecil),
                              border: Border.all(
                                color: TokenStatus.bahayaTeks
                                    .withValues(alpha: 0.3),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: _daftarBelumDihitung
                                  .map(
                                    (b) => Padding(
                                      padding: const EdgeInsets.only(bottom: 2),
                                      child: Text(
                                        '• ${b.barangNama} (${b.nomorBatch})',
                                        style:
                                            TokenTipografi.keterangan.copyWith(
                                          color: TokenStatus.bahayaTeks,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  )
                                  .toList(),
                            ),
                          ),
                      ],
                    ),
                  ),
                Expanded(
                  child: _daftar.isEmpty
                      ? const Center(
                          child: Text(
                            'Tidak ada batch berstok untuk diopname.',
                            style: TokenTipografi.dasar,
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(TokenJarak.j4),
                          itemCount: _daftar.length,
                          separatorBuilder: (_, __) => const Divider(),
                          itemBuilder: (ctx, i) {
                            final b = _daftar[i];
                            final sudah = b.stokFisik != null;

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '${b.barangNama} (${b.nomorBatch})',
                                        style: TokenTipografi.dasar.copyWith(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: TokenJarak.j2),
                                    LencanaStatusPos(
                                      status: sudah
                                          ? 'sudah_dihitung'
                                          : 'belum_dihitung',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Kedaluwarsa: ${formatTanggal(b.tanggalKedaluwarsa)} · ${b.satuan}',
                                  style: TokenTipografi.keterangan,
                                ),
                                const SizedBox(height: TokenJarak.j2),
                                IsianTeksPos(
                                  controller: b.fisikCtrl,
                                  label: 'Jumlah Fisik',
                                  keyboardType: TextInputType.number,
                                  onChanged: (v) {
                                    setState(() {
                                      b.stokFisik = int.tryParse(v.trim());
                                      if (_daftarBelumDihitung.isNotEmpty) {
                                        _daftarBelumDihitung.removeWhere(
                                            (x) => x.batchId == b.batchId);
                                        if (_daftarBelumDihitung.isEmpty) {
                                          _pesanGalatHitung = null;
                                        }
                                      }
                                    });
                                  },
                                ),
                              ],
                            );
                          },
                        ),
                ),
                Padding(
                  padding: const EdgeInsets.all(TokenJarak.j4),
                  child: TombolPos(
                    label: 'Selesai Menghitung',
                    memuat: _memuatTinjauan,
                    onPressed: _daftar.isEmpty ? null : _selesaiMenghitung,
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildTahapTinjauan() {
    final adaSelisih = _barisTinjauan.any((b) => b.selisih != 0);
    final batchSelisihLebih =
        _barisTinjauan.where((b) => b.selisih > 0).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tinjauan Selisih'),
        leading: IconButton(
          tooltip: 'Kembali ke Hitung Fisik',
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: _menyimpan
              ? null
              : () => setState(() {
                    _tahap = _TahapOpname.menghitung;
                    _pesanGalatTinjauan = null;
                  }),
        ),
      ),
      body: Column(
        children: [
          if (_pesanGalatTinjauan != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                TokenJarak.j4,
                TokenJarak.j3,
                TokenJarak.j4,
                0,
              ),
              child: PesanPos(
                jenis: JenisPesan.bahaya,
                teks: _pesanGalatTinjauan!,
              ),
            ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(TokenJarak.j4),
              children: [
                if (!adaSelisih) ...[
                  const PesanPos(
                    jenis: JenisPesan.berhasil,
                    teks: 'Tidak ada selisih',
                  ),
                  const SizedBox(height: TokenJarak.j3),
                ],
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Container(
                    decoration: BoxDecoration(
                      color: TokenLatar.latar,
                      border: Border.all(
                        color: TokenGaris.pemisah,
                        width: TokenGarisTebal.t1,
                      ),
                      borderRadius: BorderRadius.circular(TokenRadius.kecil),
                    ),
                    child: DataTable(
                      headingRowColor:
                          WidgetStateProperty.all(TokenLatar.kepalaTabel),
                      columnSpacing: 16,
                      horizontalMargin: 12,
                      columns: const [
                        DataColumn(label: Text('Obat/Batch')),
                        DataColumn(label: Text('Stok Sistem'), numeric: true),
                        DataColumn(label: Text('Fisik'), numeric: true),
                        DataColumn(label: Text('Selisih'), numeric: true),
                        DataColumn(label: Text('Nilai (Rp)'), numeric: true),
                      ],
                      rows: _barisTinjauan.map((b) {
                        final Color warnaTeks;
                        final Color warnaLatar;
                        final String labelSelisih;
                        if (b.selisih < 0) {
                          warnaTeks = TokenStatus.bahayaTeks;
                          warnaLatar = TokenStatus.bahayaLatar;
                          labelSelisih = '${b.selisih}';
                        } else if (b.selisih > 0) {
                          warnaTeks = TokenStatus.peringatanTeks;
                          warnaLatar = TokenStatus.peringatanLatar;
                          labelSelisih = '+${b.selisih}';
                        } else {
                          warnaTeks = TokenTeks.sekunder;
                          warnaLatar = TokenLatar.selang;
                          labelSelisih = '0';
                        }

                        return DataRow(
                          cells: [
                            DataCell(
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    b.barangNama,
                                    style: TokenTipografi.tabel.copyWith(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Text(
                                    b.nomorBatch,
                                    style: TokenTipografi.keterangan,
                                  ),
                                ],
                              ),
                            ),
                            DataCell(
                              Text(
                                '${b.stokSistem}',
                                style: TokenTipografi.angkaTabular(
                                  TokenTipografi.tabel,
                                ),
                              ),
                            ),
                            DataCell(
                              Text(
                                '${b.stokFisik}',
                                style: TokenTipografi.angkaTabular(
                                  TokenTipografi.tabel,
                                ),
                              ),
                            ),
                            DataCell(
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: warnaLatar,
                                  borderRadius:
                                      BorderRadius.circular(TokenRadius.kecil),
                                ),
                                child: Text(
                                  labelSelisih,
                                  style: TokenTipografi.angkaTabular(
                                    TokenTipografi.tabel,
                                  ).copyWith(
                                    color: warnaTeks,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                            DataCell(
                              Text(
                                formatRupiah(b.nilaiSelisih),
                                style: TokenTipografi.angkaTabular(
                                  TokenTipografi.tabel,
                                ).copyWith(
                                  color: warnaTeks,
                                  fontWeight: b.selisih == 0
                                      ? FontWeight.w400
                                      : FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ),
                if (batchSelisihLebih.isNotEmpty) ...[
                  const SizedBox(height: TokenJarak.j4),
                  Text(
                    'Keterangan Selisih Lebih (Wajib)',
                    style: TokenTipografi.seksi,
                  ),
                  const SizedBox(height: TokenJarak.j2),
                  ...batchSelisihLebih.map((b) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: TokenJarak.j3),
                      child: IsianTeksPos(
                        controller: b.keteranganCtrl,
                        label:
                            'Keterangan Selisih Lebih · ${b.barangNama} (${b.nomorBatch})',
                        placeholder: 'contoh: faktur belum dicatat',
                        onChanged: (_) {
                          if (_pesanGalatTinjauan != null) {
                            setState(() => _pesanGalatTinjauan = null);
                          }
                        },
                      ),
                    );
                  }),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(TokenJarak.j4),
            child: TombolPos(
              label: 'Simpan Hasil Opname',
              memuat: _menyimpan,
              onPressed: _simpanOpname,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTahapHasil() {
    final tertunda = _hasilOpname!['tertunda'] == true;
    final ringkasan = _hasilOpname!['ringkasan'] as Map<String, dynamic>?;
    final pengajuan = _hasilOpname!['pengajuan'] as Map<String, dynamic>?;
    final jumlahLebih =
        (ringkasan?['jumlah_selisih_lebih'] as num?)?.toInt() ?? 0;
    final jumlahKurang =
        (ringkasan?['jumlah_selisih_kurang'] as num?)?.toInt() ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Hasil Opname')),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          PesanPos(
            jenis: tertunda ? JenisPesan.informasi : JenisPesan.berhasil,
            teks: tertunda
                ? 'Transaksi tertunda. Akan dikirim otomatis saat tersambung.'
                : 'Opname ${_hasilOpname!['nomor']} berhasil disimpan.',
          ),
          if (ringkasan != null) ...[
            const SizedBox(height: TokenJarak.j4),
            Text('Jumlah batch: ${ringkasan['jumlah_batch']}'),
            Text('Tanpa selisih: ${ringkasan['jumlah_sama']}'),
            Text('Selisih kurang: $jumlahKurang'),
            Text('Selisih lebih: $jumlahLebih'),
          ],
          if (pengajuan != null) ...[
            const SizedBox(height: TokenJarak.j3),
            Row(
              children: [
                Text('Pengajuan ${pengajuan['nomor']}: '),
                LencanaStatusPos(status: pengajuan['status'] as String),
              ],
            ),
            const SizedBox(height: TokenJarak.j1),
            const Text(
              'Pengajuan penyesuaian stok kurang muncul di menu Pengajuan. Stok belum berubah sampai disahkan APA.',
              style: TokenTipografi.keterangan,
            ),
          ] else if (!tertunda && jumlahKurang == 0 && jumlahLebih == 0) ...[
            const SizedBox(height: TokenJarak.j3),
            const Text(
              'Tidak ada selisih. Hasil opname tersimpan tanpa pengajuan.',
              style: TokenTipografi.keterangan,
            ),
          ],
          if (!tertunda && jumlahLebih > 0) ...[
            const SizedBox(height: TokenJarak.j2),
            const Text(
              'Selisih lebih tercatat dengan keterangan pada hasil opname. Stok tidak berubah dan tidak ada jurnal.',
              style: TokenTipografi.keterangan,
            ),
          ],
          const SizedBox(height: TokenJarak.j6),
          TombolPos(
            label: 'Opname Baru',
            onPressed: _muat,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return switch (_tahap) {
      _TahapOpname.menghitung => _buildTahapMenghitung(),
      _TahapOpname.tinjauan => _buildTahapTinjauan(),
      _TahapOpname.hasil => _buildTahapHasil(),
    };
  }
}
