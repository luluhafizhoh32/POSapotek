import 'dart:async';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:uuid/uuid.dart';
import '../../../app/komponen.dart';
import '../../../app/token.dart';
import '../../../inti/antrean.dart';
import '../../../inti/format.dart';
import '../../../inti/galat.dart';
import '../../../inti/klien_api.dart';
import '../../../inti/printer.dart';
import '../../../inti/sesi.dart';
import '../data/penjualan_repositori.dart';

class ItemKeranjang {
  final ItemBarangPos barang;
  final int jumlah;
  final String? statusPratinjau;
  final int? stokTersedia;

  const ItemKeranjang({
    required this.barang,
    required this.jumlah,
    this.statusPratinjau,
    this.stokTersedia,
  });

  int get subtotal => barang.hargaJual * jumlah;

  ItemKeranjang copyWith(
          {int? jumlah, String? statusPratinjau, int? stokTersedia}) =>
      ItemKeranjang(
        barang: barang,
        jumlah: jumlah ?? this.jumlah,
        statusPratinjau: statusPratinjau ?? this.statusPratinjau,
        stokTersedia: stokTersedia ?? this.stokTersedia,
      );
}

final pencetakProvider = Provider<IPencetak>((ref) => PencetakBluetooth());

class LayarPenjualan extends ConsumerStatefulWidget {
  final VoidCallback? onBukaNotifikasi;
  final int jumlahNotifikasi;

  const LayarPenjualan({
    super.key,
    this.onBukaNotifikasi,
    this.jumlahNotifikasi = 0,
  });

  @override
  ConsumerState<LayarPenjualan> createState() => _LayarPenjualanState();
}

class _LayarPenjualanState extends ConsumerState<LayarPenjualan> {
  final _cariCtrl = TextEditingController();
  final List<ItemKeranjang> _keranjang = [];
  List<ItemBarangPos> _hasilCari = [];
  String _filterGolongan = 'semua';
  bool _pelangganMember = false;
  String _kunciIdempoten = const Uuid().v4();
  Timer? _debouncePratinjau;
  bool _sedangOfflineEstimasi = false;
  String? _pesanInfo;
  HasilSimpanPenjualan? _hasilBerhasil;
  bool _tertundaTerakhir = false;
  List<({String nama, int jumlah, int hargaSatuan, int subtotal})>
      _barisTertunda = const [];
  int _totalTertunda = 0;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(penjualanRepositoriProvider).segarkanCacheBarang();
      _cariBarang('');
    });
  }

  @override
  void dispose() {
    _cariCtrl.dispose();
    _debouncePratinjau?.cancel();
    super.dispose();
  }

  Future<void> _cariBarang(String q) async {
    final res = await ref.read(penjualanRepositoriProvider).cariBarang(q: q);
    if (mounted) {
      setState(() => _hasilCari = res);
    }
  }

  Future<void> _pindaiBarcode() async {
    final kode = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SizedBox(
        height: 400,
        child: Column(
          children: [
            AppBar(title: const Text('Pindai Barcode')),
            Expanded(
              child: MobileScanner(
                onDetect: (capture) {
                  final val = capture.barcodes.firstOrNull?.rawValue;
                  if (val != null && val.isNotEmpty) {
                    Navigator.of(ctx).pop(val);
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
    if (kode == null || kode.isEmpty) return;
    final res =
        await ref.read(penjualanRepositoriProvider).cariBarang(barcode: kode);
    if (!mounted) return;
    if (res.isEmpty) {
      setState(() => _pesanInfo = 'Barcode tidak dikenal.');
    } else {
      _tambahKeKeranjang(res.first);
    }
  }

  void _tambahKeKeranjang(ItemBarangPos barang) {
    setState(() {
      _pesanInfo = null;
      final idx = _keranjang.indexWhere((k) => k.barang.id == barang.id);
      if (idx >= 0) {
        _keranjang[idx] =
            _keranjang[idx].copyWith(jumlah: _keranjang[idx].jumlah + 1);
      } else {
        _keranjang.add(ItemKeranjang(barang: barang, jumlah: 1));
      }
    });
    _jadwalkanPratinjau();
  }

  void _ubahJumlah(int index, int jumlahBaru) {
    setState(() {
      if (jumlahBaru <= 0) {
        _keranjang.removeAt(index);
      } else {
        _keranjang[index] = _keranjang[index].copyWith(jumlah: jumlahBaru);
      }
    });
    _jadwalkanPratinjau();
  }

  void _jadwalkanPratinjau() {
    _debouncePratinjau?.cancel();
    if (_keranjang.isEmpty) return;
    _debouncePratinjau =
        Timer(const Duration(milliseconds: 300), _jalankanPratinjau);
  }

  Future<void> _jalankanPratinjau() async {
    if (_keranjang.isEmpty) return;
    try {
      final res = await ref.read(penjualanRepositoriProvider).pratinjau(
            _keranjang
                .map((k) => (barangId: k.barang.id, jumlah: k.jumlah))
                .toList(),
          );
      if (!mounted) return;
      setState(() {
        _sedangOfflineEstimasi = false;
        for (int i = 0; i < _keranjang.length; i++) {
          final p = res.perBarang[_keranjang[i].barang.id];
          if (p != null) {
            _keranjang[i] = _keranjang[i].copyWith(
              statusPratinjau: p.status,
              stokTersedia: p.stokTersedia,
            );
          }
        }
      });
    } on GalatApi catch (g) {
      if (g.adalahGalatJaringan && mounted) {
        setState(() => _sedangOfflineEstimasi = true);
      }
    }
  }

  int get _totalKeranjang => _keranjang.fold(0, (a, b) => a + b.subtotal);

  bool get _bisaBayar {
    if (_keranjang.isEmpty) return false;
    if (_sedangOfflineEstimasi) return true;
    return _keranjang
        .every((k) => k.statusPratinjau == null || k.statusPratinjau == 'ok');
  }

  Future<void> _bukaPanelPembayaran() async {
    final hasil = await showModalBottomSheet<_HasilPanelBayar>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(TokenRadius.sedang)),
      ),
      builder: (ctx) => _PanelPembayaran(
        total: _totalKeranjang,
        kunciIdempoten: _kunciIdempoten,
        baris: _keranjang
            .map((k) => (barangId: k.barang.id, jumlah: k.jumlah))
            .toList(),
        sedangOffline: _sedangOfflineEstimasi,
      ),
    );
    if (!mounted || hasil == null) return;

    if (hasil.tertunda) {
      setState(() {
        _tertundaTerakhir = true;
        _barisTertunda = _keranjang
            .map((k) => (
                  nama: k.barang.nama,
                  jumlah: k.jumlah,
                  hargaSatuan: k.barang.hargaJual,
                  subtotal: k.subtotal,
                ))
            .toList();
        _totalTertunda = _totalKeranjang;
        _keranjang.clear();
        _kunciIdempoten = const Uuid().v4();
      });
    } else if (hasil.penjualan != null) {
      setState(() {
        _hasilBerhasil = hasil.penjualan;
        _tertundaTerakhir = false;
        _keranjang.clear();
        _kunciIdempoten = const Uuid().v4();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final printerMac = ref.watch(sesiProvider).printerMac;

    if (_hasilBerhasil != null || _tertundaTerakhir) {
      return Scaffold(
        appBar: const AppBarPharma(
          peranLabel: 'KASIR',
          subjudul: 'Konfirmasi Transaksi',
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(TokenJarak.j4),
          child: Container(
            padding: const EdgeInsets.all(TokenJarak.j5),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: TokenGaris.pemisah),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x12064E3B),
                  blurRadius: 18,
                  offset: Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_tertundaTerakhir) ...[
                  const PesanPos(
                    jenis: JenisPesan.informasi,
                    teks:
                        'Transaksi tertunda. Akan dikirim otomatis saat tersambung.',
                  ),
                  const SizedBox(height: TokenJarak.j4),
                  Text(
                    formatRupiah(_totalTertunda),
                    textAlign: TextAlign.center,
                    style:
                        TokenTipografi.angkaTabular(TokenTipografi.ringkasan),
                  ),
                  const SizedBox(height: TokenJarak.j5),
                  TombolPos(
                    label: printerMac == null
                        ? 'Printer belum dipilih'
                        : 'Cetak Bukti Sementara',
                    jenis: JenisTombol.sekunder,
                    onPressed: printerMac == null
                        ? null
                        : () =>
                            ref.read(pencetakProvider).cetakBuktiSementara(
                                  baris: _barisTertunda,
                                  total: _totalTertunda,
                                  alamatMac: printerMac,
                                ),
                  ),
                ] else if (_hasilBerhasil != null) ...[
                  Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: const BoxDecoration(
                        color: TokenStatus.berhasilLatar,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        LucideIcons.checkCircle2,
                        size: 36,
                        color: TokenStatus.berhasilTeks,
                      ),
                    ),
                  ),
                  const SizedBox(height: TokenJarak.j3),
                  const Text(
                    'Penjualan berhasil disimpan.',
                    textAlign: TextAlign.center,
                    style: TokenTipografi.seksi,
                  ),
                  const SizedBox(height: TokenJarak.j2),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: TokenStatus.berhasilLatar,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '✓ Stok FEFO otomatis dikurangi',
                        style: TokenTipografi.keterangan.copyWith(
                          color: TokenStatus.berhasilTeks,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: TokenJarak.j4),
                  Container(
                    padding: const EdgeInsets.all(TokenJarak.j3),
                    decoration: BoxDecoration(
                      color: TokenLatar.halaman,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Nomor: ${_hasilBerhasil!.nomor}',
                            style: TokenTipografi.dasar
                                .copyWith(fontWeight: FontWeight.w600)),
                        const SizedBox(height: TokenJarak.j1),
                        Text(
                          'Total: ${formatRupiah(_hasilBerhasil!.total)}',
                          style: TokenTipografi.angkaTabular(
                                  TokenTipografi.judul)
                              .copyWith(color: TokenAksi.utama),
                        ),
                        if (_hasilBerhasil!.kembalian != null) ...[
                          const SizedBox(height: TokenJarak.j1),
                          Text(
                            'Kembalian: ${formatRupiah(_hasilBerhasil!.kembalian!)}',
                            style: TokenTipografi.angkaTabular(
                                    TokenTipografi.seksi)
                                .copyWith(color: TokenStatus.berhasilTeks),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: TokenJarak.j5),
                  TombolPos(
                    label: printerMac == null
                        ? 'Printer belum dipilih'
                        : 'Cetak Struk',
                    ikon: LucideIcons.printer,
                    onPressed: printerMac == null
                        ? null
                        : () async {
                            final struk = await ref
                                .read(penjualanRepositoriProvider)
                                .ambilStruk(_hasilBerhasil!.id);
                            await ref
                                .read(pencetakProvider)
                                .cetakStruk(struk, printerMac);
                          },
                  ),
                ],
                const SizedBox(height: TokenJarak.j3),
                TombolPos(
                  label: 'Transaksi Baru',
                  jenis: JenisTombol.sekunder,
                  onPressed: () {
                    setState(() {
                      _hasilBerhasil = null;
                      _tertundaTerakhir = false;
                    });
                  },
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBarPharma(
        peranLabel: 'KASIR',
        subjudul: 'Kasir POS',
        onBukaNotifikasi: widget.onBukaNotifikasi,
        jumlahNotifikasi: widget.jumlahNotifikasi,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(TokenJarak.j3),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: TokenUkuran.tinggiIsian,
                    child: TextField(
                      controller: _cariCtrl,
                      onChanged: _cariBarang,
                      style: TokenTipografi.dasar,
                      decoration: InputDecoration(
                        hintText: 'Cari obat atau pindai barcode',
                        hintStyle: TokenTipografi.dasar
                            .copyWith(color: TokenTeks.placeholder),
                        filled: true,
                        fillColor: TokenLatar.latar,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: TokenJarak.j3),
                        enabledBorder: OutlineInputBorder(
                          borderRadius:
                              BorderRadius.circular(TokenRadius.kecil),
                          borderSide: const BorderSide(color: TokenGaris.isian),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius:
                              BorderRadius.circular(TokenRadius.kecil),
                          borderSide: const BorderSide(
                            color: TokenAksi.fokus,
                            width: TokenGarisTebal.t2,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: TokenJarak.j2),
                TombolPos(
                  label: 'Pindai',
                  ikon: LucideIcons.scanLine,
                  jenis: JenisTombol.sekunder,
                  penuh: false,
                  onPressed: _pindaiBarcode,
                ),
              ],
            ),
          ),
          if (_pesanInfo != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: TokenJarak.j3),
              child: PesanPos(jenis: JenisPesan.peringatan, teks: _pesanInfo!),
            ),
          if (_sedangOfflineEstimasi)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: TokenJarak.j3),
              child: PesanPos(
                jenis: JenisPesan.informasi,
                teks: 'Stok belum diperiksa (offline).',
              ),
            ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: TokenJarak.j3),
              children: [
                if (_keranjang.isNotEmpty) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Keranjang (${_keranjang.length})',
                          style: TokenTipografi.seksi),
                      ActionChip(
                        avatar: Icon(
                          _pelangganMember
                              ? LucideIcons.userCheck
                              : LucideIcons.userPlus,
                          size: 16,
                          color: TokenAksi.utama,
                        ),
                        label: Text(
                            _pelangganMember ? 'Member Aktif' : '+ Member'),
                        onPressed: () => setState(
                            () => _pelangganMember = !_pelangganMember),
                      ),
                    ],
                  ),
                  const SizedBox(height: TokenJarak.j2),
                  ...List.generate(_keranjang.length, (i) {
                    final item = _keranjang[i];
                    String? pesanBaris;
                    if (item.statusPratinjau == 'stok_tidak_cukup') {
                      pesanBaris =
                          'Stok tidak cukup (sisa ${item.stokTersedia ?? 0})';
                    } else if (item.statusPratinjau ==
                        'semua_batch_kedaluwarsa') {
                      pesanBaris = 'Semua batch kedaluwarsa';
                    } else if (item.statusPratinjau == 'barang_nonaktif') {
                      pesanBaris = 'Barang nonaktif';
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: TokenJarak.j2),
                      padding: const EdgeInsets.all(TokenJarak.j3),
                      decoration: BoxDecoration(
                        color: TokenLatar.latar,
                        borderRadius: BorderRadius.circular(TokenRadius.sedang),
                        border: Border.all(color: WarnaMentah.utama200),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x0D064E3B),
                            blurRadius: 8,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  item.barang.nama,
                                  style: TokenTipografi.dasar
                                      .copyWith(fontWeight: FontWeight.w600),
                                ),
                              ),
                              Text(
                                formatRupiah(item.subtotal),
                                style: TokenTipografi.angkaTabular(
                                        TokenTipografi.dasar)
                                    .copyWith(fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          const SizedBox(height: TokenJarak.j1),
                          Row(
                            children: [
                              SizedBox(
                                width: TokenUkuran.targetSentuhMin,
                                height: TokenUkuran.targetSentuhMin,
                                child: IconButton(
                                  onPressed: () =>
                                      _ubahJumlah(i, item.jumlah - 1),
                                  icon: const Icon(LucideIcons.minus),
                                ),
                              ),
                              SizedBox(
                                width: 56,
                                child: Text(
                                  '${item.jumlah}',
                                  textAlign: TextAlign.center,
                                  style: TokenTipografi.angkaTabular(
                                      TokenTipografi.dasar),
                                ),
                              ),
                              SizedBox(
                                width: TokenUkuran.targetSentuhMin,
                                height: TokenUkuran.targetSentuhMin,
                                child: IconButton(
                                  onPressed: () =>
                                      _ubahJumlah(i, item.jumlah + 1),
                                  icon: const Icon(LucideIcons.plus),
                                ),
                              ),
                              const Spacer(),
                              TextButton(
                                onPressed: () => _ubahJumlah(i, 0),
                                child: Text(
                                  'Hapus',
                                  style: TokenTipografi.tabel
                                      .copyWith(color: TokenStatus.bahayaTeks),
                                ),
                              ),
                            ],
                          ),
                          if (pesanBaris != null)
                            Padding(
                              padding:
                                  const EdgeInsets.only(top: TokenJarak.j1),
                              child: Text(
                                pesanBaris,
                                style: TokenTipografi.keterangan
                                    .copyWith(color: TokenStatus.bahayaTeks),
                              ),
                            ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: TokenJarak.j4),
                ],
                Text('Daftar Barang', style: TokenTipografi.seksi),
                const SizedBox(height: TokenJarak.j2),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      ('semua', 'Semua'),
                      ('bebas', 'Obat Bebas'),
                      ('keras', 'Obat Keras'),
                      ('lainnya', 'Lainnya'),
                    ].map((f) {
                      final dipilih = _filterGolongan == f.$1;
                      return Padding(
                        padding: const EdgeInsets.only(right: TokenJarak.j2),
                        child: ChoiceChip(
                          label: Text(f.$2),
                          selected: dipilih,
                          selectedColor: TokenLatar.terpilih,
                          onSelected: (_) =>
                              setState(() => _filterGolongan = f.$1),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: TokenJarak.j2),
                ..._hasilCari.where((b) {
                  if (_filterGolongan == 'semua') return true;
                  if (_filterGolongan == 'bebas') {
                    return b.golongan == 'bebas' ||
                        b.golongan == 'bebas_terbatas';
                  }
                  if (_filterGolongan == 'keras') {
                    return b.golongan == 'keras';
                  }
                  return b.golongan != 'bebas' &&
                      b.golongan != 'bebas_terbatas' &&
                      b.golongan != 'keras';
                }).map(
                  (b) => Padding(
                    padding: const EdgeInsets.only(bottom: TokenJarak.j2),
                    child: Material(
                      color: TokenLatar.latar,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => _tambahKeKeranjang(b),
                        child: Container(
                          constraints: const BoxConstraints(
                              minHeight: TokenUkuran.tinggiBarisDaftar),
                          padding: const EdgeInsets.all(TokenJarak.j3),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: TokenGaris.pemisah),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x0A064E3B),
                                blurRadius: 8,
                                offset: Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: b.golongan == 'keras'
                                      ? TokenStatus.bahayaLatar
                                      : TokenLatar.terpilih,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  LucideIcons.pill,
                                  size: 20,
                                  color: b.golongan == 'keras'
                                      ? TokenStatus.bahayaTeks
                                      : TokenAksi.utama,
                                ),
                              ),
                              const SizedBox(width: TokenJarak.j3),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      b.nama,
                                      style: TokenTipografi.dasar.copyWith(
                                          fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(height: 3),
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 4,
                                      crossAxisAlignment:
                                          WrapCrossAlignment.center,
                                      children: [
                                        Text(
                                          '${b.satuan} · Stok ${b.stokTotal}',
                                          style: TokenTipografi.keterangan,
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: b.golongan == 'keras'
                                                ? TokenStatus.bahayaLatar
                                                : TokenStatus.berhasilLatar,
                                            borderRadius:
                                                BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            b.golongan == 'keras'
                                                ? 'Obat Keras (K)'
                                                : b.golongan
                                                    .replaceAll('_', ' '),
                                            style: TokenTipografi.keterangan
                                                .copyWith(
                                              fontWeight: FontWeight.w600,
                                              color: b.golongan == 'keras'
                                                  ? TokenStatus.bahayaTeks
                                                  : TokenStatus.berhasilTeks,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: TokenJarak.j2),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    formatRupiah(b.hargaJual),
                                    style: TokenTipografi.angkaTabular(
                                            TokenTipografi.tabel)
                                        .copyWith(
                                      fontWeight: FontWeight.w700,
                                      color: TokenAksi.utama,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Container(
                                    width: 30,
                                    height: 30,
                                    decoration: BoxDecoration(
                                      color: TokenAksi.utama,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      LucideIcons.plus,
                                      size: 16,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(TokenJarak.j3),
            decoration: const BoxDecoration(
              color: TokenLatar.latar,
              border: Border(top: BorderSide(color: TokenGaris.pemisah)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total', style: TokenTipografi.keterangan),
                      Text(
                        formatRupiah(_totalKeranjang),
                        style:
                            TokenTipografi.angkaTabular(TokenTipografi.judul),
                      ),
                    ],
                  ),
                ),
                TombolPos(
                  label: 'Bayar',
                  penuh: false,
                  onPressed: _bisaBayar ? _bukaPanelPembayaran : null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HasilPanelBayar {
  final HasilSimpanPenjualan? penjualan;
  final bool tertunda;
  const _HasilPanelBayar({this.penjualan, this.tertunda = false});
}

class _PanelPembayaran extends ConsumerStatefulWidget {
  final int total;
  final String kunciIdempoten;
  final List<({int barangId, int jumlah})> baris;
  final bool sedangOffline;

  const _PanelPembayaran({
    required this.total,
    required this.kunciIdempoten,
    required this.baris,
    required this.sedangOffline,
  });

  @override
  ConsumerState<_PanelPembayaran> createState() => _PanelPembayaranState();
}

class _PanelPembayaranState extends ConsumerState<_PanelPembayaran> {
  String _cara = 'tunai';
  final _uangCtrl = TextEditingController();
  int _uangDiterima = 0;
  bool _memuat = false;
  String? _pesanGalat;

  InfoPembayaranNontunai? _nontunai;
  Timer? _pollingTimer;
  Timer? _countdownTimer;
  int _sisaDetik = 0;

  @override
  void dispose() {
    _uangCtrl.dispose();
    _pollingTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _setNominal(int nilai) {
    _uangCtrl.text = formatRibuan(nilai);
    setState(() => _uangDiterima = nilai);
  }

  Future<void> _simpanTunai() async {
    setState(() {
      _memuat = true;
      _pesanGalat = null;
    });
    final payload = {
      'baris': widget.baris
          .map((b) => {'barang_id': b.barangId, 'jumlah': b.jumlah})
          .toList(),
      'cara_bayar': 'tunai',
      'uang_diterima': _uangDiterima,
      'pembayaran_nontunai_id': null,
      'waktu_perangkat': DateTime.now().toIso8601String(),
    };

    try {
      final hasil = await ref.read(penjualanRepositoriProvider).simpanPenjualan(
            kunciIdempoten: widget.kunciIdempoten,
            payload: payload,
          );
      if (mounted) {
        Navigator.of(context).pop(_HasilPanelBayar(penjualan: hasil));
      }
    } on GalatApi catch (g) {
      if (g.adalahGalatJaringan) {
        await ref.read(antreanProvider.notifier).masukkan(
              jenis: 'penjualan',
              kunciIdempoten: widget.kunciIdempoten,
              payload: payload,
            );
        if (mounted) {
          Navigator.of(context).pop(const _HasilPanelBayar(tertunda: true));
        }
      } else {
        if (mounted) setState(() => _pesanGalat = g.pesan);
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _mulaiNontunai(String cara) async {
    if (widget.sedangOffline) {
      setState(() => _pesanGalat =
          'Pembayaran QRIS/transfer membutuhkan koneksi internet.');
      return;
    }
    setState(() {
      _memuat = true;
      _pesanGalat = null;
    });
    try {
      final info = await ref
          .read(penjualanRepositoriProvider)
          .buatPembayaranNontunai(cara, widget.total);
      if (!mounted) return;
      setState(() {
        _nontunai = info;
        _sisaDetik = info.kedaluwarsaPada
            .difference(DateTime.now())
            .inSeconds
            .clamp(0, 3600);
      });
      _mulaiPolling(info.id);
    } on GalatApi catch (g) {
      if (mounted) {
        setState(() => _pesanGalat = g.adalahGalatJaringan
            ? 'Pembayaran QRIS/transfer membutuhkan koneksi internet.'
            : g.pesan);
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  void _mulaiPolling(String pembayaranId) {
    _pollingTimer?.cancel();
    _countdownTimer?.cancel();

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_sisaDetik > 0) _sisaDetik--;
      });
    });

    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      try {
        final cek = await ref
            .read(penjualanRepositoriProvider)
            .cekPembayaranNontunai(pembayaranId);
        if (!mounted) return;
        setState(() => _nontunai = cek);
        if (cek.status == 'dibayar') {
          _pollingTimer?.cancel();
          _countdownTimer?.cancel();
          await _simpanNontunai(cek.id);
        } else if (cek.status == 'kedaluwarsa') {
          _pollingTimer?.cancel();
          _countdownTimer?.cancel();
        }
      } catch (_) {}
    });
  }

  Future<void> _simpanNontunai(String pembayaranId) async {
    final payload = {
      'baris': widget.baris
          .map((b) => {'barang_id': b.barangId, 'jumlah': b.jumlah})
          .toList(),
      'cara_bayar': _cara,
      'uang_diterima': null,
      'pembayaran_nontunai_id': pembayaranId,
      'waktu_perangkat': DateTime.now().toIso8601String(),
    };
    final hasil = await ref.read(penjualanRepositoriProvider).simpanPenjualan(
          kunciIdempoten: widget.kunciIdempoten,
          payload: payload,
        );
    if (mounted) Navigator.of(context).pop(_HasilPanelBayar(penjualan: hasil));
  }

  @override
  Widget build(BuildContext context) {
    final kembalian = _uangDiterima - widget.total;
    final kurang = _uangDiterima < widget.total;

    return Padding(
      padding: EdgeInsets.only(
        left: TokenJarak.j4,
        right: TokenJarak.j4,
        top: TokenJarak.j4,
        bottom: MediaQuery.of(context).viewInsets.bottom + TokenJarak.j4,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Pembayaran · ${formatRupiah(widget.total)}',
                style: TokenTipografi.seksi),
            const SizedBox(height: TokenJarak.j3),
            if (_pesanGalat != null) ...[
              PesanPos(jenis: JenisPesan.bahaya, teks: _pesanGalat!),
              const SizedBox(height: TokenJarak.j3),
            ],
            Wrap(
              spacing: TokenJarak.j2,
              runSpacing: TokenJarak.j2,
              children: ['tunai', 'qris', 'debit', 'transfer', 'ewallet'].map((c) {
                final terpilih = _cara == c;
                final label = switch (c) {
                  'tunai' => 'Tunai',
                  'qris' => 'QRIS',
                  'debit' => 'Debit',
                  'transfer' => 'Transfer',
                  'ewallet' => 'E-Wallet',
                  _ => c,
                };
                return TombolPos(
                  label: label,
                  penuh: false,
                  jenis: terpilih ? JenisTombol.utama : JenisTombol.sekunder,
                  onPressed: () {
                    _pollingTimer?.cancel();
                    _countdownTimer?.cancel();
                    setState(() {
                      _cara = c;
                      _nontunai = null;
                      _pesanGalat = null;
                    });
                    if (c != 'tunai') {
                      _mulaiNontunai(c);
                    }
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: TokenJarak.j4),
            if (_cara == 'tunai') ...[
              IsianRupiahPos(
                controller: _uangCtrl,
                label: 'Uang diterima',
                onChangedNominal: (v) => setState(() => _uangDiterima = v),
              ),
              const SizedBox(height: TokenJarak.j2),
              Wrap(
                spacing: TokenJarak.j2,
                children: [
                  ActionChip(
                      label: const Text('Uang pas'),
                      onPressed: () => _setNominal(widget.total)),
                  ActionChip(
                      label: const Text('Rp50.000'),
                      onPressed: () => _setNominal(50000)),
                  ActionChip(
                      label: const Text('Rp100.000'),
                      onPressed: () => _setNominal(100000)),
                ],
              ),
              const SizedBox(height: TokenJarak.j3),
              Text(
                kurang
                    ? 'Kurang ${formatRupiah(widget.total - _uangDiterima)}'
                    : 'Kembalian: ${formatRupiah(kembalian)}',
                style:
                    TokenTipografi.angkaTabular(TokenTipografi.seksi).copyWith(
                  color: kurang ? TokenStatus.bahayaTeks : TokenTeks.utama,
                ),
              ),
              const SizedBox(height: TokenJarak.j4),
              TombolPos(
                label: 'Simpan Penjualan',
                memuat: _memuat,
                onPressed: kurang ? null : _simpanTunai,
              ),
            ] else if (_nontunai != null) ...[
              Center(
                child: Column(
                  children: [
                    QrImageView(data: _nontunai!.kodeBayar, size: 180),
                    const SizedBox(height: TokenJarak.j2),
                    Text(
                      '${(_sisaDetik ~/ 60).toString().padLeft(2, '0')}:${(_sisaDetik % 60).toString().padLeft(2, '0')}',
                      style: TokenTipografi.angkaTabular(TokenTipografi.seksi),
                    ),
                    const SizedBox(height: TokenJarak.j2),
                    LencanaStatusPos(
                      status: _nontunai!.status == 'kedaluwarsa'
                          ? 'kedaluwarsa'
                          : 'menunggu',
                    ),
                    if (_nontunai!.status == 'kedaluwarsa') ...[
                      const SizedBox(height: TokenJarak.j3),
                      TombolPos(
                        label: 'Buat Ulang Kode',
                        onPressed: () => _mulaiNontunai(_cara),
                      ),
                    ],
                    if (modeDev && _nontunai!.status == 'menunggu') ...[
                      const SizedBox(height: TokenJarak.j3),
                      TombolPos(
                        label: 'Simulasi Bayar',
                        jenis: JenisTombol.sekunder,
                        onPressed: () async {
                          await ref
                              .read(penjualanRepositoriProvider)
                              .simulasiBayar(_nontunai!.id);
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class LayarRiwayatPenjualan extends ConsumerStatefulWidget {
  const LayarRiwayatPenjualan({super.key});

  @override
  ConsumerState<LayarRiwayatPenjualan> createState() =>
      _LayarRiwayatPenjualanState();
}

class _LayarRiwayatPenjualanState extends ConsumerState<LayarRiwayatPenjualan> {
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
      final res = await ref.read(penjualanRepositoriProvider).daftarRiwayat();
      if (mounted) setState(() => _daftar = res);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final printerMac = ref.watch(sesiProvider).printerMac;

    return Scaffold(
      appBar: AppBar(title: const Text('Riwayat Penjualan')),
      body: RefreshIndicator(
        onRefresh: _muat,
        child: _memuat
            ? const Center(child: CircularProgressIndicator())
            : _daftar.isEmpty
                ? const Center(child: Text('Belum ada penjualan hari ini.'))
                : ListView.separated(
                    padding: const EdgeInsets.all(TokenJarak.j4),
                    itemCount: _daftar.length,
                    separatorBuilder: (_, __) => const Divider(),
                    itemBuilder: (ctx, i) {
                      final r = _daftar[i];
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(r['nomor'] as String,
                            style: TokenTipografi.dasar),
                        subtitle: Text(
                          '${formatJam(r['waktu'])} · ${(r['cara_bayar'] as String).toUpperCase()}',
                          style: TokenTipografi.keterangan,
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              formatRupiah((r['total'] as num).toInt()),
                              style: TokenTipografi.angkaTabular(
                                      TokenTipografi.dasar)
                                  .copyWith(fontWeight: FontWeight.w600),
                            ),
                            if (printerMac != null)
                              IconButton(
                                icon: const Icon(LucideIcons.printer),
                                onPressed: () async {
                                  final struk = await ref
                                      .read(penjualanRepositoriProvider)
                                      .ambilStruk((r['id'] as num).toInt());
                                  await ref
                                      .read(pencetakProvider)
                                      .cetakStruk(struk, printerMac);
                                },
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
