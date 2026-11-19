import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'pharmapos_secure_super_secret_jwt_key_indonesia_2026',
    });
  }

  async validate(payload: { sub: string; email: string; role: string; branchId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: true,
        branch: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Pengguna tidak ditemukan atau akun sedang dinonaktifkan');
    }

    const { passwordHash, ...result } = user;
    return result;
  }
}
