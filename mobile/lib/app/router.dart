import 'dart:async';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../fitur/ai/tampilan/layar_ai_insight.dart';
import '../fitur/ai/tampilan/layar_asisten_ai.dart';
import '../fitur/ai/tampilan/layar_cek_interaksi_ai.dart';
import '../fitur/antrean/tampilan/layar_antrean.dart';
import '../fitur/auth/tampilan/layar_auth.dart';
import '../fitur/dev/layar_katalog_komponen.dart';
import '../fitur/keuangan/tampilan/layar_aset_anggaran.dart';
import '../fitur/keuangan/tampilan/layar_keuangan.dart';
import '../fitur/keuangan/tampilan/layar_utang_buku_besar.dart';
import '../fitur/laporan/tampilan/layar_laporan.dart';
import '../fitur/master/tampilan/layar_master.dart';
import '../fitur/near_expired/tampilan/layar_near_expired.dart';
import '../fitur/notifikasi/tampilan/layar_notifikasi.dart';
import '../fitur/opname/tampilan/layar_opname.dart';
import '../fitur/penerimaan/tampilan/layar_penerimaan.dart';
import '../fitur/penerimaan/tampilan/layar_surat_pesanan.dart';
import '../fitur/pengajuan/tampilan/layar_pengajuan.dart';
import '../fitur/pengaturan/tampilan/layar_pengaturan.dart';
import '../fitur/pengguna/tampilan/layar_pengguna.dart';
import '../fitur/penjualan/tampilan/layar_penjualan.dart';
import '../inti/antrean.dart';
import '../inti/klien_api.dart';
import '../inti/sesi.dart';
import 'komponen_v2.dart';
import 'token.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final sesi = ref.watch(sesiProvider);

  return GoRouter(
    initialLocation: '/beranda',
    redirect: (ctx, state) {
      if (!sesi.sudahMuat) return null;
      final diMasuk = state.matchedLocation == '/masuk';
      final diWajibSandi = state.matchedLocation == '/wajib-ganti-sandi';

      if (!sesi.terautentikasi) {
        return diMasuk ? null : '/masuk';
      }
      if (sesi.pengguna!.wajibGantiSandi) {
        return diWajibSandi ? null : '/wajib-ganti-sandi';
      }
      if (diMasuk || diWajibSandi) {
        return '/beranda';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/masuk', builder: (_, __) => const LayarMasuk()),
      GoRoute(
        path: '/wajib-ganti-sandi',
        builder: (_, __) => const LayarGantiSandi(wajib: true),
      ),
      GoRoute(path: '/beranda', builder: (_, __) => const CangkangUtama()),
      if (kDebugMode)
        GoRoute(
          path: '/dev/components',
          builder: (_, __) => const LayarKatalogKomponen(),
        ),
    ],
  );
});

class CangkangUtama extends ConsumerStatefulWidget {
  const CangkangUtama({super.key});

  @override
  ConsumerState<CangkangUtama> createState() => _CangkangUtamaState();
}

class _CangkangUtamaState extends ConsumerState<CangkangUtama>
    with WidgetsBindingObserver {
  int _indeks = 0;
  int _jumlahNotif = 0;
  Timer? _notifTimer;
  Timer? _antreanTimer;
  StreamSubscription<List<ConnectivityResult>>? _connSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future.microtask(() {
      ref.read(antreanProvider.notifier).muat().then((_) {
        ref.read(antreanProvider.notifier).prosesAntrean();
      });
      _segarkanNotif();
    });

    _notifTimer =
        Timer.periodic(const Duration(seconds: 60), (_) => _segarkanNotif());
    _antreanTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      ref.read(antreanProvider.notifier).prosesAntrean();
    });
    _connSub = Connectivity().onConnectivityChanged.listen((results) {
      if (results.any((r) => r != ConnectivityResult.none)) {
        ref.read(antreanProvider.notifier).prosesAntrean();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(antreanProvider.notifier).prosesAntrean();
      _segarkanNotif();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _notifTimer?.cancel();
    _antreanTimer?.cancel();
    _connSub?.cancel();
    super.dispose();
  }

  Future<void> _segarkanNotif() async {
    try {
      final k = ref.read(klienApiProvider);
      final res = await k.kirim(
        () =>
            k.dio.get('/notifikasi', queryParameters: {'belum_dibaca': 'true'}),
      );
      final meta = res.data['meta'] as Map<String, dynamic>;
      if (mounted) {
        setState(() => _jumlahNotif = (meta['total'] as num).toInt());
      }
    } catch (_) {}
  }

  void _bukaNotifikasi() {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const LayarNotifikasi()))
        .then(
          (_) => _segarkanNotif(),
        );
  }

  @override
  Widget build(BuildContext context) {
    final pengguna = ref.watch(sesiProvider).pengguna;
    if (pengguna == null) return const SizedBox.shrink();

    final antreanCount = ref
        .watch(antreanProvider)
        .where((e) => e.status == 'tertunda' || e.status == 'gagal')
        .length;

    final tabs = _bangunTabUntukPeran(pengguna.peran, antreanCount);
    final idxAman = _indeks.clamp(0, tabs.length - 1);

    return ResponsiveScaffold(
      indeksAktif: idxAman,
      onPilihTab: (i) => setState(() => _indeks = i),
      namaApotek: pengguna.apotekNama,
      labelPeran: pengguna.labelPeran,
      tabs: tabs.map((t) {
        final grup = switch (t.label) {
          'Beranda' => 'Ringkasan',
          'Penjualan' ||
          'Riwayat' ||
          'Antrean' ||
          'Penerimaan' ||
          'Opname' ||
          'Pengajuan' ||
          'Pengesahan' ||
          'Near-expired' =>
            'Operasional',
          'Laporan' || 'Keuangan' => 'Keuangan & Laporan',
          'Cek AI' || 'AI Insight' => 'Kecerdasan AI',
          _ => 'Sistem',
        };
        return ItemNavigasiPos(
          label: t.label,
          ikon: t.ikon,
          layar: t.layar,
          badge: t.badge,
          grup: grup,
        );
      }).toList(),
    );
  }

  List<({String label, IconData ikon, Widget layar, int badge})>
      _bangunTabUntukPeran(
    String peran,
    int antreanCount,
  ) {
    switch (peran) {
      case 'kasir':
        return [
          (
            label: 'Penjualan',
            ikon: LucideIcons.shoppingCart,
            layar: LayarPenjualan(
              onBukaNotifikasi: _bukaNotifikasi,
              jumlahNotifikasi: _jumlahNotif,
            ),
            badge: 0,
          ),
          (
            label: 'Riwayat',
            ikon: LucideIcons.history,
            layar: const LayarRiwayatPenjualan(),
            badge: 0,
          ),
          (
            label: 'Antrean',
            ikon: LucideIcons.uploadCloud,
            layar: const LayarAntrean(),
            badge: antreanCount,
          ),
          (
            label: 'Akun',
            ikon: LucideIcons.user,
            layar: const LayarAkun(),
            badge: 0,
          ),
        ];
      case 'staf_gudang':
        return [
          (
            label: 'Penerimaan',
            ikon: LucideIcons.packagePlus,
            layar: const LayarPenerimaan(),
            badge: 0,
          ),
          (
            label: 'Opname',
            ikon: LucideIcons.clipboardCheck,
            layar: const LayarOpname(),
            badge: 0,
          ),
          (
            label: 'Pengajuan',
            ikon: LucideIcons.fileMinus,
            layar: const LayarDaftarPengajuan(),
            badge: 0,
          ),
          (
            label: 'Lainnya',
            ikon: LucideIcons.menu,
            layar: _LayarLainnya(
              item: [
                (
                  'Stok & Barang',
                  LucideIcons.package,
                  () => const LayarMasterBarang()
                ),
                (
                  'Pemasok',
                  LucideIcons.truck,
                  () => const LayarMasterPemasok()
                ),
                (
                  'Near-expired',
                  LucideIcons.alertTriangle,
                  () => const LayarNearExpired()
                ),
                (
                  'Surat Pesanan (SP)',
                  LucideIcons.fileSignature,
                  () => const LayarSuratPesanan()
                ),
                (
                  'Defekta',
                  LucideIcons.trendingDown,
                  () => const LayarDefekta()
                ),
                (
                  'Antrean ($antreanCount)',
                  LucideIcons.uploadCloud,
                  () => const LayarAntrean()
                ),
                ('Notifikasi', LucideIcons.bell, () => const LayarNotifikasi()),
                ('Akun', LucideIcons.user, () => const LayarAkun()),
              ],
            ),
            badge: antreanCount,
          ),
        ];
      case 'apa':
        return [
          (
            label: 'Pengesahan',
            ikon: LucideIcons.checkSquare,
            layar: const LayarDaftarPengajuan(),
            badge: 0,
          ),
          (
            label: 'Cek AI',
            ikon: LucideIcons.sparkles,
            layar: const LayarCekInteraksiAi(),
            badge: 0,
          ),
          (
            label: 'Near-expired',
            ikon: LucideIcons.alertTriangle,
            layar: const LayarNearExpired(),
            badge: 0,
          ),
          (
            label: 'Laporan',
            ikon: LucideIcons.barChart3,
            layar: const LayarLaporanOperasional(),
            badge: 0,
          ),
          (
            label: 'Lainnya',
            ikon: LucideIcons.menu,
            layar: _LayarLainnya(
              item: [
                (
                  'Stok & Barang',
                  LucideIcons.package,
                  () => const LayarMasterBarang()
                ),
                ('Notifikasi', LucideIcons.bell, () => const LayarNotifikasi()),
                ('Akun', LucideIcons.user, () => const LayarAkun()),
              ],
            ),
            badge: 0,
          ),
        ];
      default: // pemilik
        return [
          (
            label: 'Beranda',
            ikon: LucideIcons.home,
            layar: LayarBerandaPemilik(
              onBukaNotifikasi: _bukaNotifikasi,
              jumlahNotifikasi: _jumlahNotif,
            ),
            badge: 0,
          ),
          (
            label: 'Laporan',
            ikon: LucideIcons.barChart3,
            layar: const LayarLaporanOperasional(),
            badge: 0,
          ),
          (
            label: 'Keuangan',
            ikon: LucideIcons.wallet,
            layar: const LayarKeuangan(),
            badge: 0,
          ),
          (
            label: 'AI Insight',
            ikon: LucideIcons.sparkles,
            layar: const LayarAiInsight(),
            badge: 0,
          ),
          (
            label: 'Lainnya',
            ikon: LucideIcons.menu,
            layar: _LayarLainnya(
              item: [
                (
                  'Asisten AI PharmaPOS',
                  LucideIcons.messageSquare,
                  () => const LayarAsistenAi()
                ),
                (
                  'Cek Interaksi AI',
                  LucideIcons.sparkles,
                  () => const LayarCekInteraksiAi()
                ),
                (
                  'Surat Pesanan (SP)',
                  LucideIcons.fileSignature,
                  () => const LayarSuratPesanan()
                ),
                (
                  'Utang Usaha (PBF)',
                  LucideIcons.receipt,
                  () => const LayarUtangPemasok()
                ),
                (
                  'Buku Besar',
                  LucideIcons.bookMarked,
                  () => const LayarBukuBesar()
                ),
                (
                  'Aset Tetap & Anggaran',
                  LucideIcons.building2,
                  () => const LayarAsetAnggaran()
                ),
                ('Pengguna', LucideIcons.users, () => const LayarPengguna()),
                (
                  'Pengaturan',
                  LucideIcons.settings,
                  () => const LayarPengaturan()
                ),
                (
                  'Barang',
                  LucideIcons.package,
                  () => const LayarMasterBarang()
                ),
                (
                  'Pemasok',
                  LucideIcons.truck,
                  () => const LayarMasterPemasok()
                ),
                (
                  'Saldo Awal',
                  LucideIcons.landmark,
                  () => const LayarSaldoAwal()
                ),
                (
                  'Jurnal Manual',
                  LucideIcons.bookOpen,
                  () => const LayarJurnalManual()
                ),
                (
                  'Tutup Periode',
                  LucideIcons.lock,
                  () => const LayarTutupPeriode()
                ),
                (
                  'Jejak Audit',
                  LucideIcons.shieldCheck,
                  () => const LayarJejakAudit()
                ),
                (
                  'Apotek Pantau',
                  LucideIcons.eye,
                  () => const LayarPantauBulanan()
                ),
                ('Notifikasi', LucideIcons.bell, () => const LayarNotifikasi()),
                ('Akun', LucideIcons.user, () => const LayarAkun()),
              ],
            ),
            badge: 0,
          ),
        ];
    }
  }
}

class _LayarLainnya extends StatelessWidget {
  final List<(String, IconData, Widget Function())> item;
  const _LayarLainnya({required this.item});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Menu & Pengaturan')),
      body: PageContainer(
        child: ListView.separated(
          itemCount: item.length,
          separatorBuilder: (_, __) => const SizedBox(height: TokenJarak.j2),
          itemBuilder: (ctx, i) {
            final e = item[i];
            return Material(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(TokenRadius.sedang),
              child: InkWell(
                borderRadius: BorderRadius.circular(TokenRadius.sedang),
                onTap: () => Navigator.of(ctx)
                    .push(MaterialPageRoute(builder: (_) => e.$3())),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: TokenJarak.j4,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(TokenRadius.sedang),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppColors.primaryTint,
                          borderRadius:
                              BorderRadius.circular(TokenRadius.kecil),
                        ),
                        child: Icon(e.$2, size: 19, color: AppColors.primary),
                      ),
                      const SizedBox(width: TokenJarak.j3),
                      Expanded(
                        child: Text(
                          e.$1,
                          style: TokenTipografi.dasar
                              .copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                      const Icon(LucideIcons.chevronRight,
                          size: 18, color: AppColors.textMuted),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
