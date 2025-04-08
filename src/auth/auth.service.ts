import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RegisterUserDto, LoginUserDto } from './dto/auth.dto'; // Import DTOs

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService, // Keep ConfigService if needed elsewhere
  ) {}

  async register(registerUserDto: RegisterUserDto): Promise<User> {
    const { email, password, name } = registerUserDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const saltRounds = 10; // Or get from config
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create and save user
    const newUser = this.userRepository.create({
      email,
      passwordHash: hashedPassword,
      name,
      // googleId and appleId will be null initially
    });

    await this.userRepository.save(newUser);

    // Don't return password hash
    delete newUser.passwordHash;
    return newUser;
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && user.passwordHash) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        // Exclude password hash from the result
        const { passwordHash, ...result } = user;
        return result;
      }
    }
    // Return null if user not found or password doesn't match
    return null;
  }

  async login(user: User) {
    // User object comes from LocalAuthGuard after validateUser succeeds
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        // Add other relevant user fields
      },
    };
  }

  // Keep existing methods if they are still needed
  generateApiToken(serviceName: string): string {
    const payload = {
      sub: 'api-service',
      name: serviceName,
      type: 'service',
    };

    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): any {
    return this.jwtService.verify(token);
  }
}
