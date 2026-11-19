import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar semua pelanggan apotek' })
  @ApiQuery({ name: 'search', required: false, description: 'Cari nama atau no telp pelanggan' })
  async findAll(@Query('search') search?: string) {
    return this.customersService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail pelanggan beserta riwayat pembelian' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles('OWNER', 'MANAGER', 'ADMIN', 'KASIR', 'APOTEKER')
  @ApiOperation({ summary: 'Tambah pelanggan baru' })
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Put(':id')
  @Roles('OWNER', 'MANAGER', 'ADMIN', 'KASIR')
  @ApiOperation({ summary: 'Perbarui data pelanggan' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Hapus data pelanggan' })
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
