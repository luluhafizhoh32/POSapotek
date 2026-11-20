import 'package:dio/dio.dart';
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
import '../../../inti/sesi.dart';

class LayarDaftarPengajuan extends ConsumerStatefulWidget {
  const LayarDaftarPengajuan({super.key});

  @override
  ConsumerState<LayarDaftarPengajuan> createState() =>
      _LayarDaftarPengajuanState();
}

class _LayarDaftarPengajuanState extends ConsumerState<LayarDaftarPengajuan> {
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
      final res = await k.kirim(() => k.dio.get('/pengajuan-pengurangan'));
      if (mounted) {
        setState(() =>
            _daftar = (res.data['data'] as List).cast<Map<String, dynamic>>());
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final peran = ref.watch(sesiProvider).pengguna?.peran;

    return Scaffold(
      appBar: AppBar(
        title: Text(peran == 'apa'
            ? 'Pengesahan Pengurangan'
            : 'Pengajuan Pengurangan'),
        actions: [
          if (peran == 'staf_gudang')
            IconButton(
              icon: const Icon(LucideIcons.plus),
              onPressed: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LayarBuatPengajuan()),
                );
                _muat();
              },
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _muat,
        child: _memuat
            ? const Center(child: CircularProgressIndicator())
            : _daftar.isEmpty
                ? const Center(child: Text('Belum ada pengajuan pengurangan.'))
                : ListView.separated(
                    padding: const EdgeInsets.all(TokenJarak.j4),
                    itemCount: _daftar.length,
                    separatorBuilder: (_, __) => const Divider(),
                    itemBuilder: (ctx, i) {
                      final p = _daftar[i];
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text('${p['nomor']} · ${p['alasan']}'),
                        subtitle: Text(
                          '${p['jumlah_baris']} batch · ${formatRupiah((p['nilai_total'] as num).toInt())}',
                        ),
                        trailing:
                            LencanaStatusPos(status: p['status'] as String),
                        onTap: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => LayarDetailPengajuan(
                                  pengajuanId: (p['id'] as num).toInt()),
                            ),
                          );
                          _muat();
                        },
                      );
                    },
                  ),
      ),
    );
  }
}

class LayarBuatPengajuan extends ConsumerStatefulWidget {
  final String? alasanAwal;
  final int? batchIdAwal;
  final int? jumlahAwal;

  const LayarBuatPengajuan(
      {super.key, this.alasanAwal, this.batchIdAwal, this.jumlahAwal});

  @override
  ConsumerState<LayarBuatPengajuan> createState() => _LayarBuatPengajuanState();
}

class _LayarBuatPengajuanState extends ConsumerState<LayarBuatPengajuan> {
  late String _alasan;
  final _batchCtrl = TextEditingController();
  final _jumlahCtrl = TextEditingController();
  final _ketCtrl = TextEditingController();
  int? _pemasokId;
  List<Map<String, dynamic>> _pemasok = [];
  String? _fotoPath;
  final String _kunciIdempoten = const Uuid().v4();
  bool _memuat = false;
  String? _pesanGalat;

  @override
  void initState() {
    super.initState();
    _alasan = widget.alasanAwal ?? 'kedaluwarsa';
    if (widget.batchIdAwal != null) _batchCtrl.text = '${widget.batchIdAwal}';
    if (widget.jumlahAwal != null) _jumlahCtrl.text = '${widget.jumlahAwal}';
    Future.microtask(() async {
      try {
        final k = ref.read(klienApiProvider);
        final res = await k.kirim(
            () => k.dio.get('/pemasok', queryParameters: {'per_halaman': 100}));
        if (mounted) {
          setState(() => _pemasok =
              (res.data['data'] as List).cast<Map<String, dynamic>>());
        }
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _batchCtrl.dispose();
    _jumlahCtrl.dispose();
    _ketCtrl.dispose();
    super.dispose();
  }

  Future<void> _ajukan() async {
    final batchId = int.tryParse(_batchCtrl.text.trim());
    final jumlah = int.tryParse(_jumlahCtrl.text.trim());
    if (batchId == null || jumlah == null || jumlah <= 0) {
      setState(() => _pesanGalat = 'Batch ID dan jumlah harus diisi.');
      return;
    }

    setState(() {
      _memuat = true;
      _pesanGalat = null;
    });

    final payload = {
      'alasan': _alasan,
      if (_alasan == 'retur_pbf') 'pemasok_id': _pemasokId,
      'baris': [
        {
          'batch_id': batchId,
          'jumlah': jumlah,
          if (_ketCtrl.text.trim().isNotEmpty)
            'keterangan': _ketCtrl.text.trim(),
        },
      ],
    };

    try {
      final k = ref.read(klienApiProvider);
      if (_fotoPath != null) {
        final form = FormData.fromMap({
          'jenis': 'bukti_pengurangan',
          'berkas': await MultipartFile.fromFile(_fotoPath!),
        });
        final up = await k.kirim(() => k.dio.post('/lampiran', data: form));
        payload['lampiran_id'] =
            (up.data['data'] as Map<String, dynamic>)['id'] as String;
      }

      await k.kirim(
        () => k.dio.post(
          '/pengajuan-pengurangan',
          data: payload,
          options: Options(headers: {'Idempotency-Key': _kunciIdempoten}),
        ),
      );
      if (mounted) Navigator.of(context).pop();
    } on GalatApi catch (g) {
      if (g.adalahGalatJaringan) {
        await ref.read(antreanProvider.notifier).masukkan(
              jenis: 'pengajuan',
              kunciIdempoten: _kunciIdempoten,
              payload: payload,
              lampiranPath: _fotoPath,
              lampiranJenis: _fotoPath != null ? 'bukti_pengurangan' : null,
            );
        if (mounted) Navigator.of(context).pop();
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
      appBar: AppBar(title: const Text('Ajukan Pengurangan Stok')),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          if (_pesanGalat != null) ...[
            PesanPos(jenis: JenisPesan.bahaya, teks: _pesanGalat!),
            const SizedBox(height: TokenJarak.j3),
          ],
          DaftarPilihanPos<String>(
            label: 'Alasan Pengurangan',
            nilai: _alasan,
            opsi: const [
              (nilai: 'kedaluwarsa', teks: 'Kedaluwarsa'),
              (nilai: 'rusak', teks: 'Rusak'),
              (nilai: 'retur_pbf', teks: 'Retur ke PBF'),
            ],
            onPilih: (v) => setState(() => _alasan = v),
          ),
          if (_alasan == 'retur_pbf') ...[
            const SizedBox(height: TokenJarak.j3),
            DropdownButtonFormField<int>(
              initialValue: _pemasokId,
              decoration: const InputDecoration(labelText: 'Pemasok'),
              items: _pemasok
                  .map((p) => DropdownMenuItem<int>(
                        value: (p['id'] as num).toInt(),
                        child: Text(p['nama'] as String),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _pemasokId = v),
            ),
          ],
          const SizedBox(height: TokenJarak.j3),
          IsianTeksPos(
              controller: _batchCtrl,
              label: 'ID Batch',
              keyboardType: TextInputType.number),
          const SizedBox(height: TokenJarak.j3),
          IsianTeksPos(
              controller: _jumlahCtrl,
              label: 'Jumlah',
              keyboardType: TextInputType.number),
          const SizedBox(height: TokenJarak.j3),
          IsianTeksPos(controller: _ketCtrl, label: 'Keterangan (Opsional)'),
          const SizedBox(height: TokenJarak.j4),
          TombolPos(
            label: _fotoPath == null ? 'Ambil Foto Bukti' : 'Foto Bukti Siap',
            ikon: LucideIcons.camera,
            jenis: JenisTombol.sekunder,
            onPressed: () async {
              final x = await ImagePicker().pickImage(
                source: ImageSource.camera,
                maxWidth: 1600,
                maxHeight: 1600,
                imageQuality: 80,
              );
              if (x != null && mounted) setState(() => _fotoPath = x.path);
            },
          ),
          const SizedBox(height: TokenJarak.j6),
          TombolPos(label: 'Ajukan', memuat: _memuat, onPressed: _ajukan),
        ],
      ),
    );
  }
}

class LayarDetailPengajuan extends ConsumerStatefulWidget {
  final int pengajuanId;
  const LayarDetailPengajuan({super.key, required this.pengajuanId});

  @override
  ConsumerState<LayarDetailPengajuan> createState() =>
      _LayarDetailPengajuanState();
}

class _LayarDetailPengajuanState extends ConsumerState<LayarDetailPengajuan> {
  Map<String, dynamic>? _data;
  bool _memuat = true;
  String? _pesanGalat;

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
          () => k.dio.get('/pengajuan-pengurangan/${widget.pengajuanId}'));
      if (mounted)
        setState(() => _data = res.data['data'] as Map<String, dynamic>);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _putuskan(String keputusan, {String? alasan}) async {
    try {
      final k = ref.read(klienApiProvider);
      await k.kirim(
        () => k.dio.post(
          '/pengajuan-pengurangan/${widget.pengajuanId}/putuskan',
          data: {
            'keputusan': keputusan,
            if (alasan != null) 'alasan': alasan,
          },
        ),
      );
      await _muat();
    } on GalatApi catch (g) {
      if (mounted) {
        setState(() => _pesanGalat = g.kode == 'STOK_BERUBAH'
            ? '${g.pesan} Gunakan tombol Kembalikan.'
            : g.pesan);
      }
    }
  }

  Future<void> _dialogAlasan(String keputusan, String judul) async {
    final ctrl = TextEditingController();
    final ok = await tampilkanDialogPos<bool>(
      context: context,
      judul: judul,
      isi: IsianTeksPos(controller: ctrl, label: 'Alasan (minimal 5 karakter)'),
      tombol: [
        TombolPos(
          label: 'Batal',
          jenis: JenisTombol.sekunder,
          penuh: false,
          onPressed: () => Navigator.pop(context, false),
        ),
        TombolPos(
          label: 'Kirim',
          penuh: false,
          onPressed: () => Navigator.pop(context, true),
        ),
      ],
    );
    if (ok == true) {
      await _putuskan(keputusan, alasan: ctrl.text.trim());
    }
  }

  @override
  Widget build(BuildContext context) {
    final peran = ref.watch(sesiProvider).pengguna?.peran;

    return Scaffold(
      appBar: AppBar(title: const Text('Detail Pengajuan')),
      body: _memuat || _data == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(TokenJarak.j4),
              children: [
                if (_pesanGalat != null) ...[
                  PesanPos(jenis: JenisPesan.bahaya, teks: _pesanGalat!),
                  const SizedBox(height: TokenJarak.j3),
                ],
                Row(
                  children: [
                    Expanded(
                        child: Text(_data!['nomor'] as String,
                            style: TokenTipografi.judul)),
                    LencanaStatusPos(status: _data!['status'] as String),
                  ],
                ),
                const SizedBox(height: TokenJarak.j2),
                Text('Alasan: ${_data!['alasan']}'),
                const SizedBox(height: TokenJarak.j4),
                ...(_data!['baris'] as List).map((raw) {
                  final b = raw as Map<String, dynamic>;
                  final brg = b['barang'] as Map<String, dynamic>;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${brg['nama']} (${b['nomor_batch']})'),
                    subtitle: Text(
                      'Diajukan: ${b['jumlah_diajukan']} · Stok saat ini: ${b['stok_saat_ini']}',
                    ),
                    trailing: Text(
                      formatRupiah((b['jumlah_diajukan'] as num).toInt() *
                          (b['harga_beli_satuan'] as num).toInt()),
                      style: TokenTipografi.angkaTabular(TokenTipografi.dasar),
                    ),
                  );
                }),
                if (peran == 'apa' && _data!['status'] == 'menunggu') ...[
                  const SizedBox(height: TokenJarak.j6),
                  TombolPos(
                      label: 'Setujui', onPressed: () => _putuskan('setuju')),
                  const SizedBox(height: TokenJarak.j2),
                  TombolPos(
                    label: 'Kembalikan',
                    jenis: JenisTombol.sekunder,
                    onPressed: () =>
                        _dialogAlasan('kembalikan', 'Kembalikan Pengajuan'),
                  ),
                  const SizedBox(height: TokenJarak.j2),
                  TombolPos(
                    label: 'Tolak',
                    jenis: JenisTombol.bahaya,
                    onPressed: () => _dialogAlasan('tolak', 'Tolak Pengajuan'),
                  ),
                ],
              ],
            ),
    );
  }
}
