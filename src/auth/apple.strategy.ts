import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  private readonly logger = new Logger(AppleStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Get configuration values before calling super
    const clientID = configService.get<string>('apple.clientID');
    const teamID = configService.get<string>('apple.teamID');
    const keyID = configService.get<string>('apple.keyID');
    const privateKeyPath = configService.get<string>('apple.privateKeyPath');
    const callbackURL =
      configService.get<string>('apple.callbackURL') ||
      'http://localhost:3001/auth/apple/callback';
    const privateKeyBase64 = process.env.APPLE_PRIVATE_KEY_BASE64;

    // Prepare private key location
    let privateKeyLocation = privateKeyPath;

    // If we have a Base64 encoded key, decode it and write it to a temporary file
    if (
      privateKeyBase64 &&
      (!privateKeyPath || privateKeyPath === './dummy-key.p8')
    ) {
      try {
        // Create a temporary file for the key
        const tempDir = os.tmpdir();
        const keyPath = path.join(tempDir, `apple_key_${Date.now()}.p8`);

        // Decode and write the key
        const keyBuffer = Buffer.from(privateKeyBase64, 'base64');
        fs.writeFileSync(keyPath, keyBuffer, { mode: 0o600 }); // Secure permissions

        // Use the temporary file path
        privateKeyLocation = keyPath;
      } catch (error) {
        console.error('Failed to decode Base64 private key', error);
      }
    }

    // Call super with the configuration
    super({
      clientID: clientID || 'dummy-apple-client-id',
      teamID: teamID || 'dummy-team-id',
      keyID: keyID || 'dummy-key-id',
      privateKeyLocation: privateKeyLocation || './dummy-key.p8',
      callbackURL,
      passReqToCallback: true,
    });

    // Log configuration status after initialization
    if (
      !clientID ||
      !teamID ||
      !keyID ||
      (!privateKeyPath && !privateKeyBase64)
    ) {
      this.logger.warn(
        `Apple authentication is not fully configured. Missing: ${[
          !clientID ? 'APPLE_CLIENT_ID' : '',
          !teamID ? 'APPLE_TEAM_ID' : '',
          !keyID ? 'APPLE_KEY_ID' : '',
          !privateKeyPath && !privateKeyBase64
            ? 'APPLE_PRIVATE_KEY_PATH or APPLE_PRIVATE_KEY_BASE64'
            : '',
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
      this.logger.warn(
        'Apple authentication will be available but non-functional',
      );
    } else {
      if (
        privateKeyBase64 &&
        (!privateKeyPath || privateKeyPath === './dummy-key.p8')
      ) {
        this.logger.log('Using Base64 encoded private key');
      }
      this.logger.log('Apple authentication strategy initialized successfully');
    }
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
