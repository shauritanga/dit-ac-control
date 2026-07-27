import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CommandDto } from './dto';
import { CommandsService } from './commands.service';

@ApiBearerAuth()
@ApiTags('commands')
@UseGuards(JwtAuthGuard)
@Controller('ac-units/:acUnitId/commands')
export class CommandsController {
  constructor(private readonly commands: CommandsService) {}

  @Post()
  issue(
    @Param('acUnitId') acUnitId: string,
    @Body() dto: CommandDto,
    @Request() req: { user: { sub: string } }
  ) {
    return this.commands.issue(acUnitId, req.user.sub, dto);
  }
}
