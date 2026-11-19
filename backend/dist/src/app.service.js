"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma/prisma.service");
let AppService = class AppService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getHealthStatus() {
        let databaseStatus = 'DISCONNECTED';
        let branchCount = 0;
        let productCount = 0;
        let userCount = 0;
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            databaseStatus = 'CONNECTED (MySQL / MariaDB via XAMPP)';
            branchCount = await this.prisma.branch.count();
            productCount = await this.prisma.product.count();
            userCount = await this.prisma.user.count();
        }
        catch (error) {
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
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppService);
//# sourceMappingURL=app.service.js.map