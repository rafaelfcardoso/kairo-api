import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('apple.clientID'),
      teamID: configService.get<string>('apple.teamID'),
      keyID: configService.get<string>('apple.keyID'),
      privateKeyLocation: configService.get<string>('apple.privateKeyPath'),
      callbackURL: configService.get<string>('apple.callbackURL'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: any,
    done: (error: any, user?: any, info?: any) => void,
  ) {
    // Extract user data from the Apple payload
    // Apple doesn't provide much user info, so we need to extract from the idToken or the request
    let email = '';
    let name = '';

    // If it's the first authentication, Apple sends user data in the request body
    if (req.body && req.body.user) {
      const user = JSON.parse(req.body.user);
      name = user.name ? `${user.name.firstName} ${user.name.lastName}` : '';
      email = user.email || '';
    }

    // For subsequent logins, we need to use the Apple ID from the profile
    const appleId = profile.id;

    // Try to authenticate with the Apple ID
    const user = await this.authService.validateAppleUser(appleId, email, name);

    return done(null, user);
  }
}
