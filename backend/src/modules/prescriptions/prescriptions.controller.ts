import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto, VerifyPrescriptionDto } from './dto/prescription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Prescriptions (Resep Dokter & Apoteker)')
@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar antrean resep dokter (Pending, Verified, Dispensed, Rejected)' })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @CurrentUser('branchId') branchId: string,
    @Query('status') status?: string,
  ) {
    return this.prescriptionsService.findAll({ branchId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail resep dokter, item racikan, dan status apoteker' })
  async findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Post()
  @Roles('OWNER', 'MANAGER', 'KASIR', 'APOTEKER', 'ADMIN')
  @ApiOperation({ summary: 'Input resep dokter baru' })
  async create(
    @CurrentUser('branchId') branchId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(branchId, dto);
  }

  @Post(':id/verify')
  @Roles('OWNER', 'APOTEKER')
  @ApiOperation({ summary: 'Verifikasi klinis resep oleh Apoteker (Approve / Reject)' })
  async verify(
    @Param('id') id: string,
    @CurrentUser('id') pharmacistId: string,
    @Body() dto: VerifyPrescriptionDto,
  ) {
    return this.prescriptionsService.verify(id, pharmacistId, dto);
  }

  @Post(':id/dispense')
  @Roles('OWNER', 'APOTEKER')
  @ApiOperation({ summary: 'Dispensing / penyerahan obat resep ke pasien' })
  async dispense(
    @Param('id') id: string,
    @CurrentUser('id') pharmacistId: string,
  ) {
    return this.prescriptionsService.dispense(id, pharmacistId);
  }
}
