import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/galat.dart';
import '../../../inti/klien_api.dart';
import '../data/auth_repositori.dart';

class LayarMasuk extends ConsumerStatefulWidget {
  const LayarMasuk({super.key});

  @override
  ConsumerState<LayarMasuk> createState() => _LayarMasukState();
}

class _LayarMasukState extends ConsumerState<LayarMasuk> {
  final _usernameCtrl = TextEditingController();
  final _sandiCtrl = TextEditingController();
  bool _tampilkanSandi = false;
  bool _memuat = false;
  String? _pesanGalat;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _sandiCtrl.dispose();
    super.dispose();
  }

  Future<void> _aturServerDialog() async {
    final k = ref.read(klienApiProvider);
    final ctrl = TextEditingController(text: k.dio.options.baseUrl);
    final baru = await tampilkanDialogPos<String>(
      context: context,
      judul: 'Alamat Server Backend',
      isi: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Masukkan URL backend (akhiri dengan /api/v1):',
            style: TokenTipografi.keterangan,
          ),
          const SizedBox(height: TokenJarak.j2),
          IsianTeksPos(
            controller: ctrl,
            label: 'URL Server',
            placeholder: 'http://172.20.10.3:3000/api/v1',
          ),
        ],
      ),
      tombol: [
        TombolPos(
          label: 'Batal',
          jenis: JenisTombol.sekunder,
          penuh: false,
          onPressed: () => Navigator.pop(context),
        ),
        TombolPos(
          label: 'Simpan',
          penuh: false,
          onPressed: () => Navigator.pop(context, ctrl.text.trim()),
        ),
      ],
    );
    if (baru != null && baru.isNotEmpty && mounted) {
      var url = baru;
      if (!url.endsWith('/api/v1')) {
        url = '${url.replaceAll(RegExp(r'/+$'), '')}/api/v1';
      }
      setState(() {
        k.dio.options.baseUrl = url;
        _pesanGalat = null;
      });
    }
  }

  Future<void> _masuk() async {
    setState(() {
      _memuat = true;
      _pesanGalat = null;
    });
    try {
      await ref
          .read(authRepositoriProvider)
          .masuk(_usernameCtrl.text, _sandiCtrl.text);
    } on GalatApi catch (g) {
      String pesan = g.pesan;
      if (g.kode == 'AKUN_TERKUNCI' && g.detail['terkunci_sampai'] != null) {
        pesan =
            '${g.pesan} Coba lagi setelah pukul ${formatJam(g.detail['terkunci_sampai'])}.';
      }
      if (mounted) {
        setState(() => _pesanGalat = pesan);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _pesanGalat = 'Gagal masuk. Periksa koneksi Anda.');
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F7F5),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero Gradient Emerald seperti video PharmaPOS
            Container(
              padding: const EdgeInsets.fromLTRB(24, 56, 24, 48),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF065F46),
                    Color(0xFF059669),
                    Color(0xFF10B981),
                  ],
                ),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32),
                ),
              ),
              child: Column(
                children: [
                  const LogoPharmaPos(ukuran: 68, terbalik: true),
                  const SizedBox(height: 14),
                  Text(
                    'PharmaPOS',
                    style: TokenTipografi.judul.copyWith(
                      color: Colors.white,
                      fontSize: 28,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Apotek Binaan KADIN Bengkalis · Riau',
                    style: TokenTipografi.tabel.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            ),
            // Floating White Card
            Transform.translate(
              offset: const Offset(0, -28),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x14064E3B),
                        blurRadius: 24,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Masuk', style: TokenTipografi.seksi),
                      const SizedBox(height: 2),
                      Text(
                        'Gunakan akun yang terdaftar di apotek Anda',
                        style: TokenTipografi.keterangan,
                      ),
                      const SizedBox(height: TokenJarak.j4),
                      if (_pesanGalat != null) ...[
                        PesanPos(jenis: JenisPesan.bahaya, teks: _pesanGalat!),
                        const SizedBox(height: TokenJarak.j3),
                      ],
                      IsianTeksPos(
                        controller: _usernameCtrl,
                        label: 'Username / ID Pegawai',
                        placeholder: 'contoh: kasir1',
                        keyboardType: TextInputType.text,
                      ),
                      const SizedBox(height: TokenJarak.j3),
                      IsianTeksPos(
                        controller: _sandiCtrl,
                        label: 'Kata sandi',
                        sembunyikan: !_tampilkanSandi,
                        akhiran: TextButton(
                          onPressed: () => setState(
                              () => _tampilkanSandi = !_tampilkanSandi),
                          child: Text(
                            _tampilkanSandi ? 'Sembunyikan' : 'Tampilkan',
                            style: TokenTipografi.keterangan.copyWith(
                              color: TokenAksi.utama,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: TokenJarak.j4),
                      Text(
                        'Masuk cepat sebagai:',
                        style: TokenTipografi.keterangan
                            .copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: TokenJarak.j2),
                      Row(
                        children: [
                          ('Kasir', 'kasir1'),
                          ('Apoteker', 'apoteker1'),
                          ('Gudang', 'gudang1'),
                          ('Owner', 'pemilik1'),
                        ].map((r) {
                          final dipilih = _usernameCtrl.text.trim() == r.$2;
                          return Expanded(
                            child: Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 2),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(8),
                                onTap: () {
                                  setState(() {
                                    _usernameCtrl.text = r.$2;
                                    if (_sandiCtrl.text.isEmpty) {
                                      _sandiCtrl.text = 'Demo12345';
                                    }
                                  });
                                },
                                child: Container(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 8),
                                  decoration: BoxDecoration(
                                    color: dipilih
                                        ? TokenAksi.utama
                                        : TokenLatar.halaman,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: dipilih
                                          ? TokenAksi.utama
                                          : TokenGaris.pemisah,
                                    ),
                                  ),
                                  child: Text(
                                    r.$1,
                                    textAlign: TextAlign.center,
                                    style: TokenTipografi.keterangan.copyWith(
                                      fontWeight: FontWeight.w600,
                                      color: dipilih
                                          ? Colors.white
                                          : TokenTeks.sekunder,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: TokenJarak.j5),
                      TombolPos(
                        label: 'Masuk',
                        memuat: _memuat,
                        onPressed: _masuk,
                      ),
                      const SizedBox(height: TokenJarak.j3),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(LucideIcons.shieldCheck,
                              size: 14, color: TokenAksi.utama),
                          const SizedBox(width: 6),
                          Text(
                            'Data tersimpan aman & tersinkron ke server',
                            style: TokenTipografi.keterangan,
                          ),
                        ],
                      ),
                      const SizedBox(height: TokenJarak.j2),
                      Center(
                        child: TextButton.icon(
                          onPressed: _aturServerDialog,
                          icon: const Icon(LucideIcons.server, size: 14),
                          label: Text(
                            'Server: ${ref.watch(klienApiProvider).dio.options.baseUrl}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TokenTipografi.keterangan.copyWith(
                              color: TokenAksi.utama,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class LayarGantiSandi extends ConsumerStatefulWidget {
  final bool wajib;
  const LayarGantiSandi({super.key, this.wajib = false});

  @override
  ConsumerState<LayarGantiSandi> createState() => _LayarGantiSandiState();
}

class _LayarGantiSandiState extends ConsumerState<LayarGantiSandi> {
  final _lamaCtrl = TextEditingController();
  final _baruCtrl = TextEditingController();
  final _konfCtrl = TextEditingController();
  bool _memuat = false;
  String? _pesanGalat;
  String? _pesanSukses;

  @override
  void dispose() {
    _lamaCtrl.dispose();
    _baruCtrl.dispose();
    _konfCtrl.dispose();
    super.dispose();
  }

  Future<void> _simpan() async {
    if (_baruCtrl.text != _konfCtrl.text) {
      setState(() => _pesanGalat = 'Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    setState(() {
      _memuat = true;
      _pesanGalat = null;
      _pesanSukses = null;
    });
    try {
      await ref
          .read(authRepositoriProvider)
          .gantiSandi(_lamaCtrl.text, _baruCtrl.text);
      if (mounted) {
        setState(() => _pesanSukses = 'Kata sandi berhasil diperbarui.');
        if (!widget.wajib && Navigator.of(context).canPop()) {
          Navigator.of(context).pop();
        }
      }
    } on GalatApi catch (g) {
      if (mounted) setState(() => _pesanGalat = g.pesan);
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ganti Kata Sandi'),
        automaticallyImplyLeading: !widget.wajib,
        actions: widget.wajib
            ? [
                IconButton(
                  icon: const Icon(LucideIcons.logOut),
                  tooltip: 'Keluar',
                  onPressed: () => ref.read(authRepositoriProvider).keluar(),
                ),
              ]
            : null,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.wajib) ...[
              const PesanPos(
                jenis: JenisPesan.peringatan,
                teks:
                    'Anda wajib mengganti kata sandi awal sebelum menggunakan aplikasi.',
              ),
              const SizedBox(height: TokenJarak.j4),
            ],
            if (_pesanGalat != null) ...[
              PesanPos(jenis: JenisPesan.bahaya, teks: _pesanGalat!),
              const SizedBox(height: TokenJarak.j4),
            ],
            if (_pesanSukses != null) ...[
              PesanPos(jenis: JenisPesan.berhasil, teks: _pesanSukses!),
              const SizedBox(height: TokenJarak.j4),
            ],
            IsianTeksPos(
              controller: _lamaCtrl,
              label: 'Kata sandi lama',
              sembunyikan: true,
            ),
            const SizedBox(height: TokenJarak.j4),
            IsianTeksPos(
              controller: _baruCtrl,
              label: 'Kata sandi baru',
              sembunyikan: true,
              teksBantu:
                  '8-72 karakter, minimal 1 huruf dan 1 angka, tidak sama dengan username.',
            ),
            const SizedBox(height: TokenJarak.j4),
            IsianTeksPos(
              controller: _konfCtrl,
              label: 'Ulangi kata sandi baru',
              sembunyikan: true,
            ),
            const SizedBox(height: TokenJarak.j6),
            TombolPos(
                label: 'Simpan Kata Sandi',
                memuat: _memuat,
                onPressed: _simpan),
          ],
        ),
      ),
    );
  }
}
