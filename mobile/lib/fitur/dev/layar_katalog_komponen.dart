import 'package:material_ui/material_ui.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../app/komponen.dart';
import '../../app/komponen_v2.dart';
import '../../app/token.dart';

/// Halaman katalog komponen internal (/dev/components, hanya mode debug).
class LayarKatalogKomponen extends StatelessWidget {
  const LayarKatalogKomponen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Katalog Komponen PharmaPOS v2.1')),
      body: ListView(
        padding: const EdgeInsets.all(TokenJarak.j4),
        children: [
          const SectionHeader(judul: 'Logo & Status Badges'),
          const SizedBox(height: TokenJarak.j3),
          const Wrap(
            spacing: 12,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              LogoPharmaPos(ukuran: 44),
              StatusBadge(label: 'Disetujui', varian: VarianStatus.success),
              StatusBadge(label: 'Menunggu', varian: VarianStatus.warning),
              StatusBadge(label: 'Kedaluwarsa', varian: VarianStatus.danger),
              StatusBadge(label: 'Menunggu sinkron', varian: VarianStatus.info),
              StatusBadge(label: 'Draf', varian: VarianStatus.neutral),
            ],
          ),
          const SizedBox(height: TokenJarak.j6),
          const SectionHeader(judul: 'KPI Cards'),
          const SizedBox(height: TokenJarak.j3),
          const KpiCard(
            label: 'Penjualan hari ini',
            nilai: 'Rp 4.850.000',
            delta: '+12% dari kemarin',
            deltaPositif: true,
            catatan: '42 transaksi',
            hero: true,
          ),
          const SizedBox(height: TokenJarak.j3),
          const KpiCard(
            label: 'Laba kotor bulan ini',
            nilai: 'Rp 18.420.000',
            delta: '+8,4%',
            deltaPositif: true,
          ),
          const SizedBox(height: TokenJarak.j6),
          const SectionHeader(judul: 'Tombol & Isian'),
          const SizedBox(height: TokenJarak.j3),
          TombolPos(label: 'Tindakan Utama', onPressed: () {}),
          const SizedBox(height: TokenJarak.j2),
          TombolPos(
              label: 'Tindakan Sekunder',
              jenis: JenisTombol.sekunder,
              onPressed: () {}),
          const SizedBox(height: TokenJarak.j2),
          const IsianTeksPos(
              label: 'Nama Barang', placeholder: 'Paracetamol 500 mg'),
          const SizedBox(height: TokenJarak.j6),
          const SectionHeader(judul: 'Empty & Error State'),
          const SizedBox(height: TokenJarak.j3),
          EmptyState(
            ikon: LucideIcons.packageOpen,
            judul: 'Belum ada data',
            keterangan: 'Tambahkan item pertama untuk mulai mencatat.',
            labelTombol: 'Tambah Baru',
            onAksi: () {},
          ),
        ],
      ),
    );
  }
}
