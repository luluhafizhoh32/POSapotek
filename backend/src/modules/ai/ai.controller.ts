import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CheckDrugInteractionDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI Intelligence & Analytics')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('forecast')
  @ApiOperation({
    summary: 'AI Fitur 1: Prediksi Kebutuhan Stok (Demand Forecasting 7, 14, 30 hari & ROP)',
  })
  @ApiQuery({ name: 'branchId', required: false })
  async getDemandForecasting(@CurrentUser('branchId') userBranchId: string) {
    return this.aiService.getDemandForecasting(userBranchId);
  }

  @Post('drug-interactions')
  @ApiOperation({
    summary: 'AI Fitur 2: Analisis Klinis Interaksi Obat & Skrining Resep (Severity HIGH/MODERATE/LOW)',
  })
  async checkDrugInteractions(@Body() dto: CheckDrugInteractionDto) {
    return this.aiService.checkDrugInteractions(dto.productIds);
  }

  @Get('rfm-segmentation')
  @ApiOperation({
    summary: 'AI Fitur 3: Segmentasi Pelanggan Otomatis (Metode RFM: Champions, Loyal, At-Risk, Hibernating)',
  })
  async getCustomerSegmentation() {
    return this.aiService.getCustomerSegmentation();
  }
}
