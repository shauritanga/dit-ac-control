import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { DevicesService } from './devices.service';
import { ProvisionIotDeviceDto, RotateIotDeviceTokenDto } from './dto';

/**
 * Admin endpoints to register ESP32 controllers for real fleet use.
 * Device tokens are returned only at provision / rotate time.
 */
@ApiBearerAuth()
@ApiTags('iot-devices')
@UseGuards(JwtAuthGuard)
@Controller('iot-devices')
export class IotDevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  list() {
    return this.devices.listIotDevices();
  }

  @Post()
  provision(@Body() dto: ProvisionIotDeviceDto) {
    return this.devices.provisionIotDevice(dto);
  }

  @Post(':id/rotate-token')
  rotateToken(@Param('id') id: string, @Body() dto: RotateIotDeviceTokenDto) {
    return this.devices.rotateIotDeviceToken(id, dto);
  }
}
