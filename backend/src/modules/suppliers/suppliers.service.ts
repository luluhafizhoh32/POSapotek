import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            productBatches: true,
            purchases: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          take: 10,
          orderBy: { orderDate: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier dengan ID ${id} tidak ditemukan`);
    }

    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Supplier dengan kode '${dto.code}' sudah terdaftar`);
    }

    return this.prisma.supplier.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}
