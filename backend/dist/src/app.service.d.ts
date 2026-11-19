import { PrismaService } from './prisma/prisma.service';
export declare class AppService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHealthStatus(): Promise<{
        status: string;
        app: string;
        version: string;
        timestamp: string;
        timezone: string;
        currency: string;
        environment: string;
        database: {
            engine: string;
            status: string;
            stats: {
                branches: number;
                users: number;
                products: number;
                isZeroSeed: boolean;
            };
        };
    }>;
}
