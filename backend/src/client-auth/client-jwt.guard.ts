import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Отдельный guard для клиентской страницы "/" — токен должен быть подписан
 * тем же JWT_SECRET, но с role: 'client'. Так админский токен (role: 'admin')
 * не даёт доступа к клиентским эндпоинтам и наоборот — это два разных
 * контура авторизации на одном бэкенде.
 */
@Injectable()
export class ClientJwtGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен отсутствует');
    }
    const token = authHeader.slice(7);
    try {
      const payload = await this.jwt.verifyAsync(token);
      if (payload.role !== 'client') {
        throw new UnauthorizedException('Токен не для клиентской страницы');
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Невалидный или истёкший токен');
    }
  }
}
