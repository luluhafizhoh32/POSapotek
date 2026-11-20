import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/antrean.dart';
import '../../../inti/format.dart';
import '../../../inti/klien_api.dart';
import '../../../inti/sesi.dart';
import '../../auth/data/auth_repositori.dart';
import '../../auth/tampilan/layar_auth.dart';

class LayarNotifikasi extends ConsumerStatefulWidget {
  const LayarNotifikasi({super.key});

  @override
  ConsumerState<LayarNotifikasi> createState() => _LayarNotifikasiState();
}

class _LayarNotifikasiState extends ConsumerState<LayarNotifikasi> {
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
      final res = await k.kirim(() => k.dio.get('/notifikasi'));
      if (mounted) {
        setState(() => _daftar = (res.data['data'] as List).cast<Map<String, dynamic>>());
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _bacaSemua() async {
    final k = ref.read(klienApiProvider);
    await k.kirim(() => k.dio.post('/notifikasi/dibaca-semua'));
    await _muat();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifikasi'),
        actions: [
          TextButton(onPressed: _bacaSemua, child: const Text('Tandai Semua')),
        ],
      ),
      body: _memuat
          ? const Center(child: CircularProgressIndicator())
          : _daftar.isEmpty
              ? const Center(child: Text('Tidak ada notifikasi.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(TokenJarak.j4),
                  itemCount: _daftar.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (ctx, i) {
                    final n = _daftar[i];
                    final belumBaca = n['dibaca_pada'] == null;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      tileColor: belumBaca ? TokenLatar.terpilih : null,
                      title: Text(
                        n['judul'] as String,
                        style: TokenTipografi.dasar.copyWith(
                          fontWeight: belumBaca ? FontWeight.w700 : FontWeight.w400,
                        ),
                      ),
                      subtitle: Text(
                        '${n['isi']}\n${formatTanggalJam(n['dibuat_pada'])}',
                        style: TokenTipografi.keterangan,
                      ),
                      onTap: () async {
                        if (belumBaca) {
                          final k = ref.read(klienApiProvider);
                          await k.kirim(() => k.dio.post('/notifikasi/${n['id']}/dibaca'));
                          await _muat();
                        }
                      },
                    );
                  },
                ),
    );
  }
}

class LayarAkun extends ConsumerWidget {
  const LayarAkun({super.key});

  Future<void> _pilihPrinter(BuildContext context, WidgetRef ref) async {
    final devices = await PrintBluetoothThermal.pairedBluetooths;
    if (!context.mounted) return;
    await tampilkanDialogPos<void>(
      context: context,
      judul: 'Pilih Printer Bluetooth',
      isi: devices.isEmpty
          ? const Text('Tidak ada perangkat Bluetooth yang dipasangkan.')
          : SizedBox(
              width: 300,
              height: 240,
              child: ListView.builder(
                itemCount: devices.length,
                itemBuilder: (ctx, i) {
                  final d = devices[i];
                  return ListTile(
                    title: Text(d.name),
                    subtitle: Text(d.macAdress),
                    onTap: () async {
                      await ref.read(sesiProvider.notifier).simpanPrinter(d.macAdress, d.name);
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                  );
                },
              ),
            ),
      tombol: [
        TombolPos(
          label: 'Tutup',
          jenis: JenisTombol.sekunder,
          penuh: false,
          onPressed: () => Navigator.pop(context),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sesi = ref.watch(sesiProvider);
    final pengguna = sesi.pengguna;
    final antrean = ref.watch(antreanProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Akun')),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          if (pengguna != null) ...[
            Text(pengguna.namaLengkap, style: TokenTipografi.judul),
            const SizedBox(height: TokenJarak.j1),
            Text(
              '${pengguna.labelPeran} · ${pengguna.apotekNama} (${pengguna.apotekKode})',
              style: TokenTipografi.dasar.copyWith(color: TokenTeks.sekunder),
            ),
            const SizedBox(height: TokenJarak.j6),
          ],
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(LucideIcons.keyRound),
            title: const Text('Ganti Kata Sandi'),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const LayarGantiSandi()),
              );
            },
          ),
          const Divider(),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(LucideIcons.printer),
            title: const Text('Pilih Printer'),
            subtitle: Text(sesi.printerNama ?? 'Printer belum dipilih'),
            onTap: () => _pilihPrinter(context, ref),
          ),
          const Divider(),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(LucideIcons.info),
            title: Text('Versi Aplikasi'),
            subtitle: Text('1.0.0'),
          ),
          const SizedBox(height: TokenJarak.j6),
          TombolPos(
            label: 'Keluar',
            jenis: JenisTombol.bahaya,
            onPressed: () async {
              if (antrean.isNotEmpty) {
                final keluar = await tampilkanDialogPos<bool>(
                  context: context,
                  judul: 'Keluar',
                  isi: Text(
                    'Ada ${antrean.length} transaksi belum terkirim.',
                    style: TokenTipografi.dasar,
                  ),
                  tombol: [
                    TombolPos(
                      label: 'Batal',
                      jenis: JenisTombol.sekunder,
                      penuh: false,
                      onPressed: () => Navigator.pop(context, false),
                    ),
                    TombolPos(
                      label: 'Keluar dan Hapus Antrean',
                      jenis: JenisTombol.bahaya,
                      penuh: false,
                      onPressed: () => Navigator.pop(context, true),
                    ),
                  ],
                );
                if (keluar != true) return;
                if (pengguna != null) {
                  await ref.read(basisDataLokalProvider).hapusSemuaAntreanPengguna(pengguna.id);
                }
              }
              await ref.read(authRepositoriProvider).keluar();
            },
          ),
        ],
      ),
    );
  }
}
