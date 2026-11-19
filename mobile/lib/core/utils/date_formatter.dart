import 'package:intl/intl.dart';

class DateFormatter {
  static String format(dynamic date) {
    if (date == null) return '-';
    DateTime dt;
    if (date is DateTime) {
      dt = date;
    } else {
      dt = DateTime.tryParse(date.toString()) ?? DateTime.now();
    }
    return DateFormat('d MMM yyyy').format(dt);
  }

  static String formatWithTime(dynamic date) {
    if (date == null) return '-';
    DateTime dt;
    if (date is DateTime) {
      dt = date;
    } else {
      dt = DateTime.tryParse(date.toString()) ?? DateTime.now();
    }
    return '${DateFormat('d MMM yyyy, HH:mm').format(dt)} WIB';
  }
}
