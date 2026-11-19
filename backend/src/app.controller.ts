import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health & System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Cek status kesehatan server dan koneksi database MySQL' })
  @ApiResponse({ status: 200, description: 'Sistem operasional dan terhubung' })
  async getHealth() {
    return this.appService.getHealthStatus();
  }
}
