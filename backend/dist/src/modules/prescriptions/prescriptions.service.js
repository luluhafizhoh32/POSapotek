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
exports.PrescriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PrescriptionsService = class PrescriptionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(params) {
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Resep dengan ID ${id} tidak ditemukan`);
        }
        return prescription;
    }
    async create(branchId, dto) {
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('Resep minimal harus memiliki 1 obat');
        }
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
    async verify(id, pharmacistId, dto) {
        const prescription = await this.findOne(id);
        if (prescription.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Resep sudah berstatus ${prescription.status}`);
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
    async dispense(id, pharmacistId) {
        const prescription = await this.findOne(id);
        if (prescription.status !== 'VERIFIED') {
            throw new common_1.BadRequestException('Hanya resep yang telah diverifikasi apoteker yang dapat diserahkan (dispensed)');
        }
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
};
exports.PrescriptionsService = PrescriptionsService;
exports.PrescriptionsService = PrescriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrescriptionsService);
//# sourceMappingURL=prescriptions.service.js.map