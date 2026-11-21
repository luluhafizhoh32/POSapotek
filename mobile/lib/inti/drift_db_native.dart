import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'drift_db.dart';

class _BasisDataDrift extends GeneratedDatabase implements BasisDataLokal {
  _BasisDataDrift(super.executor);

  @override
  int get schemaVersion => 1;

  @override
  Iterable<TableInfo<Table, dynamic>> get allTables => const [];

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await customStatement('''
            CREATE TABLE IF NOT EXISTS antrean (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              pengguna_id INTEGER NOT NULL,
              jenis TEXT NOT NULL,
              kunci_idempoten TEXT NOT NULL UNIQUE,
              payload_json TEXT NOT NULL,
              lampiran_path TEXT,
              lampiran_jenis TEXT,
              lampiran_id_server TEXT,
              status TEXT NOT NULL,
              kode_galat TEXT,
              pesan_galat TEXT,
              percobaan INTEGER NOT NULL DEFAULT 0,
              dibuat_pada TEXT NOT NULL
            )
          ''');
          await customStatement('''
            CREATE TABLE IF NOT EXISTS barang_cache (
              id INTEGER PRIMARY KEY,
              kode TEXT NOT NULL,
              barcode TEXT,
              nama TEXT NOT NULL,
              kategori TEXT NOT NULL,
              golongan TEXT NOT NULL,
              satuan TEXT NOT NULL,
              harga_jual INTEGER NOT NULL,
              stok_minimum INTEGER NOT NULL,
              stok_total INTEGER NOT NULL,
              diperbarui_pada TEXT NOT NULL
            )
          ''');
        },
      );

  @override
  Future<int> tambahAntrean({
    required int penggunaId,
    required String jenis,
    required String kunciIdempoten,
    required String payloadJson,
    String? lampiranPath,
    String? lampiranJenis,
  }) {
    return customInsert(
      '''
      INSERT INTO antrean
        (pengguna_id, jenis, kunci_idempoten, payload_json, lampiran_path, lampiran_jenis, status, percobaan, dibuat_pada)
      VALUES (?, ?, ?, ?, ?, ?, 'tertunda', 0, ?)
      ''',
      variables: [
        Variable.withInt(penggunaId),
        Variable.withString(jenis),
        Variable.withString(kunciIdempoten),
        Variable.withString(payloadJson),
        lampiranPath == null ? const Variable<String>(null) : Variable.withString(lampiranPath),
        lampiranJenis == null ? const Variable<String>(null) : Variable.withString(lampiranJenis),
        Variable.withString(DateTime.now().toIso8601String()),
      ],
    );
  }

  @override
  Future<List<ItemAntrean>> daftarAntrean(int penggunaId) async {
    final rows = await customSelect(
      'SELECT * FROM antrean WHERE pengguna_id = ? ORDER BY dibuat_pada ASC, id ASC',
      variables: [Variable.withInt(penggunaId)],
    ).get();
    return rows
        .map(
          (row) => ItemAntrean(
            id: row.read<int>('id'),
            penggunaId: row.read<int>('pengguna_id'),
            jenis: row.read<String>('jenis'),
            kunciIdempoten: row.read<String>('kunci_idempoten'),
            payloadJson: row.read<String>('payload_json'),
            lampiranPath: row.readNullable<String>('lampiran_path'),
            lampiranJenis: row.readNullable<String>('lampiran_jenis'),
            lampiranIdServer: row.readNullable<String>('lampiran_id_server'),
            status: row.read<String>('status'),
            kodeGalat: row.readNullable<String>('kode_galat'),
            pesanGalat: row.readNullable<String>('pesan_galat'),
            percobaan: row.read<int>('percobaan'),
            dibuatPada: row.read<String>('dibuat_pada'),
          ),
        )
        .toList();
  }

  @override
  Future<int> hitungAntreanAktif(int penggunaId) async {
    final row = await customSelect(
      "SELECT COUNT(*) AS cnt FROM antrean WHERE pengguna_id = ? AND status IN ('tertunda', 'gagal')",
      variables: [Variable.withInt(penggunaId)],
    ).getSingle();
    return row.read<int>('cnt');
  }

  @override
  Future<void> tandaiStatusAntrean(
    int id, {
    required String status,
    String? kodeGalat,
    String? pesanGalat,
    int? percobaan,
    String? lampiranIdServer,
  }) {
    return customUpdate(
      '''
      UPDATE antrean
      SET status = ?,
          kode_galat = ?,
          pesan_galat = ?,
          percobaan = COALESCE(?, percobaan),
          lampiran_id_server = COALESCE(?, lampiran_id_server)
      WHERE id = ?
      ''',
      variables: [
        Variable.withString(status),
        kodeGalat == null ? const Variable<String>(null) : Variable.withString(kodeGalat),
        pesanGalat == null ? const Variable<String>(null) : Variable.withString(pesanGalat),
        percobaan == null ? const Variable<int>(null) : Variable.withInt(percobaan),
        lampiranIdServer == null
            ? const Variable<String>(null)
            : Variable.withString(lampiranIdServer),
        Variable.withInt(id),
      ],
    );
  }

  @override
  Future<void> hapusAntrean(int id) {
    return customUpdate('DELETE FROM antrean WHERE id = ?', variables: [Variable.withInt(id)]);
  }

  @override
  Future<void> hapusSemuaAntreanPengguna(int penggunaId) {
    return customUpdate(
      'DELETE FROM antrean WHERE pengguna_id = ?',
      variables: [Variable.withInt(penggunaId)],
    );
  }

  @override
  Future<void> simpanCacheBarang(List<Map<String, dynamic>> items) async {
    await transaction(() async {
      await customUpdate('DELETE FROM barang_cache');
      final now = DateTime.now().toIso8601String();
      for (final b in items) {
        await customInsert(
          '''
          INSERT INTO barang_cache
            (id, kode, barcode, nama, kategori, golongan, satuan, harga_jual, stok_minimum, stok_total, diperbarui_pada)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ''',
          variables: [
            Variable.withInt((b['id'] as num).toInt()),
            Variable.withString(b['kode'] as String),
            b['barcode'] == null
                ? const Variable<String>(null)
                : Variable.withString(b['barcode'] as String),
            Variable.withString(b['nama'] as String),
            Variable.withString(b['kategori'] as String),
            Variable.withString(b['golongan'] as String),
            Variable.withString(b['satuan'] as String),
            Variable.withInt((b['harga_jual'] as num).toInt()),
            Variable.withInt((b['stok_minimum'] as num).toInt()),
            Variable.withInt((b['stok_total'] as num).toInt()),
            Variable.withString(now),
          ],
        );
      }
    });
  }

  @override
  Future<List<BarangCache>> cariCacheBarang(String q) async {
    final like = '%${q.trim().toLowerCase()}%';
    final rows = await customSelect(
      '''
      SELECT * FROM barang_cache
      WHERE lower(nama) LIKE ? OR lower(kode) LIKE ? OR lower(COALESCE(barcode, '')) LIKE ?
      ORDER BY nama ASC
      LIMIT 50
      ''',
      variables: [Variable.withString(like), Variable.withString(like), Variable.withString(like)],
    ).get();
    return rows
        .map(
          (row) => BarangCache(
            id: row.read<int>('id'),
            kode: row.read<String>('kode'),
            barcode: row.readNullable<String>('barcode'),
            nama: row.read<String>('nama'),
            kategori: row.read<String>('kategori'),
            golongan: row.read<String>('golongan'),
            satuan: row.read<String>('satuan'),
            hargaJual: row.read<int>('harga_jual'),
            stokMinimum: row.read<int>('stok_minimum'),
            stokTotal: row.read<int>('stok_total'),
          ),
        )
        .toList();
  }
}

BasisDataLokal buatBasisDataBerkas() {
  return _BasisDataDrift(
    LazyDatabase(() async {
      final dir = await getApplicationDocumentsDirectory();
      final file = File(p.join(dir.path, 'pos_apotek.sqlite'));
      return NativeDatabase.createInBackground(file);
    }),
  );
}

BasisDataLokal buatBasisDataMemori() => _BasisDataDrift(NativeDatabase.memory());
