import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: (req) => {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        this.logger.debug(
          `Extracted token: ${token ? 'Token found' : 'No token found'}`,
        );
        this.logger.debug(`Request headers: ${JSON.stringify(req.headers)}`);
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: any) {
    this.logger.debug(`Validating token payload: ${JSON.stringify(payload)}`);

    // For service tokens
    if (payload.sub === 'service') {
      return { userId: 'service', username: payload.username };
    }

    // For user tokens
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      this.logger.warn(`User not found for id: ${payload.sub}`);
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
