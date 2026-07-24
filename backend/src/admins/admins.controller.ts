import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtStrategyGuard } from '../auth/jwt.guard';
import { AdminsService } from './admins.service';

@Controller('admins')
@UseGuards(JwtStrategyGuard)
export class AdminsController {
  constructor(private adminsService: AdminsService) {}

  @Get()
  list() {
    return this.adminsService.list();
  }
}
