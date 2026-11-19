import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _formatter = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp',
    decimalDigits: 0,
  );

  static String format(dynamic amount) {
    if (amount == null) return 'Rp0';
    num val = 0;
    if (amount is num) {
      val = amount;
    } else {
      val = num.tryParse(amount.toString()) ?? 0;
    }
    return _formatter.format(val).replaceAll(' ', '');
  }
}
