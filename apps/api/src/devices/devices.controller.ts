import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { DevicesService } from './devices.service';

@ApiBearerAuth()
@ApiTags('ac-units')
@UseGuards(JwtAuthGuard)
@Controller('ac-units')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  list(@Query('q') q?: string, @Query('status') status?: string) {
    return this.devices.list({ q, status });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.devices.detail(id);
  }
}
