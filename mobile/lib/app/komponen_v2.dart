import 'package:material_ui/material_ui.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'komponen.dart';
import 'token.dart';

enum VarianStatus { success, warning, danger, info, neutral }

/// Lencana status dengan ikon & teks (tidak pernah hanya warna).
class StatusBadge extends StatelessWidget {
  final String label;
  final VarianStatus varian;
  final IconData? ikon;

  const StatusBadge({
    super.key,
    required this.label,
    this.varian = VarianStatus.neutral,
    this.ikon,
  });

  @override
  Widget build(BuildContext context) {
    final (bg, fg, defaultIcon) = switch (varian) {
      VarianStatus.success => (
          AppColors.successBg,
          AppColors.success,
          LucideIcons.checkCircle2
        ),
      VarianStatus.warning => (
          AppColors.warningBg,
          AppColors.warning,
          LucideIcons.alertTriangle
        ),
      VarianStatus.danger => (
          AppColors.dangerBg,
          AppColors.danger,
          LucideIcons.alertOctagon
        ),
      VarianStatus.info => (
          AppColors.infoBg,
          AppColors.info,
          LucideIcons.info
        ),
      VarianStatus.neutral => (
          AppColors.surfaceAlt,
          AppColors.textSecondary,
          LucideIcons.circleDot
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(TokenRadius.kecil),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(ikon ?? defaultIcon, size: 13, color: fg),
          const SizedBox(width: 5),
          Text(
            label,
            style: TokenTipografi.keterangan.copyWith(
              color: fg,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Kartu KPI: label kecil di atas, angka besar tabular, delta opsional.
/// Hanya 1 kartu per layar (hero: true) yang memakai gradasi tonal Deep Teal.
class KpiCard extends StatelessWidget {
  final String label;
  final String nilai;
  final String? delta;
  final bool? deltaPositif;
  final String? catatan;
  final bool hero;
  final VoidCallback? onTap;

  const KpiCard({
    super.key,
    required this.label,
    required this.nilai,
    this.delta,
    this.deltaPositif,
    this.catatan,
    this.hero = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: const EdgeInsets.all(TokenJarak.j4),
      decoration: BoxDecoration(
        gradient: hero
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.primary, AppColors.primaryPressed],
              )
            : null,
        color: hero ? null : AppColors.surface,
        borderRadius: BorderRadius.circular(TokenRadius.besar),
        border: hero ? null : Border.all(color: AppColors.border),
        boxShadow: hero ? AppShadows.floating : AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TokenTipografi.keterangan.copyWith(
              color: hero
                  ? AppColors.textOnPrimary.withValues(alpha: 0.85)
                  : AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            nilai,
            style: TokenTipografi.angkaTabular(
              hero ? TokenTipografi.ringkasan : TokenTipografi.judul,
            ).copyWith(
              color: hero ? AppColors.textOnPrimary : AppColors.textPrimary,
            ),
          ),
          if (delta != null || catatan != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                if (delta != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: hero
                          ? Colors.white.withValues(alpha: 0.16)
                          : (deltaPositif == false
                              ? AppColors.dangerBg
                              : AppColors.successBg),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          deltaPositif == false
                              ? LucideIcons.arrowDownRight
                              : LucideIcons.arrowUpRight,
                          size: 13,
                          color: hero
                              ? Colors.white
                              : (deltaPositif == false
                                  ? AppColors.danger
                                  : AppColors.success),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          delta!,
                          style: TokenTipografi.keterangan.copyWith(
                            color: hero
                                ? Colors.white
                                : (deltaPositif == false
                                    ? AppColors.danger
                                    : AppColors.success),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (catatan != null) ...[
                  if (delta != null) const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      catatan!,
                      overflow: TextOverflow.ellipsis,
                      style: TokenTipografi.keterangan.copyWith(
                        color: hero
                            ? Colors.white.withValues(alpha: 0.85)
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    );

    if (onTap == null) return content;
    return InkWell(
      borderRadius: BorderRadius.circular(TokenRadius.besar),
      onTap: onTap,
      child: content,
    );
  }
}

/// Judul seksi tenang dengan tombol aksi opsional di kanan.
class SectionHeader extends StatelessWidget {
  final String judul;
  final String? aksiLabel;
  final VoidCallback? onAksi;

  const SectionHeader({
    super.key,
    required this.judul,
    this.aksiLabel,
    this.onAksi,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          judul,
          style: TokenTipografi.subjudul.copyWith(color: AppColors.textPrimary),
        ),
        if (aksiLabel != null && onAksi != null)
          TextButton(
            onPressed: onAksi,
            child: Text(
              aksiLabel!,
              style: TokenTipografi.tabel.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }
}

/// Keadaan kosong yang ramah dengan ikon, judul, penjelasan, dan tindakan.
class EmptyState extends StatelessWidget {
  final IconData ikon;
  final String judul;
  final String keterangan;
  final String? labelTombol;
  final VoidCallback? onAksi;

  const EmptyState({
    super.key,
    required this.ikon,
    required this.judul,
    required this.keterangan,
    this.labelTombol,
    this.onAksi,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(TokenJarak.j6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                color: AppColors.primaryTint,
                shape: BoxShape.circle,
              ),
              child: Icon(ikon, size: 26, color: AppColors.primary),
            ),
            const SizedBox(height: TokenJarak.j3),
            Text(judul,
                textAlign: TextAlign.center, style: TokenTipografi.subjudul),
            const SizedBox(height: TokenJarak.j1),
            Text(
              keterangan,
              textAlign: TextAlign.center,
              style: TokenTipografi.tabel
                  .copyWith(color: AppColors.textSecondary),
            ),
            if (labelTombol != null && onAksi != null) ...[
              const SizedBox(height: TokenJarak.j4),
              TombolPos(label: labelTombol!, penuh: false, onPressed: onAksi),
            ],
          ],
        ),
      ),
    );
  }
}

/// Skeleton loader lembut meniru bentuk kartu (bukan spinner di tengah layar).
class SkeletonLoader extends StatelessWidget {
  final int jumlahBaris;
  final double tinggiKartu;

  const SkeletonLoader({
    super.key,
    this.jumlahBaris = 4,
    this.tinggiKartu = 76,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(TokenJarak.j4),
      itemCount: jumlahBaris,
      separatorBuilder: (_, __) => const SizedBox(height: TokenJarak.j3),
      itemBuilder: (_, __) => Container(
        height: tinggiKartu,
        padding: const EdgeInsets.all(TokenJarak.j4),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(TokenRadius.besar),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 140,
              height: 12,
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              height: 16,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Keadaan galat yang jelas dengan tombol Coba lagi.
class ErrorState extends StatelessWidget {
  final String pesan;
  final VoidCallback onCobaLagi;

  const ErrorState({
    super.key,
    required this.pesan,
    required this.onCobaLagi,
  });

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      ikon: LucideIcons.wifiOff,
      judul: 'Terjadi gangguan',
      keterangan: pesan,
      labelTombol: 'Coba lagi',
      onAksi: onCobaLagi,
    );
  }
}

/// Item navigasi untuk ResponsiveScaffold.
class ItemNavigasiPos {
  final String label;
  final IconData ikon;
  final Widget layar;
  final int badge;
  final String? grup;

  const ItemNavigasiPos({
    required this.label,
    required this.ikon,
    required this.layar,
    this.badge = 0,
    this.grup,
  });
}

/// Wrapper konten responsif agar halaman tidak melar tak terkendali di desktop.
class PageContainer extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  final EdgeInsetsGeometry? padding;

  const PageContainer({
    super.key,
    required this.child,
    this.maxWidth = 1080,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    final pad = padding ??
        EdgeInsets.symmetric(
          horizontal: w >= 1024 ? 32 : (w >= 768 ? 24 : 16),
          vertical: w >= 768 ? 20 : 16,
        );
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(padding: pad, child: child),
      ),
    );
  }
}

/// Shell responsif lintas platform:
/// - Ponsel (< 768 px): Bottom Navigation Bar
/// - Tablet & Desktop (>= 768 px): Collapsible Sidebar terkelompok + ruang kerja lapang
class ResponsiveScaffold extends StatefulWidget {
  final List<ItemNavigasiPos> tabs;
  final int indeksAktif;
  final ValueChanged<int> onPilihTab;
  final String namaApotek;
  final String labelPeran;

  const ResponsiveScaffold({
    super.key,
    required this.tabs,
    required this.indeksAktif,
    required this.onPilihTab,
    required this.namaApotek,
    required this.labelPeran,
  });

  @override
  State<ResponsiveScaffold> createState() => _ResponsiveScaffoldState();
}

class _ResponsiveScaffoldState extends State<ResponsiveScaffold> {
  bool _ciutkan = false;

  @override
  Widget build(BuildContext context) {
    final lebar = MediaQuery.sizeOf(context).width;
    final desktop = lebar >= 768;

    if (!desktop) {
      return Scaffold(
        body: widget.tabs[widget.indeksAktif].layar,
        bottomNavigationBar: Container(
          height: TokenUkuran.tinggiBilahBawah,
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: NavigationBar(
            height: TokenUkuran.tinggiBilahBawah,
            selectedIndex: widget.indeksAktif,
            onDestinationSelected: widget.onPilihTab,
            destinations: widget.tabs
                .map(
                  (t) => NavigationDestination(
                    icon: t.badge > 0
                        ? Badge(label: Text('${t.badge}'), child: Icon(t.ikon))
                        : Icon(t.ikon),
                    label: t.label,
                  ),
                )
                .toList(),
          ),
        ),
      );
    }

    // Tablet & Desktop: Collapsible Sidebar terkelompok ala Linear/Stripe
    final tampilTeks = lebar >= 1024 && !_ciutkan;
    final lebarSidebar = tampilTeks ? 252.0 : 88.0;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Row(
        children: [
          AnimatedContainer(
            duration: AppMotion.normal,
            curve: AppMotion.curve,
            width: lebarSidebar,
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(right: BorderSide(color: AppColors.border)),
            ),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 12, 12),
                    child: Row(
                      mainAxisAlignment: tampilTeks
                          ? MainAxisAlignment.start
                          : MainAxisAlignment.center,
                      children: [
                        const LogoPharmaPos(ukuran: 34),
                        if (tampilTeks) ...[
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'PharmaPOS',
                                  style: TokenTipografi.subjudul
                                      .copyWith(fontWeight: FontWeight.w700),
                                ),
                                Text(
                                  widget.namaApotek,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TokenTipografi.keterangan,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            tooltip: 'Ciutkan sidebar',
                            onPressed: () => setState(() => _ciutkan = true),
                            icon: const Icon(LucideIcons.panelLeftClose,
                                size: 18, color: AppColors.textSecondary),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (!tampilTeks && lebar >= 1024)
                    Center(
                      child: IconButton(
                        tooltip: 'Lebarkan sidebar',
                        onPressed: () => setState(() => _ciutkan = false),
                        icon: const Icon(LucideIcons.panelLeftOpen,
                            size: 18, color: AppColors.textSecondary),
                      ),
                    ),
                  if (tampilTeks)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: StatusBadge(
                          label: widget.labelPeran,
                          varian: VarianStatus.info,
                          ikon: LucideIcons.shieldCheck,
                        ),
                      ),
                    ),
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 8),
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      itemCount: widget.tabs.length,
                      itemBuilder: (ctx, i) {
                        final t = widget.tabs[i];
                        final aktif = i == widget.indeksAktif;
                        final prevGrup = i > 0 ? widget.tabs[i - 1].grup : null;
                        final tampilHeaderGrup =
                            tampilTeks && t.grup != null && t.grup != prevGrup;

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (tampilHeaderGrup)
                              Padding(
                                padding:
                                    const EdgeInsets.fromLTRB(10, 12, 10, 6),
                                child: Text(
                                  t.grup!.toUpperCase(),
                                  style: TokenTipografi.keterangan.copyWith(
                                    fontSize: 10.5,
                                    letterSpacing: 0.8,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ),
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: InkWell(
                                borderRadius:
                                    BorderRadius.circular(TokenRadius.sedang),
                                onTap: () => widget.onPilihTab(i),
                                child: Container(
                                  constraints: BoxConstraints(
                                    minHeight: tampilTeks ? 44 : 56,
                                  ),
                                  padding: EdgeInsets.symmetric(
                                    horizontal: tampilTeks ? 12 : 4,
                                    vertical: tampilTeks ? 0 : 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: aktif
                                        ? AppColors.primaryTint
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(
                                        TokenRadius.sedang),
                                  ),
                                  child: tampilTeks
                                      ? Row(
                                          children: [
                                            t.badge > 0
                                                ? Badge(
                                                    label: Text('${t.badge}'),
                                                    child: Icon(
                                                      t.ikon,
                                                      size: 19,
                                                      color: aktif
                                                          ? AppColors.primary
                                                          : AppColors
                                                              .textSecondary,
                                                    ),
                                                  )
                                                : Icon(
                                                    t.ikon,
                                                    size: 19,
                                                    color: aktif
                                                        ? AppColors.primary
                                                        : AppColors
                                                            .textSecondary,
                                                  ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Text(
                                                t.label,
                                                style: TokenTipografi.tabel
                                                    .copyWith(
                                                  fontWeight: aktif
                                                      ? FontWeight.w700
                                                      : FontWeight.w500,
                                                  color: aktif
                                                      ? AppColors.primary
                                                      : AppColors.textPrimary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        )
                                      : Column(
                                          mainAxisSize: MainAxisSize.min,
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          children: [
                                            t.badge > 0
                                                ? Badge(
                                                    label: Text('${t.badge}'),
                                                    child: Icon(
                                                      t.ikon,
                                                      size: 20,
                                                      color: aktif
                                                          ? AppColors.primary
                                                          : AppColors
                                                              .textSecondary,
                                                    ),
                                                  )
                                                : Icon(
                                                    t.ikon,
                                                    size: 20,
                                                    color: aktif
                                                        ? AppColors.primary
                                                        : AppColors
                                                            .textSecondary,
                                                  ),
                                            const SizedBox(height: 4),
                                            Text(
                                              t.label,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              textAlign: TextAlign.center,
                                              style: TokenTipografi.keterangan
                                                  .copyWith(
                                                fontSize: 10,
                                                fontWeight: aktif
                                                    ? FontWeight.w700
                                                    : FontWeight.w500,
                                                color: aktif
                                                    ? AppColors.primary
                                                    : AppColors.textSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  if (tampilTeks)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        'Untuk Apotek Binaan KADIN Bengkalis',
                        style: TokenTipografi.keterangan,
                      ),
                    ),
                ],
              ),
            ),
          ),
          Expanded(
            child: widget.tabs[widget.indeksAktif].layar,
          ),
        ],
      ),
    );
  }
}
