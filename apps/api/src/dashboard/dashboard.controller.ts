import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { DashboardService, type EnergyPeriod } from './dashboard.service';

@ApiBearerAuth()
@ApiTags('dashboard')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboard.summary();
  }

  @Get('overview')
  overview() {
    return this.dashboard.overview();
  }

  @Get('energy-report')
  energyReport(@Query('period') period?: string) {
    const value: EnergyPeriod =
      period === 'week' || period === 'month' ? period : 'today';
    return this.dashboard.energyReport(value);
  }
}
