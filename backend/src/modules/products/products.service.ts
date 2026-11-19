import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    search?: string;
    categoryId?: string;
    isPrescriptionRequired?: boolean;
    branchId?: string;
    lowStockOnly?: boolean;
  }) {
    const { search, categoryId, isPrescriptionRequired, branchId, lowStockOnly } = params || {};

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
        { brand: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isPrescriptionRequired !== undefined) {
      where.isPrescriptionRequired = isPrescriptionRequired;
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventories: branchId
          ? { where: { branchId } }
          : true,
        batches: {
          where: {
            currentQuantity: { gt: 0 },
            status: 'ACTIVE',
          },
          orderBy: { expDate: 'asc' },
          take: 3,
        },
      },
    });

    const mapped = products.map((prod) => {
      const totalStock = prod.inventories.reduce((acc, inv) => acc + inv.totalStock, 0);
      const isLowStock = totalStock <= prod.minStock;
      const nearestExpDate = prod.batches.length > 0 ? prod.batches[0].expDate : null;

      return {
        ...prod,
        totalStock,
        isLowStock,
        nearestExpDate,
      };
    });

    if (lowStockOnly) {
      return mapped.filter((p) => p.isLowStock);
    }

    return mapped;
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ barcode }, { sku: barcode }],
      },
      include: {
        category: true,
        inventories: true,
        batches: {
          where: {
            currentQuantity: { gt: 0 },
            status: 'ACTIVE',
          },
          orderBy: { expDate: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan barcode '${barcode}' tidak ditemukan`);
    }

    const totalStock = product.inventories.reduce((acc, inv) => acc + inv.totalStock, 0);
    return {
      ...product,
      totalStock,
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventories: {
          include: { branch: true },
        },
        batches: {
          orderBy: { expDate: 'asc' },
          include: { supplier: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
    }

    const totalStock = product.inventories.reduce((acc, inv) => acc + inv.totalStock, 0);
    return {
      ...product,
      totalStock,
    };
  }

  async create(dto: CreateProductDto) {
    // Generate SKU if not provided
    const sku =
      dto.sku ||
      `MED-${dto.name.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Generate Barcode if not provided (Indonesian GS1 prefix 899)
    const barcode =
      dto.barcode ||
      `899${Math.floor(100000000 + Math.random() * 900000000)}`;

    const existingSku = await this.prisma.product.findUnique({
      where: { sku },
    });
    if (existingSku) {
      throw new ConflictException(`Produk dengan SKU '${sku}' sudah terdaftar`);
    }

    const existingBarcode = await this.prisma.product.findUnique({
      where: { barcode },
    });
    if (existingBarcode) {
      throw new ConflictException(`Produk dengan Barcode '${barcode}' sudah terdaftar`);
    }

    return this.prisma.product.create({
      data: {
        ...dto,
        sku,
        barcode,
      },
      include: {
        category: true,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
