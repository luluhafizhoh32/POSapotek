import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: {
        sub: string;
        email: string;
        role: string;
        branchId: string;
    }): Promise<{
        branch: {
            id: string;
            name: string;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            address: string | null;
        };
        role: {
            id: string;
            name: string;
            description: string | null;
            isSystem: boolean;
        };
        id: string;
        email: string;
        branchId: string;
        roleId: string;
        name: string;
        phone: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
