import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(branchId: string): Promise<{
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
