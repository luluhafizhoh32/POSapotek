import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/galat.dart';
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(TokenJarak.j4),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('POS Apotek KADIN', style: TokenTipografi.judul),
                  const SizedBox(height: TokenJarak.j1),
                  Text(
                    'Silakan masuk dengan akun apotek Anda',
                    style: TokenTipografi.dasar
                        .copyWith(color: TokenTeks.sekunder),
                  ),
                  const SizedBox(height: TokenJarak.j6),
                  if (_pesanGalat != null) ...[
                    PesanPos(jenis: JenisPesan.bahaya, teks: _pesanGalat!),
                    const SizedBox(height: TokenJarak.j4),
                  ],
                  IsianTeksPos(
                    controller: _usernameCtrl,
                    label: 'Username',
                    placeholder: 'contoh: kasir1',
                    keyboardType: TextInputType.text,
                  ),
                  const SizedBox(height: TokenJarak.j4),
                  IsianTeksPos(
                    controller: _sandiCtrl,
                    label: 'Kata sandi',
                    sembunyikan: !_tampilkanSandi,
                    akhiran: TextButton(
                      onPressed: () =>
                          setState(() => _tampilkanSandi = !_tampilkanSandi),
                      child: Text(
                        _tampilkanSandi ? 'Sembunyikan' : 'Tampilkan',
                        style: TokenTipografi.keterangan.copyWith(
                          color: TokenAksi.utama,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: TokenJarak.j6),
                  TombolPos(
                    label: 'Masuk',
                    memuat: _memuat,
                    onPressed: _masuk,
                  ),
                ],
              ),
            ),
          ),
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
