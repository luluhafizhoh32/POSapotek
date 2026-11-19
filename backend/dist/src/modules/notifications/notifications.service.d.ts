import { PrismaService } from '../../prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(branchId?: string): Promise<{
        id: string;
        branchId: string;
        createdAt: Date;
        type: string;
        userId: string | null;
        title: string;
        message: string;
        isRead: boolean;
    }[]>;
    markAsRead(id: string): Promise<{
        id: string;
        branchId: string;
        createdAt: Date;
        type: string;
        userId: string | null;
        title: string;
        message: string;
        isRead: boolean;
    }>;
}
