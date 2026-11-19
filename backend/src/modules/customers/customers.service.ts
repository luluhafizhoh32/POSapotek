import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            sales: true,
            prescriptions: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: { product: true },
            },
          },
        },
        prescriptions: {
          take: 5,
          orderBy: { prescriptionDate: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Pelanggan dengan ID ${id} tidak ditemukan`);
    }

    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException(`Pelanggan dengan nomor telepon '${dto.phone}' sudah terdaftar`);
    }

    return this.prisma.customer.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
