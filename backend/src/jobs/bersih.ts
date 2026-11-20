import { getPool } from '../db/pool.js';
import { withApotek } from '../db/withApotek.js';
import { Jam } from '../lib/jam.js';

export async function jalankanJobBersih(): Promise<void> {
  const pool = getPool();
  const lockClient = await pool.connect();

  try {
    const lockRes = await lockClient.query<{ ok: boolean }>(
      `SELECT pg_try_advisory_lock(1003) AS ok`,
    );
    if (!lockRes.rows[0]?.ok) return;

    const sekarang = Jam.sekarang();
    const batasSesi = sekarang.minus({ days: 7 }).toISO()!;
    const batasNotif = sekarang.minus({ days: 90 }).toISO()!;

    await pool.query(
      `DELETE FROM sesi_login WHERE kedaluwarsa_pada < $1`,
      [batasSesi],
    );

    const apotekRes = await pool.query<{ id: string }>(`SELECT id FROM apotek`);
    for (const a of apotekRes.rows) {
      await withApotek(Number(a.id), async (client) => {
        await client.query(
          `DELETE FROM notifikasi WHERE dibaca_pada IS NOT NULL AND dibaca_pada < $1`,
          [batasNotif],
        );
      });
    }
  } finally {
    await lockClient.query(`SELECT pg_advisory_unlock(1003)`).catch(() => {});
    lockClient.release();
  }
}
