import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SalesModule } from './modules/sales/sales.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CategoriesModule,
    SuppliersModule,
    CustomersModule,
    ProductsModule,
    InventoryModule,
    PurchasesModule,
    SalesModule,
    PrescriptionsModule,
    PromotionsModule,
    ReportsModule,
    NotificationsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
