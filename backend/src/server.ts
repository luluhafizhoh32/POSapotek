import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getEnv } from './config/env.js';
import { getPool, tutupSemuaPool } from './db/pool.js';
import { GalatAplikasi } from './lib/galat.js';

export async function bangunServer(): Promise<FastifyInstance> {
  const env = getEnv();

  const app = Fastify({
    bodyLimit: 1024 * 1024, // 1 MB
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: {
        paths: [
          'req.headers.authorization',
          '*.kata_sandi',
          '*.kata_sandi_lama',
          '*.kata_sandi_baru',
          '*.kata_sandi_awal',
          '*.token',
          '*.token_akses',
          '*.token_segar',
        ],
        censor: '[DIRAHASIAKAN]',
      },
    },
  });

  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: () => new GalatAplikasi('TERLALU_BANYAK_PERMINTAAN').keJson(),
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB untuk lampiran
      files: 1,
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'API POS Apotek KADIN Bengkalis',
        description: 'Dokumentasi REST API sistem kasir dan stok apotek.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/dokumentasi',
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof GalatAplikasi) {
      return reply.status(error.status).send(error.keJson());
    }
    const fastifyErr = error as { statusCode?: number; code?: string };
    if (fastifyErr.statusCode === 429) {
      const g = new GalatAplikasi('TERLALU_BANYAK_PERMINTAAN');
      return reply.status(g.status).send(g.keJson());
    }
    if (fastifyErr.statusCode === 400 || fastifyErr.code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
      const g = new GalatAplikasi('VALIDASI_GAGAL');
      return reply.status(g.status).send(g.keJson());
    }
    app.log.error(error);
    const internal = new GalatAplikasi('GALAT_INTERNAL');
    return reply.status(500).send(internal.keJson());
  });

  app.setNotFoundHandler((_request, reply) => {
    const g = new GalatAplikasi('TIDAK_DITEMUKAN');
    return reply.status(404).send(g.keJson());
  });

  // === Rute /api/v1 ===
  app.register(
    async (api) => {
      api.get('/kesehatan', async (_req, reply) => {
        try {
          await getPool().query('SELECT 1');
          return reply.status(200).send({
            data: { status: 'ok', basis_data: 'ok' },
          });
        } catch {
          return reply.status(503).send({
            data: { status: 'galat', basis_data: 'galat' },
          });
        }
      });
    },
    { prefix: '/api/v1' },
  );

  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const env = getEnv();
  const app = await bangunServer();

  const tutup = async () => {
    await app.close();
    await tutupSemuaPool();
    process.exit(0);
  };
  process.on('SIGINT', tutup);
  process.on('SIGTERM', tutup);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}
