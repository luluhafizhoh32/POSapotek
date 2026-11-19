import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealthStatus() {
    let databaseStatus = 'DISCONNECTED';
    let branchCount = 0;
    let productCount = 0;
    let userCount = 0;

    try {
      // Test MySQL query
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'CONNECTED (MySQL / MariaDB via XAMPP)';

      branchCount = await this.prisma.branch.count();
      productCount = await this.prisma.product.count();
      userCount = await this.prisma.user.count();
    } catch (error: any) {
      databaseStatus = `ERROR: ${error.message || 'Cannot reach MySQL database'}`;
    }

    return {
      status: 'OK',
      app: 'PharmaPOS - Mobile POS & Pharmacy Management System (Indonesia)',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Jakarta',
      currency: 'IDR (Rp)',
      environment: process.env.APP_ENV || 'development',
      database: {
        engine: 'MySQL / MariaDB (InnoDB)',
        status: databaseStatus,
        stats: {
          branches: branchCount,
          users: userCount,
          products: productCount,
          isZeroSeed: userCount === 0 && productCount === 0,
        },
      },
    };
  }
}
