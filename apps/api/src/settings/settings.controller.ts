import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateSettingsDto } from './settings.dto';
import { SettingsService } from './settings.service';

@ApiBearerAuth()
@ApiTags('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  @Roles('ADMIN')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto.tariffTzsPerKwh);
  }
}
