import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterUserDto, LoginUserDto } from './dto/auth.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
  ApiPropertyOptions,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { User } from '../entities/user.entity';

export class TokenResponseDto {
  @ApiProperty({
    type: String,
    description: 'JWT token for API access',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  } as ApiPropertyOptions)
  token: string;
}

export class GenerateApiTokenDto {
  @ApiProperty({
    type: String,
    description: 'Name of the service requesting access',
    example: 'ai-service',
  } as ApiPropertyOptions)
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiProperty({
    type: String,
    description: 'Service key for authentication (from ZENITH_API_KEY env var)',
    example: 'your-service-key-here',
  } as ApiPropertyOptions)
  @IsString()
  @IsNotEmpty()
  serviceKey: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  @ApiResponse({ status: 400, description: 'Bad Request (validation failed).' })
  async register(@Body() registerUserDto: RegisterUserDto) {
    const user = await this.authService.register(registerUserDto);
    // Avoid returning sensitive info like password hash if AuthService didn't already remove it
    const { passwordHash, ...result } = user;
    return result;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK) // Return 200 OK on successful login
  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access token and user info',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (invalid credentials).',
  })
  async login(@Request() req) {
    // req.user is populated by LocalAuthGuard/LocalStrategy
    return this.authService.login(req.user);
  }

  // Example protected route using JwtAuthGuard
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@Request() req) {
    // req.user is populated by JwtAuthGuard/JwtStrategy
    return req.user;
  }

  @Post('token')
  @ApiOperation({
    summary: 'Generate API token for service',
    description: `
      Generates a JWT token for service-to-service authentication.
      The service key must match the ZENITH_API_KEY environment variable.
      The generated token should be used in the Authorization header as "Bearer <token>" for subsequent requests.
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Token generated successfully',
    type: TokenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input - service name or key is missing',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid service key',
  })
  async generateToken(
    @Body() generateApiTokenDto: GenerateApiTokenDto,
  ): Promise<TokenResponseDto> {
    const expectedServiceKey =
      process.env.ZENITH_API_KEY || 'your-service-key-here';

    if (generateApiTokenDto.serviceKey !== expectedServiceKey) {
      throw new UnauthorizedException('Invalid service key');
    }

    const token = this.authService.generateApiToken(
      generateApiTokenDto.serviceName,
    );
    return { token };
  }
}
