import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TelemetryService } from './telemetry.service';

@ApiBearerAuth()
@ApiTags('telemetry')
@UseGuards(JwtAuthGuard)
@Controller('ac-units/:acUnitId/telemetry')
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @Get()
  history(
    @Param('acUnitId') acUnitId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('powerState') powerState?: string,
  ) {
    return this.telemetry.history(acUnitId, {
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 10),
      from,
      to,
      powerState,
    });
  }
}
