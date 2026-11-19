import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHealth(): Promise<{
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
