import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            phone: string;
            role: string;
            branch: {
                id: string;
                name: string;
                code: string;
            };
        };
    }>;
    refreshToken(dto: RefreshTokenDto): Promise<{
        accessToken: string;
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        name: string;
        phone: string;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
        branch: {
            id: string;
            name: string;
            phone: string;
            code: string;
            address: string;
        };
        role: {
            id: string;
            name: string;
            description: string;
        };
    }>;
}
