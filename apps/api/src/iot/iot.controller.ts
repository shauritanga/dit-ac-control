import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandAckDto, DeviceCheckinDto, TelemetryIngestDto } from './iot.dto';
import { IotService } from './iot.service';

/**
 * Open IoT ingest for the prototype (no JWT, no device token).
 * Final-year university project — not for production security.
 */
@ApiTags('iot')
@Controller('iot')
export class IotController {
  constructor(private readonly iot: IotService) {}

  @Post('telemetry')
  telemetry(@Body() dto: TelemetryIngestDto) {
    return this.iot.ingestTelemetry(dto);
  }

  @Post('checkin')
  checkin(@Body() dto: DeviceCheckinDto) {
    return this.iot.checkin(dto);
  }

  @Post('commands/:id/ack')
  acknowledge(@Param('id') id: string, @Body() dto: CommandAckDto) {
    return this.iot.acknowledge(id, dto);
  }
}
