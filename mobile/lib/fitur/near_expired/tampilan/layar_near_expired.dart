import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/klien_api.dart';
import '../../../inti/sesi.dart';
import '../../pengajuan/tampilan/layar_pengajuan.dart';

class LayarNearExpired extends ConsumerStatefulWidget {
  const LayarNearExpired({super.key});

  @override
  ConsumerState<LayarNearExpired> createState() => _LayarNearExpiredState();
}

class _LayarNearExpiredState extends ConsumerState<LayarNearExpired> {
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
      final res = await k.kirim(() => k.dio.get('/near-expired'));
      if (mounted)
        setState(() => _data = res.data['data'] as Map<String, dynamic>);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Widget _bagian(String judul, List list, String statusLencana, bool isSg) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(judul, style: TokenTipografi.seksi)),
            LencanaStatusPos(status: statusLencana),
          ],
        ),
        const SizedBox(height: TokenJarak.j2),
        if (list.isEmpty)
          const Text('Tidak ada batch.')
        else
          ...list.map((raw) {
            final item = raw as Map<String, dynamic>;
            final brg = item['barang'] as Map<String, dynamic>;
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${brg['nama']} (${item['nomor_batch']})'),
              subtitle: Text(
                'Exp: ${formatTanggal(item['tanggal_kedaluwarsa'])} (${item['sisa_hari']} hari) · Stok: ${item['stok']} · ${formatRupiah((item['nilai'] as num).toInt())}',
              ),
              trailing: isSg
                  ? TextButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => LayarBuatPengajuan(
                              alasanAwal: (item['sisa_hari'] as num) < 0
                                  ? 'kedaluwarsa'
                                  : 'rusak',
                              batchIdAwal: (item['batch_id'] as num).toInt(),
                              jumlahAwal: (item['stok'] as num).toInt(),
                            ),
                          ),
                        );
                      },
                      child: const Text('Ajukan'),
                    )
                  : null,
            );
          }),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isSg = ref.watch(sesiProvider).pengguna?.peran == 'staf_gudang';

    return Scaffold(
      appBar: AppBar(title: const Text('Near-Expired')),
      body: RefreshIndicator(
        onRefresh: _muat,
        child: _memuat || _data == null
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(TokenJarak.j4),
                children: [
                  _bagian(
                    'Sudah Kedaluwarsa',
                    _data!['sudah_kedaluwarsa'] as List,
                    'kedaluwarsa',
                    isSg,
                  ),
                  const SizedBox(height: TokenJarak.j6),
                  _bagian(
                    'Mendekati Kedaluwarsa',
                    _data!['mendekati'] as List,
                    'mendekati',
                    isSg,
                  ),
                ],
              ),
      ),
    );
  }
}

class LayarDefekta extends ConsumerStatefulWidget {
  const LayarDefekta({super.key});

  @override
  ConsumerState<LayarDefekta> createState() => _LayarDefektaState();
}

class _LayarDefektaState extends ConsumerState<LayarDefekta> {
  List<Map<String, dynamic>> _daftar = [];
  bool _memuat = true;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      try {
        final k = ref.read(klienApiProvider);
        final res = await k.kirim(() => k.dio.get('/laporan/defekta'));
        if (mounted) {
          setState(() => _daftar =
              (res.data['data'] as List).cast<Map<String, dynamic>>());
        }
      } catch (_) {
      } finally {
        if (mounted) setState(() => _memuat = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Defekta')),
      body: _memuat
          ? const Center(child: CircularProgressIndicator())
          : _daftar.isEmpty
              ? const Center(child: Text('Tidak ada barang defekta.'))
              : Padding(
                  padding: const EdgeInsets.all(TokenJarak.j4),
                  child: SingleChildScrollView(
                    child: TabelBarisPos(
                      kepala: const ['Barang', 'Stok', 'Min', 'Kurang'],
                      rataKanan: const [false, true, true, true],
                      baris: _daftar
                          .map((d) => [
                                d['nama'] as String,
                                '${d['stok_total']}',
                                '${d['stok_minimum']}',
                                '${d['jumlah_kurang']}',
                              ])
                          .toList(),
                    ),
                  ),
                ),
    );
  }
}
