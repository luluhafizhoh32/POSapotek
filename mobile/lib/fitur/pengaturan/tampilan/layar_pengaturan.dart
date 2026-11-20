import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/galat.dart';
import '../../../inti/klien_api.dart';

class LayarPengaturan extends ConsumerStatefulWidget {
  const LayarPengaturan({super.key});

  @override
  ConsumerState<LayarPengaturan> createState() => _LayarPengaturanState();
}

class _LayarPengaturanState extends ConsumerState<LayarPengaturan> {
  final _namaCtrl = TextEditingController();
  final _batasCtrl = TextEditingController();
  final _tglLapCtrl = TextEditingController();
  final _kepalaCtrl = TextEditingController();
  final _kakiCtrl = TextEditingController();
  String? _pesan;
  bool _memuat = true;

  @override
  void initState() {
    super.initState();
    Future.microtask(_muat);
  }

  Future<void> _muat() async {
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(() => k.dio.get('/pengaturan'));
      final d = res.data['data'] as Map<String, dynamic>;
      final apotek = d['apotek'] as Map<String, dynamic>;
      _namaCtrl.text = (apotek['nama'] ?? '') as String;
      _batasCtrl.text = '${d['batas_near_expired_hari']}';
      _tglLapCtrl.text = '${d['laporan_bulanan_tanggal']}';
      _kepalaCtrl.text = (d['kepala_struk'] ?? '') as String;
      _kakiCtrl.text = (d['kaki_struk'] ?? '') as String;
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _simpan() async {
    try {
      final k = ref.read(klienApiProvider);
      await k.kirim(() => k.dio.put('/pengaturan', data: {
            'nama': _namaCtrl.text.trim(),
            'batas_near_expired_hari':
                int.tryParse(_batasCtrl.text.trim()) ?? 90,
            'laporan_bulanan_tanggal':
                int.tryParse(_tglLapCtrl.text.trim()) ?? 3,
            'kepala_struk': _kepalaCtrl.text.trim(),
            'kaki_struk': _kakiCtrl.text.trim(),
          }));
      if (mounted) setState(() => _pesan = 'Pengaturan berhasil disimpan.');
    } on GalatApi catch (g) {
      if (mounted) setState(() => _pesan = g.pesan);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pengaturan Apotek')),
      body: _memuat
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(TokenJarak.j4),
              children: [
                if (_pesan != null) ...[
                  PesanPos(jenis: JenisPesan.berhasil, teks: _pesan!),
                  const SizedBox(height: TokenJarak.j3),
                ],
                IsianTeksPos(controller: _namaCtrl, label: 'Nama Apotek'),
                const SizedBox(height: TokenJarak.j3),
                IsianTeksPos(
                  controller: _batasCtrl,
                  label: 'Batas Near-Expired (hari, 1-365)',
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: TokenJarak.j3),
                IsianTeksPos(
                  controller: _tglLapCtrl,
                  label: 'Tanggal Laporan Bulanan (1-28)',
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: TokenJarak.j3),
                IsianTeksPos(controller: _kepalaCtrl, label: 'Kepala Struk'),
                const SizedBox(height: TokenJarak.j3),
                IsianTeksPos(controller: _kakiCtrl, label: 'Kaki Struk'),
                const SizedBox(height: TokenJarak.j6),
                TombolPos(label: 'Simpan Pengaturan', onPressed: _simpan),
              ],
            ),
    );
  }
}
