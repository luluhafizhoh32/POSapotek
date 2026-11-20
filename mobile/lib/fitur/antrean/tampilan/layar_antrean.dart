import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/antrean.dart';
import '../../../inti/format.dart';

class LayarAntrean extends ConsumerWidget {
  const LayarAntrean({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final daftar = ref.watch(antreanProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Antrean Transaksi'),
        actions: [
          if (daftar.any((e) => e.status == 'tertunda'))
            TextButton(
              onPressed: () =>
                  ref.read(antreanProvider.notifier).prosesAntrean(),
              child: const Text('Kirim Sekarang'),
            ),
        ],
      ),
      body: daftar.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(TokenJarak.j4),
                child: Text('Tidak ada transaksi tertunda.',
                    style: TokenTipografi.dasar),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(TokenJarak.j4),
              itemCount: daftar.length,
              separatorBuilder: (_, __) =>
                  const SizedBox(height: TokenJarak.j3),
              itemBuilder: (ctx, i) {
                final item = daftar[i];
                final judulJenis = switch (item.jenis) {
                  'penjualan' => 'Penjualan Tunai',
                  'penerimaan' => 'Penerimaan Barang',
                  'opname' => 'Opname Stok',
                  'pengajuan' => 'Pengajuan Pengurangan',
                  _ => item.jenis,
                };
                return Container(
                  padding: const EdgeInsets.all(TokenJarak.j3),
                  decoration: BoxDecoration(
                    color: TokenLatar.latar,
                    border: Border.all(color: TokenGaris.pemisah),
                    borderRadius: BorderRadius.circular(TokenRadius.kecil),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              judulJenis,
                              style: TokenTipografi.dasar
                                  .copyWith(fontWeight: FontWeight.w600),
                            ),
                          ),
                          LencanaStatusPos(status: item.status),
                        ],
                      ),
                      const SizedBox(height: TokenJarak.j1),
                      Text(
                        formatTanggalJam(item.dibuatPada),
                        style: TokenTipografi.keterangan,
                      ),
                      if (item.status == 'gagal' &&
                          item.pesanGalat != null) ...[
                        const SizedBox(height: TokenJarak.j2),
                        PesanPos(
                            jenis: JenisPesan.bahaya, teks: item.pesanGalat!),
                        const SizedBox(height: TokenJarak.j2),
                        Row(
                          children: [
                            Expanded(
                              child: TombolPos(
                                label: 'Coba Lagi',
                                onPressed: () => ref
                                    .read(antreanProvider.notifier)
                                    .cobaLagiItem(item.id),
                              ),
                            ),
                            const SizedBox(width: TokenJarak.j2),
                            Expanded(
                              child: TombolPos(
                                label: 'Hapus',
                                jenis: JenisTombol.bahaya,
                                onPressed: () async {
                                  final yakin = await tampilkanDialogPos<bool>(
                                    context: ctx,
                                    judul: 'Hapus Transaksi',
                                    isi: const Text(
                                      'Data transaksi ini akan dihapus dan tidak bisa dikembalikan.',
                                      style: TokenTipografi.dasar,
                                    ),
                                    tombol: [
                                      TombolPos(
                                        label: 'Batal',
                                        jenis: JenisTombol.sekunder,
                                        penuh: false,
                                        onPressed: () =>
                                            Navigator.pop(ctx, false),
                                      ),
                                      TombolPos(
                                        label: 'Hapus',
                                        jenis: JenisTombol.bahaya,
                                        penuh: false,
                                        onPressed: () =>
                                            Navigator.pop(ctx, true),
                                      ),
                                    ],
                                  );
                                  if (yakin == true) {
                                    await ref
                                        .read(antreanProvider.notifier)
                                        .hapus(item.id);
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
    );
  }
}
