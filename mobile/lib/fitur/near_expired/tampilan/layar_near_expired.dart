import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/komponen.dart';
import '../../../app/komponen_v2.dart';
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
      if (mounted) {
        setState(() => _data = res.data['data'] as Map<String, dynamic>);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Widget _bagian(String judul, List list, String statusLencana, bool isSg) {
    final isExpired = statusLencana == 'kedaluwarsa';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(judul, style: TokenTipografi.subjudul),
            StatusBadge(
              label: '${list.length} batch',
              varian: isExpired ? VarianStatus.danger : VarianStatus.warning,
            ),
          ],
        ),
        const SizedBox(height: TokenJarak.j3),
        if (list.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(TokenJarak.j4),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(TokenRadius.besar),
              border: Border.all(color: AppColors.border),
            ),
            child: const Text('Tidak ada batch pada kategori ini.',
                style: TokenTipografi.keterangan),
          )
        else
          ...list.map((raw) {
            final item = raw as Map<String, dynamic>;
            final brg = item['barang'] as Map<String, dynamic>;
            final sisaHari = (item['sisa_hari'] as num).toInt();
            return Container(
              margin: const EdgeInsets.only(bottom: TokenJarak.j2),
              padding: const EdgeInsets.all(TokenJarak.j3),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(TokenRadius.besar),
                border: Border.all(color: AppColors.border),
                boxShadow: AppShadows.card,
              ),
              child: Row(
                children: [
                  Container(
                    width: 54,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color:
                          isExpired ? AppColors.dangerBg : AppColors.warningBg,
                      borderRadius: BorderRadius.circular(TokenRadius.sedang),
                    ),
                    child: Column(
                      children: [
                        Text(
                          sisaHari < 0 ? 'ED' : '$sisaHari',
                          style: TokenTipografi.angkaTabular(
                                  TokenTipografi.subjudul)
                              .copyWith(
                            fontWeight: FontWeight.w700,
                            color: isExpired
                                ? AppColors.danger
                                : AppColors.warning,
                          ),
                        ),
                        Text(
                          sisaHari < 0 ? 'Lewat' : 'hari',
                          style: TokenTipografi.keterangan.copyWith(
                            fontSize: 10,
                            color: isExpired
                                ? AppColors.danger
                                : AppColors.warning,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: TokenJarak.j3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${brg['nama']} (${item['nomor_batch']})',
                          style: TokenTipografi.dasar
                              .copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Exp ${formatTanggal(item['tanggal_kedaluwarsa'])} · Stok ${item['stok']} · Risiko ${formatRupiah((item['nilai'] as num).toInt())}',
                          style: TokenTipografi.keterangan,
                        ),
                      ],
                    ),
                  ),
                  if (isSg)
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => LayarBuatPengajuan(
                              alasanAwal:
                                  sisaHari < 0 ? 'kedaluwarsa' : 'rusak',
                              batchIdAwal: (item['batch_id'] as num).toInt(),
                              jumlahAwal: (item['stok'] as num).toInt(),
                            ),
                          ),
                        );
                      },
                      child: const Text('Ajukan'),
                    ),
                ],
              ),
            );
          }),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isSg = ref.watch(sesiProvider).pengguna?.peran == 'staf_gudang';

    return Scaffold(
      appBar: AppBarPharma(
        peranLabel: isSg ? 'GUDANG' : 'APOTEKER',
        subjudul: 'Pemantauan Near-Expired & FEFO',
      ),
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
