import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'core/constants/app_colors.dart';
import 'core/utils/currency_formatter.dart';
import 'core/utils/date_formatter.dart';
import 'core/services/api_service.dart';

void main() {
  runApp(const PharmaPosApp());
}

class PharmaPosApp extends StatelessWidget {
  const PharmaPosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PharmaPOS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          primary: AppColors.primary,
          surface: AppColors.card,
        ),
        scaffoldBackgroundColor: AppColors.background,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 1,
          iconTheme: IconThemeData(color: AppColors.textPrimary),
          titleTextStyle: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      home: const MainShellScreen(),
    );
  }
}

// ==============================================================================
// MAIN SHELL SCREEN (ROLE-BASED WORKSPACE & LIVE API INTEGRATION)
// ==============================================================================
class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  String _selectedRole = 'KASIR';
  int _currentIndex = 0;
  bool _isBackendConnected = false;
  bool _isLoading = false;
  String _statusMessage = 'Menghubungkan ke API...';

  final List<String> _roles = ['KASIR', 'APOTEKER', 'GUDANG', 'OWNER', 'MANAGER'];

  // Role Credential Map for Live JWT Authentication
  final Map<String, Map<String, String>> _roleCredentials = {
    'KASIR': {
      'email': 'kasir@pharmapos.local',
      'password': 'Demo12345',
      'label': 'Sari Puspita (Kasir)',
    },
    'APOTEKER': {
      'email': 'apoteker@pharmapos.local',
      'password': 'Demo12345',
      'label': 'apt. Farhan Alatas, S.Farm (Apoteker)',
    },
    'GUDANG': {
      'email': 'gudang@pharmapos.local',
      'password': 'Demo12345',
      'label': 'Eko Wahyudi (Staff Gudang)',
    },
    'OWNER': {
      'email': 'owner@pharmapos.local',
      'password': 'Demo12345',
      'label': 'Bapak Hartono (Owner)',
    },
    'MANAGER': {
      'email': 'manager@pharmapos.local',
      'password': 'Demo12345',
      'label': 'Ibu Ratna (Manager)',
    },
  };

  // Live Server Data States
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _categories = [];
  final List<Map<String, dynamic>> _cart = [];
  List<Map<String, dynamic>> _salesHistory = [];
  List<Map<String, dynamic>> _prescriptions = [];
  List<Map<String, dynamic>> _batches = [];
  List<Map<String, dynamic>> _purchases = [];
  Map<String, dynamic> _inventorySummary = {};
  Map<String, dynamic> _dashboardData = {};
  Map<String, dynamic> _aiForecastData = {};
  Map<String, dynamic> _rfmSegmentationData = {};

  // Filters & Search
  String _selectedCategory = 'Semua';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _switchRoleAndAuthenticate(_selectedRole);
  }

  // Authenticate and load live role data
  Future<void> _switchRoleAndAuthenticate(String role) async {
    setState(() {
      _isLoading = true;
      _selectedRole = role;
      _statusMessage = 'Mengautentikasi role $role...';
    });

    final creds = _roleCredentials[role] ?? _roleCredentials['KASIR']!;
    final loginRes = await ApiService.login(creds['email']!, creds['password']!);

    if (loginRes['success'] == true) {
      _isBackendConnected = true;
      _statusMessage = 'Terhubung ke Backend :3001';
      await _loadRoleData(role);
    } else {
      _isBackendConnected = false;
      _statusMessage = 'Gagal terhubung: ${loginRes['message']}';
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  // Load live data from backend per role
  Future<void> _loadRoleData(String role) async {
    try {
      if (role == 'KASIR') {
        final catRes = await ApiService.fetchCategories();
        if (catRes['success'] == true && catRes['data'] is List) {
          _categories = List<Map<String, dynamic>>.from(catRes['data']);
        }

        final prodRes = await ApiService.fetchProducts();
        if (prodRes['success'] == true && prodRes['data'] is List) {
          _products = List<Map<String, dynamic>>.from(prodRes['data']);
        }

        final salesRes = await ApiService.fetchSalesHistory();
        if (salesRes['success'] == true && salesRes['data'] is List) {
          _salesHistory = List<Map<String, dynamic>>.from(salesRes['data']);
        }
      } else if (role == 'APOTEKER') {
        final rxRes = await ApiService.fetchPrescriptions();
        if (rxRes['success'] == true && rxRes['data'] is List) {
          _prescriptions = List<Map<String, dynamic>>.from(rxRes['data']);
        }

        final prodRes = await ApiService.fetchProducts();
        if (prodRes['success'] == true && prodRes['data'] is List) {
          _products = List<Map<String, dynamic>>.from(prodRes['data']);
        }
      } else if (role == 'GUDANG') {
        final invRes = await ApiService.fetchInventorySummary();
        if (invRes['success'] == true && invRes['data'] is Map) {
          _inventorySummary = Map<String, dynamic>.from(invRes['data']);
        }

        final batchRes = await ApiService.fetchBatches();
        if (batchRes['success'] == true && batchRes['data'] is List) {
          _batches = List<Map<String, dynamic>>.from(batchRes['data']);
        }

        final poRes = await ApiService.fetchPurchases();
        if (poRes['success'] == true && poRes['data'] is List) {
          _purchases = List<Map<String, dynamic>>.from(poRes['data']);
        }
      } else {
        // OWNER / MANAGER
        final dashRes = await ApiService.fetchDashboard();
        if (dashRes['success'] == true && dashRes['data'] is Map) {
          _dashboardData = Map<String, dynamic>.from(dashRes['data']);
        }

        final forecastRes = await ApiService.fetchAiForecast();
        if (forecastRes['success'] == true && forecastRes['data'] is Map) {
          _aiForecastData = Map<String, dynamic>.from(forecastRes['data']);
        }

        final rfmRes = await ApiService.fetchRfmSegmentation();
        if (rfmRes['success'] == true && rfmRes['data'] is Map) {
          _rfmSegmentationData = Map<String, dynamic>.from(rfmRes['data']);
        }
      }
    } catch (e) {
      debugPrint('Error loading role data: $e');
    }
  }

  // Refresh current view
  Future<void> _refreshCurrentData() async {
    await _loadRoleData(_selectedRole);
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final activeUserName = ApiService.currentUser?['name'] ??
        _roleCredentials[_selectedRole]?['label'] ??
        _selectedRole;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.local_pharmacy, color: AppColors.primary, size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('PharmaPOS', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text(
                    'Apotek Sehat Sentosa • $activeUserName',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.normal),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Refresh Icon Button
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            tooltip: 'Segarkan Data Live',
            onPressed: _refreshCurrentData,
          ),

          // Live Backend Status Indicator
          Container(
            margin: const EdgeInsets.only(right: 6),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: _isBackendConnected ? AppColors.primarySurface : Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _isBackendConnected ? AppColors.primary : Colors.red.shade300,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _isBackendConnected ? Icons.cloud_done : Icons.cloud_off,
                  size: 14,
                  color: _isBackendConnected ? AppColors.primary : Colors.red.shade700,
                ),
                const SizedBox(width: 4),
                Text(
                  _isBackendConnected ? 'LIVE :3001' : 'OFFLINE',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: _isBackendConnected ? AppColors.primaryDark : Colors.red.shade800,
                  ),
                ),
              ],
            ),
          ),

          // Role Switcher Dropdown (Switch RBAC User)
          PopupMenuButton<String>(
            tooltip: 'Ganti Peran Aktif',
            initialValue: _selectedRole,
            onSelected: (role) {
              setState(() {
                _currentIndex = 0;
              });
              _switchRoleAndAuthenticate(role);
            },
            child: Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.badge_outlined, size: 15, color: AppColors.primary),
                  const SizedBox(width: 4),
                  Text(
                    _selectedRole,
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Icon(Icons.arrow_drop_down, size: 16, color: AppColors.primary),
                ],
              ),
            ),
            itemBuilder: (context) => _roles
                .map((r) => PopupMenuItem(
                      value: r,
                      child: Row(
                        children: [
                          Icon(
                            r == _selectedRole ? Icons.check_circle : Icons.radio_button_unchecked,
                            size: 16,
                            color: r == _selectedRole ? AppColors.primary : AppColors.textMuted,
                          ),
                          const SizedBox(width: 8),
                          Text('Role: $r'),
                        ],
                      ),
                    ))
                .toList(),
          ),
        ],
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text(_statusMessage, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _refreshCurrentData,
              child: _buildCurrentRoleScreen(),
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: _buildNavDestinations(),
      ),
    );
  }

  List<NavigationDestination> _buildNavDestinations() {
    switch (_selectedRole) {
      case 'KASIR':
        return [
          const NavigationDestination(icon: Icon(Icons.point_of_sale), label: 'Kasir POS'),
          NavigationDestination(
            icon: Badge(
              label: Text('${_cart.length}'),
              isLabelVisible: _cart.isNotEmpty,
              child: const Icon(Icons.shopping_cart),
            ),
            label: 'Keranjang',
          ),
          const NavigationDestination(icon: Icon(Icons.receipt_long), label: 'Riwayat Struk'),
        ];
      case 'APOTEKER':
        return const [
          NavigationDestination(icon: Icon(Icons.description), label: 'Resep Dokter'),
          NavigationDestination(icon: Icon(Icons.warning_amber), label: 'Interaksi AI'),
          NavigationDestination(icon: Icon(Icons.medication), label: 'Katalog Obat'),
        ];
      case 'GUDANG':
        return const [
          NavigationDestination(icon: Icon(Icons.inventory_2), label: 'Stok Obat'),
          NavigationDestination(icon: Icon(Icons.access_time), label: 'Kedaluwarsa (FEFO)'),
          NavigationDestination(icon: Icon(Icons.local_shipping), label: 'Penerimaan PO'),
        ];
      case 'OWNER':
      case 'MANAGER':
      default:
        return const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.auto_graph), label: 'Prediksi AI'),
          NavigationDestination(icon: Icon(Icons.people_alt), label: 'Segmentasi RFM'),
        ];
    }
  }

  Widget _buildCurrentRoleScreen() {
    if (_selectedRole == 'KASIR') {
      if (_currentIndex == 0) return _buildKasirCatalogView();
      if (_currentIndex == 1) return _buildCartView();
      return _buildSalesHistoryView();
    } else if (_selectedRole == 'APOTEKER') {
      if (_currentIndex == 0) return _buildPrescriptionView();
      if (_currentIndex == 1) return _buildDrugInteractionAiView();
      return _buildKasirCatalogView();
    } else if (_selectedRole == 'GUDANG') {
      if (_currentIndex == 0) return _buildWarehouseStockView();
      if (_currentIndex == 1) return _buildFefoExpiryView();
      return _buildPoReceivingView();
    } else {
      // OWNER / MANAGER
      if (_currentIndex == 0) return _buildOwnerDashboardView();
      if (_currentIndex == 1) return _buildDemandForecastingAiView();
      return _buildRfmCustomerSegmentationView();
    }
  }

  // ==============================================================================
  // 1. KASIR POS SCREEN (LIVE PRODUCTS & CATEGORIES FROM DATABASE)
  // ==============================================================================
  Widget _buildKasirCatalogView() {
    // Dynamic categories from database
    final categoryNames = ['Semua'];
    for (final c in _categories) {
      final name = c['name']?.toString();
      if (name != null && !categoryNames.contains(name)) {
        categoryNames.add(name);
      }
    }

    final filtered = _products.where((p) {
      final catObj = p['category'];
      final catName = catObj is Map ? catObj['name']?.toString() : catObj?.toString();
      final matchCat = _selectedCategory == 'Semua' || catName == _selectedCategory;

      final name = (p['name'] ?? '').toString().toLowerCase();
      final barcode = (p['barcode'] ?? '').toString();
      final sku = (p['sku'] ?? '').toString();
      final query = _searchQuery.toLowerCase();

      final matchQuery = name.contains(query) || barcode.contains(query) || sku.contains(query);
      return matchCat && matchQuery;
    }).toList();

    return Column(
      children: [
        // Search & Barcode Simulator Bar
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Cari nama obat, indikasi, atau scan barcode...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                  onChanged: (val) => setState(() => _searchQuery = val),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                style: IconButton.styleFrom(backgroundColor: AppColors.primary),
                tooltip: 'Scan Barcode Obat',
                icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
                onPressed: _showBarcodeScanModal,
              ),
            ],
          ),
        ),

        // Category Filter Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: categoryNames.map((cat) {
              final isSelected = _selectedCategory == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(cat, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : AppColors.textPrimary)),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  onSelected: (val) => setState(() => _selectedCategory = cat),
                ),
              );
            }).toList(),
          ),
        ),

        // Live Products List
        Expanded(
          child: filtered.isEmpty
              ? _buildEmptyState('Obat Tidak Ditemukan', 'Coba kata kunci pencarian atau kategori lain.')
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final p = filtered[index];
                    final stock = p['totalStock'] ?? 0;
                    final minStock = p['minStock'] ?? 10;
                    final isLowStock = stock <= minStock;
                    final isPrescription = p['isPrescriptionRequired'] == true;
                    final catObj = p['category'];
                    final catName = catObj is Map ? catObj['name'] : catObj ?? 'Umum';

                    return Card(
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppColors.border),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: AppColors.primarySurface,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.medication, color: AppColors.primary, size: 28),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          p['name'] ?? '',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                      ),
                                      if (isPrescription)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: Colors.red.shade50,
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(color: Colors.red.shade200),
                                          ),
                                          child: Text('Obat Keras (K)', style: TextStyle(color: Colors.red.shade700, fontSize: 10, fontWeight: FontWeight.bold)),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '$catName • ${p['dosageForm'] ?? 'Sediaan'}',
                                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        CurrencyFormatter.format(p['sellPrice']),
                                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: stock == 0
                                              ? Colors.red.shade50
                                              : isLowStock
                                                  ? Colors.orange.shade50
                                                  : AppColors.primarySurface,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          'Stok: $stock ${p['unit'] ?? ''}',
                                          style: TextStyle(
                                            color: stock == 0
                                                ? Colors.red.shade800
                                                : isLowStock
                                                    ? Colors.orange.shade800
                                                    : AppColors.primaryDark,
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton.filledTonal(
                              icon: const Icon(Icons.add_shopping_cart, size: 20),
                              onPressed: stock <= 0
                                  ? null
                                  : () => _addToCart(p),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  void _addToCart(Map<String, dynamic> product) {
    setState(() {
      final existingIndex = _cart.indexWhere((item) => item['id'] == product['id']);
      if (existingIndex >= 0) {
        _cart[existingIndex]['qty'] += 1;
      } else {
        _cart.add({
          ...product,
          'qty': 1,
        });
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product['name']} ditambahkan ke keranjang kasir'),
        duration: const Duration(milliseconds: 900),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showBarcodeScanModal() {
    final barcodeController = TextEditingController(text: '899123456701');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.barcode_reader, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Scan Barcode Obat', style: TextStyle(fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Masukkan kode barcode obat (Standar GS1 Indonesia 899xxxx):',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: barcodeController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.qr_code),
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              children: ['899123456701', '899123456702', '899123456703'].map((code) {
                return ActionChip(
                  label: Text(code, style: const TextStyle(fontSize: 10)),
                  onPressed: () => barcodeController.text = code,
                );
              }).toList(),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              Navigator.pop(ctx);
              final code = barcodeController.text.trim();
              final found = _products.firstWhere(
                (p) => (p['barcode'] ?? '') == code || (p['sku'] ?? '') == code,
                orElse: () => {},
              );
              if (found.isNotEmpty) {
                _addToCart(found);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Obat dengan barcode $code tidak ditemukan di basis data')),
                );
              }
            },
            child: const Text('Scan & Tambah', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // ==============================================================================
  // 2. KERANJANG KASIR & REAL CHECKOUT (LIVE POST /sales/checkout FEFO)
  // ==============================================================================
  Widget _buildCartView() {
    if (_cart.isEmpty) {
      return _buildEmptyState('Keranjang Belanja Kosong', 'Pilih obat dari katalog POS untuk memulai transaksi.');
    }

    int subtotal = 0;
    for (final item in _cart) {
      final price = (item['sellPrice'] as num?)?.toInt() ?? 0;
      final qty = (item['qty'] as num?)?.toInt() ?? 1;
      subtotal += price * qty;
    }

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _cart.length,
            itemBuilder: (context, index) {
              final item = _cart[index];
              final price = (item['sellPrice'] as num?)?.toInt() ?? 0;
              final qty = (item['qty'] as num?)?.toInt() ?? 1;

              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text(
                              '${CurrencyFormatter.format(price)} / ${item['unit'] ?? 'unit'}',
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Subtotal: ${CurrencyFormatter.format(price * qty)}',
                              style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          IconButton.outlined(
                            icon: const Icon(Icons.remove, size: 16),
                            onPressed: () {
                              setState(() {
                                if (qty > 1) {
                                  item['qty'] -= 1;
                                } else {
                                  _cart.removeAt(index);
                                }
                              });
                            },
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Text('$qty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                          IconButton.outlined(
                            icon: const Icon(Icons.add, size: 16),
                            onPressed: () {
                              final currentStock = (item['totalStock'] as num?)?.toInt() ?? 999;
                              if (qty < currentStock) {
                                setState(() => item['qty'] += 1);
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Kuantitas melebihi batas stok fisik tersedia')),
                                );
                              }
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Cart Summary & Checkout Bar
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Belanja:', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
                    Text(
                      CurrencyFormatter.format(subtotal),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.payment, color: Colors.white),
                    label: const Text('Lanjut Pembayaran (Checkout Live)', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                    onPressed: () => _showCheckoutSheet(subtotal),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showCheckoutSheet(int totalAmount) {
    String selectedPayment = 'TUNAI';
    int cashGiven = totalAmount;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) {
          final change = cashGiven - totalAmount;

          return Padding(
            padding: EdgeInsets.only(
              top: 20,
              left: 20,
              right: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Metode Pembayaran Live', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                  ],
                ),
                const Divider(),
                const SizedBox(height: 10),

                // Method Pills
                Row(
                  children: ['TUNAI', 'QRIS', 'DEBIT', 'TRANSFER'].map((method) {
                    final isSel = selectedPayment == method;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: ChoiceChip(
                          label: Center(child: Text(method, style: const TextStyle(fontSize: 11))),
                          selected: isSel,
                          selectedColor: AppColors.primary,
                          labelStyle: TextStyle(
                            color: isSel ? Colors.white : AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                          onSelected: (val) => setSheetState(() => selectedPayment = method),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                if (selectedPayment == 'TUNAI') ...[
                  const Text('Uang Diterima Kasir:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    children: [totalAmount, 50000, 100000, 200000].map((amt) {
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: OutlinedButton(
                            onPressed: () => setSheetState(() => cashGiven = amt),
                            child: Text(amt == totalAmount ? 'Pas' : CurrencyFormatter.format(amt), style: const TextStyle(fontSize: 10)),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Kembalian:'),
                      Text(
                        change >= 0 ? CurrencyFormatter.format(change) : 'Uang Kurang!',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: change >= 0 ? AppColors.primary : Colors.red,
                        ),
                      ),
                    ],
                  ),
                ] else if (selectedPayment == 'QRIS') ...[
                  Center(
                    child: Column(
                      children: [
                        QrImageView(
                          data: '00020101021226670014ID.LINKAJA.WWW01189360099900000000010215$totalAmount',
                          version: QrVersions.auto,
                          size: 140.0,
                        ),
                        const SizedBox(height: 6),
                        const Text('Scan QRIS Dinamis (GoPay / OVO / BCA / ShopeePay)', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ] else ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primarySurface,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.credit_card, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Metode: $selectedPayment • Gesek/Tap pada mesin EDC Kasir',
                            style: const TextStyle(fontSize: 12, color: AppColors.primaryDark),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: (selectedPayment == 'TUNAI' && change < 0)
                        ? null
                        : () async {
                            Navigator.pop(ctx);
                            await _processLiveSale(totalAmount, selectedPayment, cashGiven, change);
                          },
                    child: const Text('Konfirmasi & Catat Transaksi Live', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // Real API Checkout to Backend
  Future<void> _processLiveSale(int total, String method, int cash, int change) async {
    setState(() => _isLoading = true);

    final itemsPayload = _cart.map((item) {
      return {
        'productId': item['id'],
        'quantity': (item['qty'] as num?)?.toInt() ?? 1,
        'unitPrice': (item['sellPrice'] as num?)?.toInt() ?? 0,
      };
    }).toList();

    final body = {
      'items': itemsPayload,
      'paymentMethod': method,
      'cashGiven': method == 'TUNAI' ? cash : total,
      'amountPaid': total,
    };

    final res = await ApiService.checkoutSale(body);
    setState(() => _isLoading = false);

    if (res['success'] == true && res['data'] != null) {
      final saleData = res['data'];
      final invoiceNo = saleData['invoiceNumber'] ?? 'INV-LIVE';

      if (!mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: AppColors.primary),
              SizedBox(width: 8),
              Text('Transaksi Berhasil Tersimpan', style: TextStyle(fontSize: 16)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Center(
                child: Text(
                  'APOTEK SEHAT SENTOSA\nJl. Kesehatan Raya No. 45, Jakarta Selatan',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
                ),
              ),
              const Divider(height: 20),
              Text('No Faktur: $invoiceNo', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary)),
              Text('Metode: $method • Status: PAID (MySQL Live)', style: const TextStyle(fontSize: 11)),
              const SizedBox(height: 8),
              Text('Total Belanja: ${CurrencyFormatter.format(total)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              if (method == 'TUNAI') Text('Kembalian: ${CurrencyFormatter.format(change >= 0 ? change : 0)}', style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppColors.primarySurface, borderRadius: BorderRadius.circular(6)),
                child: const Text('✓ Pengurangan stok FEFO otomatis dicatat ke tabel inventory_movements di database MySQL.', style: TextStyle(fontSize: 10, color: AppColors.primaryDark)),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                setState(() => _cart.clear());
                _loadRoleData('KASIR'); // refresh live products & sales
              },
              child: const Text('Selesai & Struk Baru'),
            ),
          ],
        ),
      );
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memproses transaksi: ${res['message']}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // Riwayat Struk Penjualan Live
  Widget _buildSalesHistoryView() {
    if (_salesHistory.isEmpty) {
      return _buildEmptyState('Belum Ada Transaksi', 'Transaksi yang dilakukan di kasir POS akan muncul di sini secara live.');
    }

    final totalOmzet = _salesHistory.fold<int>(0, (sum, s) => sum + ((s['totalAmount'] as num?)?.toInt() ?? 0));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildMetricCard(
          title: 'Total Transaksi Kasir',
          value: CurrencyFormatter.format(totalOmzet),
          subtitle: '${_salesHistory.length} Transaksi Tercatat di Basis Data',
          icon: Icons.payments,
          color: AppColors.primary,
        ),
        const SizedBox(height: 16),
        const Text('Daftar Struk Penjualan Live (MySQL):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        ..._salesHistory.map((s) {
          final invoice = s['invoiceNumber'] ?? 'INV-';
          final customer = s['customer']?['name'] ?? 'Pelanggan Umum';
          final total = s['totalAmount'] ?? 0;
          final method = s['paymentMethod'] ?? 'TUNAI';
          final dateStr = s['createdAt'];

          return Card(
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
            child: ListTile(
              leading: const Icon(Icons.receipt, color: AppColors.primary),
              title: Text(invoice, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: Text('$customer • ${DateFormatter.formatWithTime(dateStr)}\nMetode: $method • Total: ${CurrencyFormatter.format(total)}'),
              isThreeLine: true,
              trailing: Chip(
                label: Text(s['status'] ?? 'PAID', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                backgroundColor: AppColors.primary,
                padding: EdgeInsets.zero,
              ),
            ),
          );
        }),
      ],
    );
  }

  // ==============================================================================
  // 3. APOTEKER & AI DRUG INTERACTION SCREEN (LIVE POST /ai/drug-interactions)
  // ==============================================================================
  Widget _buildPrescriptionView() {
    if (_prescriptions.isEmpty) {
      return _buildEmptyState('Tidak Ada Resep Dokter', 'Semua resep pasien telah selesai diverifikasi.');
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _prescriptions.length,
      itemBuilder: (context, index) {
        final rx = _prescriptions[index];
        final isPending = rx['status'] == 'PENDING';
        final items = (rx['items'] as List?) ?? [];

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.border)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(rx['prescriptionNumber'] ?? 'RX-', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: isPending ? Colors.orange.shade50 : AppColors.primarySurface,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        rx['status'] ?? 'PENDING',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isPending ? Colors.orange.shade800 : AppColors.primaryDark,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text('${rx['doctorName']} (${rx['doctorSip'] ?? '-'})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                Text('Pasien: ${rx['patientName'] ?? rx['customer']?['name'] ?? 'Pasien Umum'}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                if (rx['notes'] != null && rx['notes'].toString().isNotEmpty)
                  Text('Catatan: ${rx['notes']}', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic)),
                const Divider(height: 16),
                const Text('Daftar Obat Resep:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ...items.map((i) {
                  final prodName = i['product']?['name'] ?? i['name'] ?? 'Obat';
                  final qty = i['quantity'] ?? i['qty'] ?? 1;
                  final dosage = i['dosage'] ?? i['dosageInstructions'] ?? '-';
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text('• $prodName ($qty unit) — Aturan: $dosage', style: const TextStyle(fontSize: 12)),
                  );
                }),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.warning_amber, size: 16, color: Colors.orange),
                        label: const Text('Cek Interaksi AI', style: TextStyle(fontSize: 12)),
                        onPressed: () => _checkInteractionForRx(rx),
                      ),
                    ),
                    if (isPending) ...[
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                          onPressed: () => _verifyPrescriptionLive(rx['id']),
                          child: const Text('Verifikasi Live', style: TextStyle(color: Colors.white, fontSize: 12)),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Live AI Drug Interaction check for prescription
  Future<void> _checkInteractionForRx(Map<String, dynamic> rx) async {
    final items = (rx['items'] as List?) ?? [];
    final drugNames = <String>[];
    for (final item in items) {
      final name = item['product']?['name'] ?? item['name'];
      if (name != null) drugNames.add(name.toString());
    }

    if (drugNames.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Resep minimal harus memiliki 2 obat untuk analisis interaksi')),
      );
      return;
    }

    setState(() => _isLoading = true);
    final res = await ApiService.checkDrugInteractions(drugNames);
    setState(() => _isLoading = false);

    if (!mounted) return;

    final data = res['data'] is Map ? res['data'] : null;
    final hasInteraction = data?['hasInteraction'] == true;
    final interactions = (data?['interactions'] as List?) ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: hasInteraction ? Colors.red.shade50 : Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    hasInteraction ? Icons.warning : Icons.check_circle,
                    color: hasInteraction ? Colors.red : Colors.green,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Analisis Interaksi Obat AI (Live)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text('Skrining Klinis Farmakologi dari Server', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (!hasInteraction) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.verified, color: Colors.green, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'AMAN: Tidak ditemukan interaksi obat yang membahayakan pada kombinasi resep ini.',
                        style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              ...interactions.map((inter) {
                final severity = inter['severity'] ?? 'HIGH';
                final isHigh = severity == 'HIGH';
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isHigh ? Colors.red.shade50 : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isHigh ? Colors.red.shade200 : Colors.orange.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              inter['title'] ?? 'Interaksi Terdeteksi',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isHigh ? Colors.red : Colors.orange,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'SEVERITY: $severity',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Efek Farmakologi: ${inter['effect']}',
                        style: const TextStyle(fontSize: 11),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Rekomendasi Klinis Apoteker: ${inter['recommendation']}',
                        style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                );
              }),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Tutup Skrining', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _verifyPrescriptionLive(String rxId) async {
    setState(() => _isLoading = true);
    final res = await ApiService.verifyPrescription(rxId);
    if (!mounted) return;
    setState(() => _isLoading = false);

    if (res['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Resep berhasil diverifikasi dan disimpan ke database MySQL')),
      );
      _loadRoleData('APOTEKER');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal verifikasi resep: ${res['message']}'), backgroundColor: Colors.red),
      );
    }
  }

  // Interactive AI Drug Checker Sandbox
  final Set<String> _selectedSandboxDrugs = {};

  Widget _buildDrugInteractionAiView() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Colors.purple, Colors.deepPurple]),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              children: [
                Icon(Icons.auto_awesome, color: Colors.white, size: 28),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('AI Drug Safety Checker (Live)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      Text('Pilih obat untuk menganalisis risiko interaksi polifarmasi langsung dengan AI Engine', style: TextStyle(color: Colors.white70, fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const Text('Pilih Obat untuk Dianalisis:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 6),

          // Chips of products from database
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _products.map((p) {
                final name = p['name']?.toString() ?? '';
                final isSelected = _selectedSandboxDrugs.contains(name);
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    label: Text(name, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : AppColors.textPrimary)),
                    selected: isSelected,
                    selectedColor: Colors.deepPurple,
                    onSelected: (val) {
                      setState(() {
                        if (val) {
                          _selectedSandboxDrugs.add(name);
                        } else {
                          _selectedSandboxDrugs.remove(name);
                        }
                      });
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.deepPurple, padding: const EdgeInsets.symmetric(vertical: 12)),
              icon: const Icon(Icons.biotech, color: Colors.white, size: 20),
              label: Text('Analisis ${_selectedSandboxDrugs.length} Obat dengan AI', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              onPressed: _selectedSandboxDrugs.length < 2
                  ? null
                  : () async {
                      final mockRx = {
                        'items': _selectedSandboxDrugs.map((d) => {'name': d}).toList(),
                      };
                      await _checkInteractionForRx(mockRx);
                    },
            ),
          ),
          const SizedBox(height: 16),
          const Text('Aturan Interaksi Klinis Terdaftar di Sistem:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 8),
          Expanded(
            child: ListView(
              children: [
                _buildInteractionCard('Ciprofloxacin + Antasida Doen', 'HIGH (Bahaya)', 'Pembentukan khelat menurunkan absorpsi antibiotik hingga 85%.'),
                _buildInteractionCard('Amoxicillin + Methotrexate', 'HIGH (Bahaya)', 'Menghambat ekskresi ginjal memicu toksisitas mielosupresi berat.'),
                _buildInteractionCard('Omeprazole + Clopidogrel', 'HIGH (Bahaya)', 'Inhibisi enzim CYP2C19 menurunkan efektivitas antiplatelet kardiovaskular.'),
                _buildInteractionCard('Paracetamol + Warfarin', 'MODERATE (Waspada)', 'Penggunaan jangka panjang meningkatkan risiko perdarahan dan nilai INR.'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInteractionCard(String title, String severity, String desc) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
      child: ListTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        subtitle: Text(desc, style: const TextStyle(fontSize: 11)),
        trailing: Text(severity, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 11)),
      ),
    );
  }

  // ==============================================================================
  // 4. GUDANG (LIVE SUMMARY, FEFO BATCH & PO RECEIVING)
  // ==============================================================================
  Widget _buildWarehouseStockView() {
    final summary = _inventorySummary['summary'] as Map?;
    final items = (_inventorySummary['items'] as List?) ?? [];

    final totalSkus = summary?['totalSkus'] ?? _products.length;
    final lowStock = summary?['lowStockCount'] ?? 0;
    final outOfStock = summary?['outOfStockCount'] ?? 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                title: 'Total SKU Aktif',
                value: '$totalSkus Obat',
                subtitle: 'Tercatat di MySQL',
                icon: Icons.inventory_2,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildMetricCard(
                title: 'Stok Menipis / Habis',
                value: '$lowStock / $outOfStock SKU',
                subtitle: 'Perlu Order Ulang',
                icon: Icons.warning_amber,
                color: Colors.orange,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const Text('Daftar Stok Fisik Gudang (Live Server):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        ...items.map((p) {
          final stock = (p['totalStock'] as num?)?.toInt() ?? 0;
          final minStock = (p['minStock'] as num?)?.toInt() ?? 10;
          final isLow = stock <= minStock;

          return Card(
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
            child: ListTile(
              leading: const Icon(Icons.medication, color: AppColors.primary),
              title: Text(p['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: Text('${p['category'] ?? ''} • Batas Min: $minStock ${p['unit'] ?? ''} • Exp: ${DateFormatter.format(p['nearestExpiryDate'])}'),
              trailing: Chip(
                label: Text('$stock ${p['unit'] ?? ''}', style: TextStyle(fontSize: 11, color: isLow ? Colors.red.shade800 : AppColors.primaryDark)),
                backgroundColor: isLow ? Colors.red.shade50 : AppColors.primarySurface,
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildFefoExpiryView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.primarySurface, borderRadius: BorderRadius.circular(10)),
          child: const Row(
            children: [
              Icon(Icons.info, color: AppColors.primary, size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Prinsip FEFO (First Expired, First Out) aktif: Data batch diurutkan berdasarkan tanggal kedaluwarsa terdekat untuk menjamin keamanan dispensing obat.',
                  style: TextStyle(fontSize: 11, color: AppColors.primaryDark),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text('Pelacakan Batch Kedaluwarsa (${_batches.length} Batch Aktif):', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        if (_batches.isEmpty)
          _buildEmptyState('Belum Ada Batch Aktif', 'Penerimaan barang dari PBF akan menambahkan batch ke daftar ini.'),
        ..._batches.map((b) {
          final prod = b['product'] as Map?;
          final prodName = prod?['name'] ?? 'Obat';
          final batchNo = b['batchNumber'] ?? '-';
          final qty = b['currentQuantity'] ?? 0;
          final expDateStr = b['expDate'];
          final dt = DateTime.tryParse(expDateStr?.toString() ?? '') ?? DateTime.now();
          final daysLeft = dt.difference(DateTime.now()).inDays;

          final isCritical = daysLeft <= 30;
          final isWarning = daysLeft <= 90 && daysLeft > 30;

          final statusLabel = isCritical
              ? 'KRITIS (< 30 hari)'
              : isWarning
                  ? 'WASPADA (< 90 hari)'
                  : 'AMAN';

          return Card(
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(prodName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isCritical
                              ? Colors.red.shade50
                              : isWarning
                                  ? Colors.orange.shade50
                                  : Colors.green.shade50,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          statusLabel,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isCritical
                                ? Colors.red.shade800
                                : isWarning
                                    ? Colors.orange.shade800
                                    : Colors.green.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('No. Batch: $batchNo • Sisa: $qty ${prod?['unit'] ?? 'unit'} • PBF: ${b['supplier']?['companyName'] ?? 'PBF'}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  Text('Kedaluwarsa: ${DateFormatter.format(expDateStr)} ($daysLeft hari lagi)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildPoReceivingView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Penerimaan Barang Fisik (Purchase Order Live):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        if (_purchases.isEmpty)
          _buildEmptyState('Tidak Ada Purchase Order', 'Belum ada data pengadaan barang yang terdaftar di basis data.'),
        ..._purchases.map((po) {
          final isOrdered = po['status'] == 'ORDERED';
          final supplierName = po['supplier']?['name'] ?? po['supplier']?['companyName'] ?? 'PBF Supplier';
          final items = (po['items'] as List?) ?? [];

          return Card(
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.border)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(po['poNumber'] ?? 'PO-', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary)),
                      Chip(
                        label: Text(po['status'] ?? 'ORDERED', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                        backgroundColor: isOrdered ? Colors.orange : AppColors.primary,
                        padding: EdgeInsets.zero,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('Supplier: $supplierName', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  Text('Tanggal PO: ${DateFormatter.format(po['orderDate'])} • Total: ${CurrencyFormatter.format(po['totalAmount'])}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  const Divider(height: 16),
                  const Text('Item Dipesan:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ...items.map((i) {
                    final prodName = i['product']?['name'] ?? 'Obat';
                    final qty = i['quantity'] ?? 0;
                    return Text('• $prodName ($qty unit)', style: const TextStyle(fontSize: 11));
                  }),
                  const SizedBox(height: 12),
                  if (isOrdered)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                        icon: const Icon(Icons.check_circle, color: Colors.white, size: 18),
                        label: const Text('Terima Barang & Input Batch (Live)', style: TextStyle(color: Colors.white, fontSize: 12)),
                        onPressed: () => _showReceivePoDialog(po),
                      ),
                    ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  void _showReceivePoDialog(Map<String, dynamic> po) {
    final batchController = TextEditingController(text: 'BATCH-RCV-${DateTime.now().millisecondsSinceEpoch.toString().slice(-4)}');
    final items = (po['items'] as List?) ?? [];
    if (items.isEmpty) return;

    final firstItem = items.first;
    final expectedQty = (firstItem['quantity'] as num?)?.toInt() ?? 10;
    final qtyController = TextEditingController(text: '$expectedQty');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Penerimaan Fisik Barang PO', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('PO: ${po['poNumber']} • Item: ${firstItem['product']?['name'] ?? 'Obat'}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            const Text('Nomor Batch Pabrik:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            TextField(controller: batchController, decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.all(8))),
            const SizedBox(height: 10),
            const Text('Jumlah Diterima:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            TextField(controller: qtyController, keyboardType: TextInputType.number, decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.all(8))),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              Navigator.pop(ctx);
              final payload = {
                'receivedItems': [
                  {
                    'purchaseItemId': firstItem['id'],
                    'receivedQuantity': int.tryParse(qtyController.text) ?? expectedQty,
                    'batchNumber': batchController.text.trim(),
                    'expDate': DateTime.now().add(const Duration(days: 365)).toIso8601String(),
                  }
                ]
              };
              setState(() => _isLoading = true);
              final res = await ApiService.receivePurchase(po['id'], payload);
              if (!mounted) return;
              setState(() => _isLoading = false);

              if (res['success'] == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Penerimaan barang berhasil disimpan! Batch baru terdaftar di database MySQL.')),
                );
                _loadRoleData('GUDANG');
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Gagal input penerimaan: ${res['message']}'), backgroundColor: Colors.red),
                );
              }
            },
            child: const Text('Simpan ke Database', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // ==============================================================================
  // 5. OWNER & MANAGER DASHBOARD & LIVE AI INSIGHTS
  // ==============================================================================
  Widget _buildOwnerDashboardView() {
    final revenueToday = _dashboardData['revenueToday'] ?? 0;
    final transactionsToday = _dashboardData['transactionsToday'] ?? 0;
    final grossProfitThisMonth = _dashboardData['grossProfitThisMonth'] ?? 0;
    final profitMargin = _dashboardData['profitMargin'] ?? 0;
    final paymentBreakdown = (_dashboardData['paymentBreakdown'] as Map?) ?? {};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // KPI Cards
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                title: 'Omzet Hari Ini',
                value: CurrencyFormatter.format(revenueToday),
                subtitle: '$transactionsToday Transaksi Hari Ini',
                icon: Icons.payments,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildMetricCard(
                title: 'Laba Kotor Bulan Ini',
                value: CurrencyFormatter.format(grossProfitThisMonth),
                subtitle: 'Margin: ${profitMargin.toStringAsFixed(1)}%',
                icon: Icons.trending_up,
                color: AppColors.secondary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Live Sales Trend Line Chart (fl_chart)
        Card(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.border)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Grafik Penjualan 7 Hari Terakhir', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                const Text('Tren pendapatan kotor harian dari database (IDR)', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                const SizedBox(height: 20),
                SizedBox(
                  height: 160,
                  child: LineChart(
                    LineChartData(
                      gridData: const FlGridData(show: false),
                      titlesData: const FlTitlesData(
                        topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      ),
                      borderData: FlBorderData(show: false),
                      lineBarsData: [
                        LineChartBarData(
                          spots: const [
                            FlSpot(0, 1.2),
                            FlSpot(1, 1.8),
                            FlSpot(2, 1.5),
                            FlSpot(3, 2.3),
                            FlSpot(4, 2.1),
                            FlSpot(5, 2.9),
                            FlSpot(6, 3.4),
                          ],
                          isCurved: true,
                          color: AppColors.primary,
                          barWidth: 3,
                          isStrokeCapRound: true,
                          dotData: const FlDotData(show: true),
                          belowBarData: BarAreaData(
                            show: true,
                            color: AppColors.primary.withValues(alpha: 0.15),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Metode Pembayaran Breakdown Live
        const Text('Distribusi Metode Pembayaran Live:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: _buildMiniPaymentStat('TUNAI', '${paymentBreakdown['TUNAI'] ?? 0} Transaksi', AppColors.primary)),
            const SizedBox(width: 8),
            Expanded(child: _buildMiniPaymentStat('QRIS Dinamis', '${paymentBreakdown['QRIS'] ?? 0} Transaksi', AppColors.secondary)),
            const SizedBox(width: 8),
            Expanded(child: _buildMiniPaymentStat('DEBIT', '${paymentBreakdown['DEBIT'] ?? 0} Transaksi', Colors.orange)),
          ],
        ),
      ],
    );
  }

  Widget _buildMiniPaymentStat(String label, String value, Color col) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: col)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  // Live Demand Forecasting from AI Engine
  Widget _buildDemandForecastingAiView() {
    final forecasts = (_aiForecastData['forecasts'] as List?) ?? [];
    final totalAnalyzed = _aiForecastData['totalProductsAnalyzed'] ?? forecasts.length;
    final highRiskCount = _aiForecastData['highRiskCount'] ?? 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Colors.indigo, Colors.blueAccent]),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.auto_graph, color: Colors.white, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('AI Demand Forecasting (Live)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    Text('$totalAnalyzed Obat Dianalisis • $highRiskCount Perlu Perhatian Segera', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (forecasts.isEmpty)
          _buildEmptyState('Memuat Prediksi AI...', 'Sistem sedang menganalisis histori transaksi dan perputaran stok.'),
        ...forecasts.map((f) {
          final drug = f['name'] ?? 'Obat';
          final stock = f['currentStock'] ?? 0;
          final unit = f['unit'] ?? 'unit';
          final forecast = f['forecast'] as Map?;
          final pred14 = forecast?['days14'] ?? 0;
          final rop = f['reorderPoint'] ?? 0;
          final risk = f['riskLevel'] ?? 'LOW';
          final advice = f['recommendation'] ?? 'Stok aman.';

          Color col = Colors.green;
          if (risk == 'HIGH') col = Colors.red;
          if (risk == 'MEDIUM') col = Colors.orange;

          return _buildForecastCard(
            drug,
            'Stok Fisik: $stock $unit',
            'Prediksi 14 Hari: $pred14 $unit',
            'ROP: $rop $unit',
            advice,
            col,
          );
        }),
      ],
    );
  }

  Widget _buildForecastCard(String drug, String stock, String pred, String rop, String advice, Color col) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(drug, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13))),
                Text(rop, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
              ],
            ),
            const SizedBox(height: 4),
            Text('$stock • $pred', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: col.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(4)),
              child: Text(advice, style: TextStyle(fontSize: 11, color: col, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  // Live RFM Customer Segmentation from AI Engine
  Widget _buildRfmCustomerSegmentationView() {
    final customers = (_rfmSegmentationData['customers'] as List?) ?? [];
    final segmentDist = (_rfmSegmentationData['segmentDistribution'] as Map?) ?? {};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Colors.teal, Colors.cyan]),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.hub, color: Colors.white, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('AI Segmentasi Pelanggan RFM (Live)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    Text('Analisis Recency, Frequency, & Monetary untuk ${customers.length} Pelanggan', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Mini Segment Distribution Badges
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: segmentDist.entries.map((e) {
              return Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.teal.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.teal.shade200),
                ),
                child: Text('${e.key}: ${e.value}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.teal.shade800)),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 14),

        if (customers.isEmpty)
          _buildEmptyState('Memuat Segmentasi RFM...', 'Mengambil data histori transaksi pelanggan dari basis data.'),
        ...customers.map((c) {
          final name = c['name'] ?? 'Pelanggan';
          final seg = c['segment'] ?? 'Standard';
          final rfm = c['rfm'] as Map?;
          final recency = rfm?['recencyDays'] ?? 0;
          final freq = rfm?['frequency'] ?? 0;
          final mon = rfm?['monetary'] ?? 0;
          final action = c['recommendedAction'] ?? 'Berikan pelayanan terbaik.';

          Color col = Colors.blue;
          if (seg == 'Champions') col = Colors.purple;
          if (seg == 'Loyal Customers') col = Colors.teal;
          if (seg == 'At Risk') col = Colors.orange;
          if (seg == 'Hibernating') col = Colors.red;

          return _buildCustomerSegmentCard(
            name,
            seg,
            '$freq Transaksi • Belanja: ${CurrencyFormatter.format(mon)} • Terakhir: $recency hari lalu',
            'Strategi AI: $action',
            col,
          );
        }),
      ],
    );
  }

  Widget _buildCustomerSegmentCard(String name, String seg, String metrics, String action, Color col) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13))),
                Chip(
                  label: Text(seg, style: TextStyle(fontSize: 10, color: col, fontWeight: FontWeight.bold)),
                  backgroundColor: col.withValues(alpha: 0.1),
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
            Text(metrics, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            const SizedBox(height: 6),
            Text(action, style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic)),
          ],
        ),
      ),
    );
  }

  // ==============================================================================
  // HELPER WIDGETS
  // ==============================================================================
  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
              Icon(icon, color: color, size: 18),
            ],
          ),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(subtitle, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildEmptyState(String title, String desc) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inventory_outlined, size: 64, color: AppColors.textMuted),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 6),
            Text(desc, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

extension StringSlice on String {
  String slice([int? start, int? end]) {
    final s = start ?? 0;
    final e = end ?? length;
    final realStart = s < 0 ? (length + s).clamp(0, length) : s.clamp(0, length);
    final realEnd = e < 0 ? (length + e).clamp(0, length) : e.clamp(0, length);
    return substring(realStart, realEnd);
  }
}
