import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { ClientContactsService } from './client-contacts.service';
import { ClientContactsController } from './client-contacts.controller';

@Module({
  imports: [
    ClientAuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [ClientContactsController],
  providers: [ClientContactsService],
  exports: [ClientContactsService],
})
export class ClientContactsModule {}
