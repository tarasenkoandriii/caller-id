import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtStrategyGuard } from '../auth/jwt.guard';
import { TelnyxAccountsService } from './telnyx-accounts.service';
import { TelnyxSettingsService } from './telnyx-settings.service';
import { CreateTelnyxAccountDto } from './create-telnyx-account.dto';

@Controller('telnyx-accounts')
@UseGuards(JwtStrategyGuard)
export class TelnyxAccountsController {
  constructor(
    private accountsService: TelnyxAccountsService,
    private settingsService: TelnyxSettingsService,
  ) {}

  // Статические маршруты /vpn/* объявлены ДО /:id/*, иначе Express
  // сопоставил бы 'vpn' с параметром :id.
  @Get('vpn')
  getVpnState() {
    return this.settingsService.getState();
  }

  @Patch('vpn/enabled')
  setVpnEnabled(@Body('enabled') enabled: boolean) {
    return this.settingsService.setEnabled(enabled);
  }

  @Get()
  list() {
    return this.accountsService.listWithStats();
  }

  @Post()
  create(@Body() dto: CreateTelnyxAccountDto) {
    return this.accountsService.create(dto.label, dto.apiKey, dto.connectionId);
  }

  @Patch(':id/enabled')
  setEnabled(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.accountsService.setEnabled(id, enabled);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string) {
    return this.accountsService.setActive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountsService.remove(id);
  }
}
