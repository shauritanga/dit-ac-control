import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { IotDevicesController } from './iot-devices.controller';

@Module({
  controllers: [DevicesController, IotDevicesController],
  providers: [DevicesService],
  exports: [DevicesService]
})
export class DevicesModule {}
