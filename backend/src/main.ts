import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('PharmaPOS-Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global Prefix: /api/v1
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Global CORS Enable (untuk Flutter Mobile & Web Dashboard)
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter & Transform Interceptor
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('PharmaPOS API')
    .setDescription(
      'Mobile POS & Pharmacy Management System API — Sistem Manajemen & Transaksi Apotek Indonesia (FEFO, QRIS, Resep, AI Analytics)',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Masukkan JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'PharmaPOS Swagger API Documentation',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 PharmaPOS Backend Server is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger API Documentation is available at: http://localhost:${port}/api/docs`);
}

bootstrap();
