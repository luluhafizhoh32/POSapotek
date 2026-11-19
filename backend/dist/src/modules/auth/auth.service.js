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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                role: true,
                branch: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Email atau password tidak sesuai');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Akun pengguna telah dinonaktifkan. Hubungi Administrator/Owner.');
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Email atau password tidak sesuai');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role.name,
            branchId: user.branchId,
            branchName: user.branch.name,
        };
        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET || 'pharmapos_secure_super_secret_jwt_key_indonesia_2026',
            expiresIn: process.env.JWT_EXPIRATION || '86400s',
        });
        const refreshToken = this.jwtService.sign({ sub: user.id, email: user.email }, {
            secret: process.env.JWT_REFRESH_SECRET || 'pharmapos_secure_refresh_token_secret_key_2026',
            expiresIn: process.env.JWT_REFRESH_EXPIRATION || '604800s',
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role.name,
                branch: {
                    id: user.branch.id,
                    name: user.branch.name,
                    code: user.branch.code,
                },
            },
        };
    }
    async refreshToken(dto) {
        try {
            const payload = this.jwtService.verify(dto.refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET || 'pharmapos_secure_refresh_token_secret_key_2026',
            });
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                include: { role: true, branch: true },
            });
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('Sesi tidak valid');
            }
            const newPayload = {
                sub: user.id,
                email: user.email,
                name: user.name,
                role: user.role.name,
                branchId: user.branchId,
                branchName: user.branch.name,
            };
            const accessToken = this.jwtService.sign(newPayload, {
                secret: process.env.JWT_SECRET || 'pharmapos_secure_super_secret_jwt_key_indonesia_2026',
                expiresIn: process.env.JWT_EXPIRATION || '86400s',
            });
            return { accessToken };
        }
        catch {
            throw new common_1.UnauthorizedException('Refresh token tidak valid atau telah kedaluwarsa');
        }
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        address: true,
                        phone: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Pengguna tidak ditemukan');
        }
        return user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map