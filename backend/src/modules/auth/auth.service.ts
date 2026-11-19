import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        branch: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau password tidak sesuai');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Akun pengguna telah dinonaktifkan. Hubungi Administrator/Owner.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password tidak sesuai');
    }

    // Update lastLoginAt
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

    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'pharmapos_secure_refresh_token_secret_key_2026',
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '604800s',
      },
    );

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

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'pharmapos_secure_refresh_token_secret_key_2026',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true, branch: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Sesi tidak valid');
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
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau telah kedaluwarsa');
    }
  }

  async getProfile(userId: string) {
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
      throw new BadRequestException('Pengguna tidak ditemukan');
    }

    return user;
  }
}
