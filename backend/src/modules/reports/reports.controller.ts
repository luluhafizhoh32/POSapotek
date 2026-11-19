import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports & Dashboard')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('OWNER', 'MANAGER', 'ADMIN', 'KASIR', 'APOTEKER', 'GUDANG')
  @ApiOperation({
    summary: 'Metrik Dashboard Lengkap (Omzet hari ini, Laba kotor, Tren 7 hari, Top 5 obat terlaris, & Alert stok)',
  })
  @ApiQuery({ name: 'branchId', required: false })
  async getDashboardSummary(@CurrentUser('branchId') userBranchId: string) {
    return this.reportsService.getDashboardSummary(userBranchId);
  }
}
