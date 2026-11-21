import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/klien_api.dart';

class LayarCekInteraksiAi extends ConsumerStatefulWidget {
  const LayarCekInteraksiAi({super.key});

  @override
  ConsumerState<LayarCekInteraksiAi> createState() =>
      _LayarCekInteraksiAiState();
}

class _LayarCekInteraksiAiState extends ConsumerState<LayarCekInteraksiAi> {
  final _pasienCtrl = TextEditingController(text: 'Budi Santoso, 52 th');
  final _dokterCtrl = TextEditingController(text: 'dr. Rina Kusuma, Sp.PD');
  final _obatInputCtrl = TextEditingController();
  final List<String> _daftarObat = [
    'Simvastatin 20 mg',
    'Klaritromisin 500 mg',
    'Amlodipin 5 mg',
  ];

  bool _memuat = false;
  bool _terverifikasi = false;
  String? _galat;
  Map<String, dynamic>? _hasil;

  @override
  void dispose() {
    _pasienCtrl.dispose();
    _dokterCtrl.dispose();
    _obatInputCtrl.dispose();
    super.dispose();
  }

  void _tambahObat() {
    final teks = _obatInputCtrl.text.trim();
    if (teks.isEmpty) return;
    setState(() {
      _daftarObat.add(teks);
      _obatInputCtrl.clear();
      _hasil = null;
      _terverifikasi = false;
    });
  }

  Future<void> _cekInteraksi() async {
    if (_daftarObat.isEmpty) {
      setState(() => _galat = 'Tambahkan minimal 1 obat untuk diperiksa.');
      return;
    }
    setState(() {
      _memuat = true;
      _galat = null;
      _terverifikasi = false;
    });
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(
        () => k.dio.post(
          '/ai/cek-interaksi',
          data: {
            'daftar_obat': _daftarObat,
            'nama_pasien': _pasienCtrl.text.trim(),
            'dokter': _dokterCtrl.text.trim(),
          },
        ),
      );
      if (mounted) {
        setState(() => _hasil = res.data['data'] as Map<String, dynamic>);
      }
    } catch (_) {
      if (mounted) {
        setState(
            () => _galat = 'Gagal memeriksa interaksi obat. Periksa koneksi.');
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final peringatan =
        (_hasil?['peringatan'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Drug Safety Checker'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          Container(
            padding: const EdgeInsets.all(TokenJarak.j4),
            decoration: BoxDecoration(
              color: WarnaMentah.ai50,
              borderRadius: BorderRadius.circular(TokenRadius.sedang),
              border: Border.all(color: WarnaMentah.ai100),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.sparkles,
                    color: WarnaMentah.ai600, size: 24),
                const SizedBox(width: TokenJarak.j3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Deteksi Interaksi Obat Berbasis AI',
                        style: TokenTipografi.dasar.copyWith(
                          fontWeight: FontWeight.w600,
                          color: WarnaMentah.ai700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Memeriksa kombinasi resep sebelum diserahkan — keputusan akhir tetap di tangan Apoteker.',
                        style: TokenTipografi.keterangan,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: TokenJarak.j4),
          IsianTeksPos(controller: _dokterCtrl, label: 'Dokter Penulis Resep'),
          const SizedBox(height: TokenJarak.j3),
          IsianTeksPos(controller: _pasienCtrl, label: 'Pasien'),
          const SizedBox(height: TokenJarak.j4),
          Text('Daftar Obat Resep (${_daftarObat.length})',
              style: TokenTipografi.seksi),
          const SizedBox(height: TokenJarak.j2),
          Row(
            children: [
              Expanded(
                child: IsianTeksPos(
                  controller: _obatInputCtrl,
                  label: 'Tambah Obat',
                  placeholder: 'cth: Warfarin 2 mg',
                ),
              ),
              const SizedBox(width: TokenJarak.j2),
              Padding(
                padding: const EdgeInsets.only(top: 22),
                child: TombolPos(
                  label: 'Tambah',
                  jenis: JenisTombol.sekunder,
                  penuh: false,
                  onPressed: _tambahObat,
                ),
              ),
            ],
          ),
          const SizedBox(height: TokenJarak.j3),
          ..._daftarObat.asMap().entries.map((e) => Container(
                margin: const EdgeInsets.only(bottom: TokenJarak.j2),
                padding: const EdgeInsets.symmetric(
                  horizontal: TokenJarak.j3,
                  vertical: TokenJarak.j2,
                ),
                decoration: BoxDecoration(
                  color: TokenLatar.latar,
                  borderRadius: BorderRadius.circular(TokenRadius.kecil),
                  border: Border.all(color: TokenGaris.pemisah),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.pill,
                        size: 18, color: TokenAksi.utama),
                    const SizedBox(width: TokenJarak.j2),
                    Expanded(child: Text(e.value, style: TokenTipografi.dasar)),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () {
                        setState(() {
                          _daftarObat.removeAt(e.key);
                          _hasil = null;
                        });
                      },
                    ),
                  ],
                ),
              )),
          const SizedBox(height: TokenJarak.j3),
          if (_galat != null) ...[
            PesanPos(jenis: JenisPesan.bahaya, teks: _galat!),
            const SizedBox(height: TokenJarak.j3),
          ],
          SizedBox(
            height: TokenUkuran.tinggiTombol,
            child: ElevatedButton.icon(
              onPressed: _memuat ? null : _cekInteraksi,
              icon: _memuat
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: TokenTeks.diUtama,
                      ),
                    )
                  : const Icon(LucideIcons.sparkles),
              label: const Text('Cek Interaksi AI'),
              style: ElevatedButton.styleFrom(
                backgroundColor: WarnaMentah.ai600,
                foregroundColor: TokenTeks.diUtama,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(TokenRadius.kecil),
                ),
              ),
            ),
          ),
          if (_hasil != null) ...[
            const SizedBox(height: TokenJarak.j4),
            if (peringatan.isEmpty)
              PesanPos(
                jenis: JenisPesan.berhasil,
                teks: _hasil!['catatan_klinis'] as String,
              )
            else ...[
              PesanPos(
                jenis: JenisPesan.peringatan,
                teks:
                    'Ditemukan ${peringatan.length} potensi interaksi obat! Periksa detail klinis di bawah.',
              ),
              const SizedBox(height: TokenJarak.j3),
              ...peringatan.map((p) {
                final tinggi = p['tingkat'] == 'tinggi';
                return Container(
                  margin: const EdgeInsets.only(bottom: TokenJarak.j3),
                  padding: const EdgeInsets.all(TokenJarak.j4),
                  decoration: BoxDecoration(
                    color: tinggi
                        ? TokenStatus.bahayaLatar
                        : TokenStatus.peringatanLatar,
                    borderRadius: BorderRadius.circular(TokenRadius.sedang),
                    border: Border.all(
                      color: tinggi
                          ? TokenStatus.bahayaTeks
                          : TokenStatus.peringatanTeks,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            LucideIcons.alertTriangle,
                            size: 18,
                            color: tinggi
                                ? TokenStatus.bahayaTeks
                                : TokenStatus.peringatanTeks,
                          ),
                          const SizedBox(width: TokenJarak.j2),
                          Expanded(
                            child: Text(
                              p['judul'] as String,
                              style: TokenTipografi.dasar.copyWith(
                                fontWeight: FontWeight.w700,
                                color: tinggi
                                    ? TokenStatus.bahayaTeks
                                    : TokenStatus.peringatanTeks,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: TokenJarak.j2),
                      Text(p['mekanisme'] as String,
                          style: TokenTipografi.tabel),
                      const SizedBox(height: TokenJarak.j2),
                      Text(
                        'Saran: ${p['saran']}',
                        style: TokenTipografi.tabel.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
            const SizedBox(height: TokenJarak.j3),
            if (_terverifikasi)
              const PesanPos(
                jenis: JenisPesan.berhasil,
                teks: 'Resep telah diverifikasi oleh Apoteker Penanggung Jawab.',
              )
            else
              TombolPos(
                label: 'Verifikasi Apoteker',
                ikon: LucideIcons.checkCircle2,
                onPressed: () => setState(() => _terverifikasi = true),
              ),
          ],
        ],
      ),
    );
  }
}
