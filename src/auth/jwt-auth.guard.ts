import {
  Injectable,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    this.logger.debug(`Authenticating request to ${request.url}`);
    this.logger.debug(
      `Authorization header: ${request.headers.authorization || 'MISSING'}`,
    );

    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ) {
    if (err || !user) {
      this.logger.warn(
        `Authentication failed: ${info?.message || err?.message || 'Unknown reason'}`,
      );
      this.logger.debug(
        `Authentication error details: ${JSON.stringify(info || err || {})}`,
      );

      throw (
        err ||
        new UnauthorizedException('Invalid token or authentication failed')
      );
    }

    this.logger.debug(
      `Authentication successful for user: ${user.email || user.username || user.id}`,
    );
    return user;
  }
}
