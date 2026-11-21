import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app/komponen.dart';
import '../../../app/komponen_v2.dart';
import '../../../app/token.dart';
import '../../../inti/format.dart';
import '../../../inti/galat.dart';
import '../../../inti/klien_api.dart';

class LayarPengguna extends ConsumerStatefulWidget {
  const LayarPengguna({super.key});

  @override
  ConsumerState<LayarPengguna> createState() => _LayarPenggunaState();
}

class _LayarPenggunaState extends ConsumerState<LayarPengguna> {
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
      final res = await k.kirim(
          () => k.dio.get('/pengguna', queryParameters: {'per_halaman': 100}));
      if (mounted) {
        setState(() =>
            _daftar = (res.data['data'] as List).cast<Map<String, dynamic>>());
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _tambahPengguna() async {
    final userCtrl = TextEditingController();
    final namaCtrl = TextEditingController();
    final sandiCtrl = TextEditingController();
    String peran = 'kasir';

    await tampilkanDialogPos<void>(
      context: context,
      judul: 'Tambah Pengguna',
      isi: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IsianTeksPos(controller: userCtrl, label: 'Username'),
          const SizedBox(height: TokenJarak.j2),
          IsianTeksPos(controller: namaCtrl, label: 'Nama Lengkap'),
          const SizedBox(height: TokenJarak.j2),
          DropdownButtonFormField<String>(
            initialValue: peran,
            decoration: const InputDecoration(labelText: 'Peran'),
            items: const [
              DropdownMenuItem(value: 'kasir', child: Text('Kasir')),
              DropdownMenuItem(
                  value: 'staf_gudang', child: Text('Staf Gudang')),
              DropdownMenuItem(value: 'apa', child: Text('Apoteker')),
            ],
            onChanged: (v) => peran = v ?? 'kasir',
          ),
          const SizedBox(height: TokenJarak.j2),
          IsianTeksPos(
              controller: sandiCtrl,
              label: 'Kata Sandi Awal',
              sembunyikan: true),
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
          onPressed: () async {
            final k = ref.read(klienApiProvider);
            await k.kirim(() => k.dio.post('/pengguna', data: {
                  'username': userCtrl.text.trim(),
                  'nama_lengkap': namaCtrl.text.trim(),
                  'peran': peran,
                  'kata_sandi_awal': sandiCtrl.text,
                }));
            if (mounted) Navigator.pop(context);
            await _muat();
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengguna'),
        actions: [
          IconButton(
              icon: const Icon(LucideIcons.plus), onPressed: _tambahPengguna),
        ],
      ),
      body: _memuat
          ? const SkeletonLoader()
          : PageContainer(
              maxWidth: 820,
              child: ListView.separated(
                itemCount: _daftar.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: TokenJarak.j2),
                itemBuilder: (ctx, i) {
                  final u = _daftar[i];
                  final id = (u['id'] as num).toInt();
                  final aktif = u['aktif'] as bool;
                  final peran = u['peran'] as String;
                  final nama = (u['nama_lengkap'] as String?) ?? '?';
                  return Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: TokenJarak.j4, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(TokenRadius.besar),
                      border: Border.all(color: AppColors.border),
                      boxShadow: AppShadows.card,
                    ),
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primaryTint,
                        foregroundColor: AppColors.primary,
                        child: Text(
                          nama.isNotEmpty ? nama[0].toUpperCase() : '?',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      title: Text('$nama (${u['username']})',
                          style: TokenTipografi.dasar
                              .copyWith(fontWeight: FontWeight.w600)),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Wrap(
                          spacing: 6,
                          children: [
                            StatusBadge(
                                label: peran.toUpperCase(),
                                varian: VarianStatus.info),
                            StatusBadge(
                              label: aktif ? 'Aktif' : 'Nonaktif',
                              varian: aktif
                                  ? VarianStatus.success
                                  : VarianStatus.danger,
                            ),
                          ],
                        ),
                      ),
                      trailing: peran == 'pemilik'
                          ? null
                          : PopupMenuButton<String>(
                          onSelected: (aksi) async {
                            final k = ref.read(klienApiProvider);
                            if (aksi == 'toggle') {
                              await k.kirim(
                                () => k.dio.post(
                                    '/pengguna/$id/${aktif ? 'nonaktifkan' : 'aktifkan'}'),
                              );
                              await _muat();
                            } else if (aksi == 'reset') {
                              final ctrl = TextEditingController();
                              await tampilkanDialogPos<void>(
                                context: context,
                                judul: 'Atur Ulang Kata Sandi',
                                isi: IsianTeksPos(
                                  controller: ctrl,
                                  label: 'Kata Sandi Baru',
                                  sembunyikan: true,
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
                                    onPressed: () async {
                                      try {
                                        await k.kirim(() => k.dio.post(
                                              '/pengguna/$id/reset-sandi',
                                              data: {
                                                'kata_sandi_baru': ctrl.text
                                              },
                                            ));
                                        if (context.mounted) {
                                          Navigator.pop(context);
                                        }
                                      } on GalatApi catch (_) {}
                                    },
                                  ),
                                ],
                              );
                            }
                          },
                          itemBuilder: (_) => [
                            PopupMenuItem(
                              value: 'toggle',
                              child: Text(aktif ? 'Nonaktifkan' : 'Aktifkan'),
                            ),
                            const PopupMenuItem(
                              value: 'reset',
                              child: Text('Atur Ulang Kata Sandi'),
                            ),
                          ],
                        ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}

class LayarJejakAudit extends ConsumerStatefulWidget {
  const LayarJejakAudit({super.key});

  @override
  ConsumerState<LayarJejakAudit> createState() => _LayarJejakAuditState();
}

class _LayarJejakAuditState extends ConsumerState<LayarJejakAudit> {
  List<Map<String, dynamic>> _daftar = [];
  bool _memuat = true;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      try {
        final k = ref.read(klienApiProvider);
        final res = await k.kirim(() =>
            k.dio.get('/jejak-audit', queryParameters: {'per_halaman': 50}));
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
      appBar: AppBar(title: const Text('Jejak Audit')),
      body: _memuat
          ? const SkeletonLoader()
          : _daftar.isEmpty
              ? const EmptyState(
                  ikon: LucideIcons.shieldCheck,
                  judul: 'Belum ada jejak audit',
                  keterangan: 'Aktivitas penting pengguna tercatat otomatis.',
                )
              : PageContainer(
                  maxWidth: 820,
                  child: ListView.separated(
                    itemCount: _daftar.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: TokenJarak.j2),
                    itemBuilder: (ctx, i) {
                      final a = _daftar[i];
                      final pengguna = a['pengguna'] as Map<String, dynamic>?;
                      final berhasil = a['hasil'] == 'berhasil';
                      return Container(
                        padding: const EdgeInsets.all(TokenJarak.j3),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius:
                              BorderRadius.circular(TokenRadius.sedang),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${a['aksi']}',
                                      style: TokenTipografi.tabel.copyWith(
                                          fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${pengguna?['nama_lengkap'] ?? 'Sistem'} · ${formatTanggalJam(a['waktu'])}',
                                    style: TokenTipografi.keterangan,
                                  ),
                                ],
                              ),
                            ),
                            StatusBadge(
                              label: '${a['hasil']}',
                              varian: berhasil
                                  ? VarianStatus.success
                                  : VarianStatus.danger,
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
