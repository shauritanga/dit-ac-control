import { Module } from '@nestjs/common';
import { CommandsModule } from '../commands/commands.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';

@Module({
  imports: [CommandsModule, RealtimeModule],
  controllers: [IotController],
  providers: [IotService]
})
export class IotModule {}
