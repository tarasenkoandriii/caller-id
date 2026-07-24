import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtStrategyGuard } from '../auth/jwt.guard';
import { PoolService } from './pool.service';
import { OrderNumberDto } from './order-number.dto';

@Controller('pool')
@UseGuards(JwtStrategyGuard)
export class PoolController {
  constructor(private poolService: PoolService) {}

  @Get('status')
  getStatus() {
    return this.poolService.getStatus();
  }

  @Get('numbers')
  listNumbers() {
    return this.poolService.listNumbers();
  }

  @Post('numbers/order')
  orderNumber(@Body() dto: OrderNumberDto) {
    return this.poolService.provisionNewNumber(dto.provider, dto.number);
  }
}
