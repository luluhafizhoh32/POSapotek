import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrescriptionDto, VerifyPrescriptionDto } from './dto/prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { branchId?: string; status?: string }) {
    const { branchId, status } = params || {};
    return this.prisma.prescription.findMany({
      where: {
        branchId: branchId || undefined,
        status: status || undefined,
      },
      orderBy: { prescriptionDate: 'desc' },
      include: {
        customer: true,
        pharmacist: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, dosageForm: true, unit: true, sellPrice: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        customer: true,
        pharmacist: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Resep dengan ID ${id} tidak ditemukan`);
    }

    return prescription;
  }

  async create(branchId: string, dto: CreatePrescriptionDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Resep minimal harus memiliki 1 obat');
    }

    // Generate Prescription Number: RX-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prescriptionNumber = `RX-${dateStr}-${randomSuffix}`;

    return this.prisma.prescription.create({
      data: {
        prescriptionNumber,
        branchId,
        customerId: dto.customerId || null,
        doctorName: dto.doctorName,
        doctorSip: dto.doctorSip,
        prescriptionDate: new Date(),
        status: 'PENDING',
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            dosage: i.dosage,
            dosageInstructions: i.dosageInstructions,
            quantity: i.quantity,
            isDispensed: false,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });
  }

  async verify(id: string, pharmacistId: string, dto: VerifyPrescriptionDto) {
    const prescription = await this.findOne(id);

    if (prescription.status !== 'PENDING') {
      throw new BadRequestException(`Resep sudah berstatus ${prescription.status}`);
    }

    return this.prisma.prescription.update({
      where: { id },
      data: {
        status: dto.status,
        pharmacistId,
        notes: dto.clinicalNotes
          ? `${prescription.notes || ''} [Catatan Apoteker: ${dto.clinicalNotes}]`.trim()
          : prescription.notes,
      },
      include: {
        customer: true,
        pharmacist: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });
  }

  async dispense(id: string, pharmacistId: string) {
    const prescription = await this.findOne(id);

    if (prescription.status !== 'VERIFIED') {
      throw new BadRequestException(
        'Hanya resep yang telah diverifikasi apoteker yang dapat diserahkan (dispensed)',
      );
    }

    // Mark prescription and items as dispensed
    return this.prisma.$transaction(async (tx) => {
      await tx.prescriptionItem.updateMany({
        where: { prescriptionId: id },
        data: { isDispensed: true },
      });

      return tx.prescription.update({
        where: { id },
        data: {
          status: 'DISPENSED',
          pharmacistId,
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });
    });
  }
}
