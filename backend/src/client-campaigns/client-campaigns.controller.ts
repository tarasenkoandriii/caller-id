import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClientJwtGuard } from '../client-auth/client-jwt.guard';
import { ClientUser } from '../client-auth/client-user.decorator';
import { ClientCampaignsService } from './client-campaigns.service';
import { CreateCampaignDto } from './create-campaign.dto';
import { CallsService } from '../calls/calls.service';

@Controller('api/client-campaigns')
@UseGuards(ClientJwtGuard)
export class ClientCampaignsController {
  constructor(
    private campaignsService: ClientCampaignsService,
    private callsService: CallsService,
  ) {}

  // /logs объявлен ДО /:id, иначе Express принял бы 'logs' за :id
  @Get('logs')
  logs(@ClientUser() user: { sub: string }) {
    return this.callsService.listCallLogsForOwner(user.sub);
  }

  @Get()
  list(@ClientUser() user: { sub: string }) {
    return this.campaignsService.listForOwner(user.sub);
  }

  @Post()
  create(@ClientUser() user: { sub: string }, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.sub, dto);
  }

  @Delete(':id')
  cancel(@ClientUser() user: { sub: string }, @Param('id') id: string) {
    return this.campaignsService.cancel(user.sub, id);
  }
}
