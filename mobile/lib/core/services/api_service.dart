import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String _defaultBaseUrl = 'http://localhost:3001/api/v1';
  static String baseUrl = _defaultBaseUrl;
  static String? _token;
  static Map<String, dynamic>? _currentUser;

  static String? get token => _token;
  static Map<String, dynamic>? get currentUser => _currentUser;
  static bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  static void setToken(String? token) {
    _token = token;
  }

  static void setCurrentUser(Map<String, dynamic>? user) {
    _currentUser = user;
  }

  static Map<String, String> _getHeaders() {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  // ============================================================================
  // GENERIC HTTP METHODS
  // ============================================================================

  static Future<Map<String, dynamic>> asyncGet(String endpoint) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl$endpoint'), headers: _getHeaders())
          .timeout(const Duration(seconds: 8));
      return _processResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> asyncPost(
      String endpoint, Map<String, dynamic> body) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl$endpoint'),
            headers: _getHeaders(),
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));
      return _processResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> asyncPut(
      String endpoint, Map<String, dynamic> body) async {
    try {
      final response = await http
          .put(
            Uri.parse('$baseUrl$endpoint'),
            headers: _getHeaders(),
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));
      return _processResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> asyncPatch(
      String endpoint, [Map<String, dynamic>? body]) async {
    try {
      final response = await http
          .patch(
            Uri.parse('$baseUrl$endpoint'),
            headers: _getHeaders(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 10));
      return _processResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> asyncDelete(String endpoint) async {
    try {
      final response = await http
          .delete(Uri.parse('$baseUrl$endpoint'), headers: _getHeaders())
          .timeout(const Duration(seconds: 8));
      return _processResponse(response);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Map<String, dynamic> _processResponse(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          'success': true,
          'statusCode': response.statusCode,
          'data': decoded['data'] ?? decoded,
        };
      } else {
        return {
          'success': false,
          'statusCode': response.statusCode,
          'message': decoded['message'] ??
              'Terjadi kesalahan pada server (${response.statusCode})',
        };
      }
    } catch (_) {
      return {
        'success': response.statusCode >= 200 && response.statusCode < 300,
        'statusCode': response.statusCode,
        'message': response.body,
      };
    }
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await asyncPost('/auth/login', {
      'email': email,
      'password': password,
    });

    if (res['success'] == true && res['data'] != null) {
      final token = res['data']['accessToken'];
      final user = res['data']['user'];
      setToken(token);
      setCurrentUser(user);

      // Save locally
      try {
        final prefs = await SharedPreferences.getInstance();
        if (token != null) await prefs.setString('jwt_token', token);
        if (user != null) await prefs.setString('user_profile', jsonEncode(user));
      } catch (_) {}
    }

    return res;
  }

  static Future<void> logout() async {
    _token = null;
    _currentUser = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt_token');
      await prefs.remove('user_profile');
    } catch (_) {}
  }

  // ============================================================================
  // BUSINESS MODULE APIS (REAL LIVE ENDPOINTS)
  // ============================================================================

  // 1. Products & Catalog
  static Future<Map<String, dynamic>> fetchProducts({
    String? search,
    String? categoryId,
    bool? lowStockOnly,
  }) async {
    final queryParams = <String>[];
    if (search != null && search.isNotEmpty) {
      queryParams.add('search=${Uri.encodeComponent(search)}');
    }
    if (categoryId != null && categoryId.isNotEmpty && categoryId != 'Semua') {
      queryParams.add('categoryId=$categoryId');
    }
    if (lowStockOnly == true) {
      queryParams.add('lowStockOnly=true');
    }
    final qs = queryParams.isNotEmpty ? '?${queryParams.join('&')}' : '';
    return asyncGet('/products$qs');
  }

  static Future<Map<String, dynamic>> fetchProductByBarcode(String barcode) async {
    return asyncGet('/products/barcode/$barcode');
  }

  static Future<Map<String, dynamic>> fetchCategories() async {
    return asyncGet('/categories');
  }

  // 2. Sales & Checkout
  static Future<Map<String, dynamic>> checkoutSale(Map<String, dynamic> body) async {
    return asyncPost('/sales/checkout', body);
  }

  static Future<Map<String, dynamic>> fetchSalesHistory({int limit = 50}) async {
    return asyncGet('/sales?limit=$limit');
  }

  // 3. Prescriptions
  static Future<Map<String, dynamic>> fetchPrescriptions({String? status}) async {
    final qs = (status != null && status.isNotEmpty) ? '?status=$status' : '';
    return asyncGet('/prescriptions$qs');
  }

  static Future<Map<String, dynamic>> verifyPrescription(
    String id, {
    String? notes,
  }) async {
    return asyncPost('/prescriptions/$id/verify', {
      'notes': notes ?? 'Verifikasi klinis disetujui oleh Apoteker Penanggung Jawab',
    });
  }

  // 4. Inventory & Batches (FEFO)
  static Future<Map<String, dynamic>> fetchInventorySummary() async {
    return asyncGet('/inventory/summary');
  }

  static Future<Map<String, dynamic>> fetchBatches({String? productId}) async {
    final qs = (productId != null && productId.isNotEmpty) ? '?productId=$productId' : '';
    return asyncGet('/inventory/batches$qs');
  }

  // 5. Purchases & PO Receiving
  static Future<Map<String, dynamic>> fetchPurchases({String? status}) async {
    final qs = (status != null && status.isNotEmpty) ? '?status=$status' : '';
    return asyncGet('/purchases$qs');
  }

  static Future<Map<String, dynamic>> receivePurchase(
    String purchaseId,
    Map<String, dynamic> receivePayload,
  ) async {
    return asyncPost('/purchases/$purchaseId/receive', receivePayload);
  }

  // 6. Reports & Owner Dashboard
  static Future<Map<String, dynamic>> fetchDashboard() async {
    return asyncGet('/reports/dashboard');
  }

  // 7. AI Modules
  static Future<Map<String, dynamic>> fetchAiForecast() async {
    return asyncGet('/ai/forecast');
  }

  static Future<Map<String, dynamic>> checkDrugInteractions(List<String> drugNames) async {
    return asyncPost('/ai/drug-interactions', {
      'drugNames': drugNames,
    });
  }

  static Future<Map<String, dynamic>> fetchRfmSegmentation() async {
    return asyncGet('/ai/rfm-segmentation');
  }
}
