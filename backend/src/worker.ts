import cron from 'node-cron';
import { tutupSemuaPool } from './db/pool.js';
import { jalankanJobBersih } from './jobs/bersih.js';
import { jalankanJobLaporanBulanan } from './jobs/laporanBulanan.js';
import { jalankanJobNearExpired } from './jobs/nearExpired.js';
import { ZONA_BISNIS } from './lib/jam.js';

async function mulaiWorker() {
  console.log('Worker POS Apotek dimulai...');

  // Catch-up saat mulai
  await jalankanJobNearExpired();
  await jalankanJobLaporanBulanan();

  const tugasNearExpired = cron.schedule(
    '0 6 * * *',
    () => {
      void jalankanJobNearExpired();
    },
    { timezone: ZONA_BISNIS },
  );

  const tugasLaporanBulanan = cron.schedule(
    '30 6 * * *',
    () => {
      void jalankanJobLaporanBulanan();
    },
    { timezone: ZONA_BISNIS },
  );

  const tugasBersih = cron.schedule(
    '0 2 * * *',
    () => {
      void jalankanJobBersih();
    },
    { timezone: ZONA_BISNIS },
  );

  const tutup = async () => {
    tugasNearExpired.stop();
    tugasLaporanBulanan.stop();
    tugasBersih.stop();
    await tutupSemuaPool();
    process.exit(0);
  };

  process.on('SIGINT', tutup);
  process.on('SIGTERM', tutup);
}

void mulaiWorker();
