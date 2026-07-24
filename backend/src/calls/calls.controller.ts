import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtStrategyGuard } from '../auth/jwt.guard';
import { CallsService } from './calls.service';
import { TestCallDto } from './test-call.dto';

@Controller('calls')
@UseGuards(JwtStrategyGuard)
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Post('test')
  test(@Body() dto: TestCallDto) {
    return this.callsService.initiateTestCall(dto.toNumber, dto.voiceoverId);
  }

  @Get('logs')
  logs() {
    return this.callsService.listCallLogs();
  }
}
