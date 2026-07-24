import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClientJwtGuard } from '../client-auth/client-jwt.guard';
import { ClientUser } from '../client-auth/client-user.decorator';
import { ClientContactsService } from './client-contacts.service';
import { CreateClientContactDto } from './create-client-contact.dto';

@Controller('api/client-contacts')
@UseGuards(ClientJwtGuard)
export class ClientContactsController {
  constructor(private contactsService: ClientContactsService) {}

  @Get()
  list(@ClientUser() user: { sub: string }) {
    return this.contactsService.list(user.sub);
  }

  @Post()
  add(@ClientUser() user: { sub: string }, @Body() dto: CreateClientContactDto) {
    return this.contactsService.add(user.sub, dto.phoneNumber);
  }

  @Delete(':id')
  remove(@ClientUser() user: { sub: string }, @Param('id') id: string) {
    return this.contactsService.remove(user.sub, id);
  }
}
