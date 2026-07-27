import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';

@Module({
  imports: [RealtimeModule],
  controllers: [CommandsController],
  providers: [CommandsService],
  exports: [CommandsService]
})
export class CommandsModule {}
