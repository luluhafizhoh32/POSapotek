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
  final List<({String nama, String dosis, String jumlah, bool keras})>
      _daftarObat = [
    (
      nama: 'Simvastatin 20 mg',
      dosis: '1×1 malam hari',
      jumlah: '30 tab',
      keras: true,
    ),
    (
      nama: 'Klaritromisin 500 mg',
      dosis: '2×1 sesudah makan',
      jumlah: '14 tab',
      keras: true,
    ),
    (
      nama: 'Amlodipin 5 mg',
      dosis: '1×1 pagi hari',
      jumlah: '30 tab',
      keras: true,
    ),
  ];

  bool _memuat = false;
  bool _terverifikasi = false;
  DateTime? _waktuVerifikasi;
  String? _galat;
  Map<String, dynamic>? _hasil;

  void _resetResepBaru() {
    setState(() {
      _pasienCtrl.clear();
      _dokterCtrl.clear();
      _obatInputCtrl.clear();
      _daftarObat.clear();
      _hasil = null;
      _terverifikasi = false;
      _waktuVerifikasi = null;
      _galat = null;
    });
  }

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
      _daftarObat.add((
        nama: teks,
        dosis: 'Sesuai anjuran dokter',
        jumlah: '10 tab',
        keras: true,
      ));
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
            'daftar_obat': _daftarObat.map((e) => e.nama).toList(),
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
        setState(() => _galat =
            'Gagal memeriksa interaksi obat. Pastikan server backend aktif.');
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final peringatan =
        (_hasil?['peringatan'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    if (_terverifikasi) {
      final waktu = _waktuVerifikasi ?? DateTime.now();
      final jamStr =
          '${waktu.hour.toString().padLeft(2, '0')}:${waktu.minute.toString().padLeft(2, '0')}';

      return Scaffold(
        appBar: const AppBarPharma(
          peranLabel: 'APOTEKER',
          subjudul: 'Hasil Verifikasi Resep',
        ),
        body: ListView(
          padding: const EdgeInsets.all(TokenJarak.j4),
          children: [
            Container(
              padding: const EdgeInsets.all(TokenJarak.j4),
              decoration: BoxDecoration(
                color: TokenStatus.berhasilLatar,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: TokenStatus.berhasilTeks.withValues(alpha: 0.35),
                ),
              ),
              child: Column(
                children: [
                  const Icon(
                    LucideIcons.checkCircle2,
                    size: 44,
                    color: TokenStatus.berhasilTeks,
                  ),
                  const SizedBox(height: TokenJarak.j2),
                  Text(
                    'Resep Terverifikasi Apoteker',
                    textAlign: TextAlign.center,
                    style: TokenTipografi.seksi.copyWith(
                      color: TokenStatus.berhasilTeks,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'No. Resep: R-2458 · Diverifikasi pukul $jamStr',
                    style: TokenTipografi.keterangan.copyWith(
                      color: TokenStatus.berhasilTeks,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: TokenJarak.j4),
            Container(
              padding: const EdgeInsets.all(TokenJarak.j4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: TokenGaris.pemisah),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Ringkasan Resep', style: TokenTipografi.seksi),
                  const SizedBox(height: TokenJarak.j2),
                  Text(
                    'Dokter: ${_dokterCtrl.text.trim().isEmpty ? '-' : _dokterCtrl.text.trim()}',
                    style: TokenTipografi.dasar,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Pasien: ${_pasienCtrl.text.trim().isEmpty ? '-' : _pasienCtrl.text.trim()}',
                    style: TokenTipografi.dasar,
                  ),
                  const Divider(height: TokenJarak.j4),
                  Text(
                    'Daftar Obat (${_daftarObat.length} item)',
                    style: TokenTipografi.tabel.copyWith(
                      fontWeight: FontWeight.w700,
                      color: TokenTeks.sekunder,
                    ),
                  ),
                  const SizedBox(height: TokenJarak.j2),
                  ..._daftarObat.map(
                    (o) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${o.nama} · ${o.dosis}',
                              style: TokenTipografi.tabel,
                            ),
                          ),
                          Text(
                            o.jumlah,
                            style: TokenTipografi.tabel.copyWith(
                              fontWeight: FontWeight.w600,
                              color: TokenTeks.sekunder,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Divider(height: TokenJarak.j4),
                  Text(
                    peringatan.isEmpty
                        ? 'AI Safety Checker: Tidak ditemukan interaksi berbahaya.'
                        : 'AI Safety Checker: ${peringatan.length} peringatan interaksi telah ditinjau & disetujui apoteker.',
                    style: TokenTipografi.keterangan.copyWith(
                      color: TokenStatus.berhasilTeks,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: TokenJarak.j5),
            TombolPos(
              label: 'Verifikasi Resep Baru',
              ikon: LucideIcons.plus,
              onPressed: _resetResepBaru,
            ),
            const SizedBox(height: TokenJarak.j2),
            TombolPos(
              label: 'Kembali ke Form Resep',
              jenis: JenisTombol.sekunder,
              onPressed: () => setState(() => _terverifikasi = false),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: const AppBarPharma(
        peranLabel: 'APOTEKER',
        subjudul: 'Resep Dokter & AI Safety',
      ),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          // Header Resep Dokter seperti di video
          Container(
            padding: const EdgeInsets.all(TokenJarak.j4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: TokenGaris.pemisah),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0A064E3B),
                  blurRadius: 10,
                  offset: Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Resep Dokter', style: TokenTipografi.seksi),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _terverifikasi
                            ? TokenStatus.berhasilLatar
                            : TokenStatus.peringatanLatar,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _terverifikasi
                            ? '✓ Terverifikasi'
                            : 'Menunggu Verifikasi',
                        style: TokenTipografi.keterangan.copyWith(
                          fontWeight: FontWeight.w700,
                          color: _terverifikasi
                              ? TokenStatus.berhasilTeks
                              : TokenStatus.peringatanTeks,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: TokenJarak.j3),
                IsianTeksPos(
                    controller: _dokterCtrl, label: 'Dokter Penulis Resep'),
                const SizedBox(height: TokenJarak.j2),
                IsianTeksPos(controller: _pasienCtrl, label: 'Pasien'),
              ],
            ),
          ),
          const SizedBox(height: TokenJarak.j4),

          // Daftar Obat Resep
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Daftar Obat (${_daftarObat.length} item)',
                  style: TokenTipografi.dasar
                      .copyWith(fontWeight: FontWeight.w700)),
              Text('No. Resep: R-2458', style: TokenTipografi.keterangan),
            ],
          ),
          const SizedBox(height: TokenJarak.j2),
          Row(
            children: [
              Expanded(
                child: IsianTeksPos(
                  controller: _obatInputCtrl,
                  label: 'Tambah Obat ke Resep',
                  placeholder: 'cth: Warfarin 2 mg / Ibuprofen',
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
          ..._daftarObat.asMap().entries.map((e) {
            final item = e.value;
            return Container(
              margin: const EdgeInsets.only(bottom: TokenJarak.j2),
              padding: const EdgeInsets.symmetric(
                horizontal: TokenJarak.j3,
                vertical: TokenJarak.j3,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: TokenGaris.pemisah),
              ),
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: item.keras
                          ? TokenStatus.bahayaTeks
                          : TokenAksi.utama,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: TokenJarak.j3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.nama,
                            style: TokenTipografi.dasar
                                .copyWith(fontWeight: FontWeight.w600)),
                        Text(item.dosis, style: TokenTipografi.keterangan),
                      ],
                    ),
                  ),
                  Text(item.jumlah,
                      style: TokenTipografi.tabel.copyWith(
                          fontWeight: FontWeight.w600,
                          color: TokenTeks.sekunder)),
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
            );
          }),
          const SizedBox(height: TokenJarak.j3),
          if (_galat != null) ...[
            PesanPos(jenis: JenisPesan.bahaya, teks: _galat!),
            const SizedBox(height: TokenJarak.j3),
          ],

          // Tombol Ungu Gradient Cek Interaksi AI seperti di video
          Container(
            height: 50,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)],
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x337C3AED),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: ElevatedButton.icon(
              onPressed: _memuat ? null : _cekInteraksi,
              icon: _memuat
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(LucideIcons.sparkles, color: Colors.white),
              label: const Text(
                'Cek Interaksi AI',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),

          // Panel Hasil AI Drug Safety Checker (Kartu Ungu seperti video)
          if (_hasil != null) ...[
            const SizedBox(height: TokenJarak.j4),
            Container(
              padding: const EdgeInsets.all(TokenJarak.j4),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF7C3AED), Color(0xFF5B21B6)],
                ),
                borderRadius: BorderRadius.circular(18),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x2E7C3AED),
                    blurRadius: 16,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(LucideIcons.sparkles,
                          color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'AI Drug Safety Checker',
                          style: TokenTipografi.dasar.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Text(
                        '100%',
                        style: TokenTipografi.tabel.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: const LinearProgressIndicator(
                      value: 1.0,
                      minHeight: 6,
                      backgroundColor: Color(0x40FFFFFF),
                      color: Color(0xFF34D399),
                    ),
                  ),
                  const SizedBox(height: TokenJarak.j3),
                  if (peringatan.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(TokenJarak.j3),
                      decoration: BoxDecoration(
                        color: TokenStatus.berhasilLatar,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _hasil!['catatan_klinis'] as String,
                        style: TokenTipografi.tabel.copyWith(
                          color: TokenStatus.berhasilTeks,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    )
                  else
                    ...peringatan.map((p) {
                      final tinggi = p['tingkat'] == 'tinggi';
                      return Container(
                        margin: const EdgeInsets.only(bottom: TokenJarak.j2),
                        padding: const EdgeInsets.all(TokenJarak.j3),
                        decoration: BoxDecoration(
                          color: tinggi
                              ? const Color(0xFFFEF3C7)
                              : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  LucideIcons.alertTriangle,
                                  size: 16,
                                  color: tinggi
                                      ? TokenStatus.bahayaTeks
                                      : TokenStatus.peringatanTeks,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'INTERAKSI ${(p['tingkat'] as String).toUpperCase()}: ${p['judul']}',
                                    style: TokenTipografi.tabel.copyWith(
                                      fontWeight: FontWeight.w700,
                                      color: tinggi
                                          ? TokenStatus.bahayaTeks
                                          : TokenStatus.peringatanTeks,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(p['mekanisme'] as String,
                                style: TokenTipografi.keterangan
                                    .copyWith(color: TokenTeks.utama)),
                            const SizedBox(height: 6),
                            Text(
                              'Saran: ${p['saran']}',
                              style: TokenTipografi.keterangan.copyWith(
                                fontWeight: FontWeight.w700,
                                color: TokenTeks.utama,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  const SizedBox(height: TokenJarak.j2),
                  if (_terverifikasi)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: TokenStatus.berhasilTeks, width: 2),
                      ),
                      child: Column(
                        children: [
                          Text(
                            '✓ VERIFIKASI APOTEKER',
                            style: TokenTipografi.dasar.copyWith(
                              color: TokenStatus.berhasilTeks,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1,
                            ),
                          ),
                          Text(
                            'Saran klinis diterapkan · Resep siap diserahkan',
                            style: TokenTipografi.keterangan,
                          ),
                        ],
                      ),
                    )
                  else
                    TombolPos(
                      label: 'Verifikasi Apoteker',
                      ikon: LucideIcons.checkCircle2,
                      onPressed: () => setState(() {
                        _terverifikasi = true;
                        _waktuVerifikasi = DateTime.now();
                      }),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
