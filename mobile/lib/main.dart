import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'app/router.dart';
import 'app/tema.dart';
import 'inti/sesi.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await initializeDateFormatting('id_ID', null);

  runApp(const ProviderScope(child: PosApotekApp()));
}

class PosApotekApp extends ConsumerStatefulWidget {
  const PosApotekApp({super.key});

  @override
  ConsumerState<PosApotekApp> createState() => _PosApotekAppState();
}

class _PosApotekAppState extends ConsumerState<PosApotekApp> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(sesiProvider.notifier).muatAwal());
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'POS Apotek KADIN',
      debugShowCheckedModeBanner: false,
      theme: bangunTemaPos(),
      locale: const Locale('id', 'ID'),
      supportedLocales: const [Locale('id', 'ID')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: router,
    );
  }
}
