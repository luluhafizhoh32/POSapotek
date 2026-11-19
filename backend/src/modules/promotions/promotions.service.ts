import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromotionDto } from './dto/promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        products: {
          include: { product: true },
        },
      },
    });
  }

  async findActive() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  async validateCode(code: string, subtotal: number) {
    const now = new Date();
    const promo = await this.prisma.promotion.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promo || !promo.isActive) {
      throw new NotFoundException(`Kode promo '${code}' tidak ditemukan atau sudah tidak aktif`);
    }

    if (promo.startDate > now || promo.endDate < now) {
      throw new BadRequestException(`Kode promo '${code}' sudah kedaluwarsa`);
    }

    if (promo.minPurchase && subtotal < Number(promo.minPurchase)) {
      throw new BadRequestException(
        `Minimal pembelanjaan untuk promo ini adalah Rp${Number(promo.minPurchase).toLocaleString('id-ID')}`,
      );
    }

    let discountAmount = 0;
    if (promo.type === 'PERCENTAGE') {
      discountAmount = (subtotal * Number(promo.value)) / 100;
    } else {
      discountAmount = Number(promo.value);
    }

    return {
      isValid: true,
      code: promo.code,
      name: promo.name,
      discountAmount,
      finalSubtotal: Math.max(0, subtotal - discountAmount),
    };
  }

  async create(dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }
}
