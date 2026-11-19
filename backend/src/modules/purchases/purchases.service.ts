import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseDto, ReceiveGoodsDto } from './dto/purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { branchId?: string; status?: string }) {
    const { branchId, status } = params || {};
    return this.prisma.purchase.findMany({
      where: {
        branchId: branchId || undefined,
        status: status || undefined,
      },
      orderBy: { orderDate: 'desc' },
      include: {
        supplier: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase Order dengan ID ${id} tidak ditemukan`);
    }

    return purchase;
  }

  async create(userId: string, branchId: string, dto: CreatePurchaseDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Purchase order minimal harus memiliki 1 item obat');
    }

    // Generate PO Number: PO-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-${dateStr}-${randomSuffix}`;

    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    return this.prisma.purchase.create({
      data: {
        poNumber,
        branchId,
        supplierId: dto.supplierId,
        orderDate: new Date(),
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        totalAmount,
        status: 'ORDERED',
        notes: dto.notes,
        createdBy: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
            receivedQuantity: 0,
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });
  }

  async receiveGoods(
    purchaseId: string,
    userId: string,
    branchId: string,
    dto: ReceiveGoodsDto,
  ) {
    const po = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true, supplier: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order tidak ditemukan');
    }

    if (po.status === 'RECEIVED') {
      throw new BadRequestException('Purchase Order ini sudah diterima sebelumnya');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const poItem = po.items.find((i) => i.id === item.purchaseItemId);
        if (!poItem) {
          throw new BadRequestException(
            `Item dengan ID ${item.purchaseItemId} tidak terdaftar dalam PO ini`,
          );
        }

        // 1. Create Product Batch
        const newBatch = await tx.productBatch.create({
          data: {
            productId: poItem.productId,
            supplierId: po.supplierId,
            batchNumber: item.batchNumber,
            mfgDate: new Date(item.mfgDate),
            expDate: new Date(item.expDate),
            initialQuantity: item.receivedQuantity,
            currentQuantity: item.receivedQuantity,
            buyPrice: poItem.unitPrice,
            status: 'ACTIVE',
          },
        });

        // 2. Update PO Item receivedQuantity
        await tx.purchaseItem.update({
          where: { id: poItem.id },
          data: { receivedQuantity: item.receivedQuantity },
        });

        // 3. Update or Create Branch Inventory
        const currentInv = await tx.inventory.findFirst({
          where: { branchId, productId: poItem.productId },
        });

        const currentStock = currentInv ? currentInv.totalStock : 0;
        const newStock = currentStock + item.receivedQuantity;

        if (currentInv) {
          await tx.inventory.update({
            where: { id: currentInv.id },
            data: { totalStock: newStock },
          });
        } else {
          await tx.inventory.create({
            data: {
              branchId,
              productId: poItem.productId,
              totalStock: newStock,
            },
          });
        }

        // 4. Record Inventory Movement (PURCHASE_RECEIVE)
        await tx.inventoryMovement.create({
          data: {
            branchId,
            productId: poItem.productId,
            batchId: newBatch.id,
            type: 'PURCHASE_RECEIVE',
            quantity: item.receivedQuantity,
            previousStock: currentStock,
            finalStock: newStock,
            referenceId: po.poNumber,
            notes: `Penerimaan barang dari PO ${po.poNumber} Batch ${item.batchNumber}`,
            createdBy: userId,
          },
        });
      }

      // Update PO status to RECEIVED
      const updatedPo = await tx.purchase.update({
        where: { id: purchaseId },
        data: { status: 'RECEIVED' },
        include: {
          items: { include: { product: true } },
          supplier: true,
        },
      });

      return {
        success: true,
        message: 'Barang berhasil diterima, batch baru dan stok gudang telah terbarui',
        purchase: updatedPo,
      };
    });
  }
}
