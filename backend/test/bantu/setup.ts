import 'dotenv/config';
import { resetEnvCache } from '../../src/config/env.js';

process.env['NODE_ENV'] = 'test';

if (process.env['DATABASE_URL']) {
  process.env['DATABASE_URL'] = process.env['DATABASE_URL'].replace(/\/pos_apotek(\?|$)/, '/pos_apotek_test$1');
}
if (process.env['DATABASE_URL_MIGRATOR']) {
  process.env['DATABASE_URL_MIGRATOR'] = process.env['DATABASE_URL_MIGRATOR'].replace(/\/pos_apotek(\?|$)/, '/pos_apotek_test$1');
}

resetEnvCache();
