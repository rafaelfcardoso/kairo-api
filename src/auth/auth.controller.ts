import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  Req,
  Param,
  Inject,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
  ApiPropertyOptions,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { User } from './entities/user.entity';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
    description:
      'Service key for authentication (from API_SERVICE_KEY env var)',
    example: 'your-service-key-here',
  } as ApiPropertyOptions)
  @IsString()
  @IsNotEmpty()
  serviceKey: string;
}

export class RegisterUserDto {
  @ApiProperty({
    type: String,
    description: 'User email',
    example: 'user@example.com',
  } as ApiPropertyOptions)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    type: String,
    description: 'User password',
    example: 'password123',
  } as ApiPropertyOptions)
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginUserDto {
  @ApiProperty({
    type: String,
    description: 'User email',
    example: 'user@example.com',
  } as ApiPropertyOptions)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    type: String,
    description: 'User password',
    example: 'password123',
  } as ApiPropertyOptions)
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UserResponseDto {
  @ApiProperty({
    type: String,
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  } as ApiPropertyOptions)
  id: string;

  @ApiProperty({
    type: String,
    description: 'User email',
    example: 'user@example.com',
  } as ApiPropertyOptions)
  email: string;

  @ApiProperty({
    type: String,
    description: 'User first name',
    example: 'John',
    required: false,
  } as ApiPropertyOptions)
  firstName?: string;

  @ApiProperty({
    type: String,
    description: 'User last name',
    example: 'Doe',
    required: false,
  } as ApiPropertyOptions)
  lastName?: string;

  @ApiProperty({
    type: Date,
    description: 'User creation date',
    example: '2023-01-01T00:00:00.000Z',
  } as ApiPropertyOptions)
  createdAt: Date;

  @ApiProperty({
    type: Date,
    description: 'User last update date',
    example: '2023-01-01T00:00:00.000Z',
  } as ApiPropertyOptions)
  updatedAt: Date;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('token')
  @ApiOperation({
    summary: 'Generate API token for service',
    description: `
      Generates a JWT token for service-to-service authentication.
      The service key must match the API_SERVICE_KEY environment variable.
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
      process.env.API_SERVICE_KEY || 'your-service-key-here';

    if (generateApiTokenDto.serviceKey !== expectedServiceKey) {
      throw new UnauthorizedException('Invalid service key');
    }

    const token = this.authService.generateApiToken(
      generateApiTokenDto.serviceName,
    );
    return { token };
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Register a new user with email and password',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input - email or password is missing or invalid',
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<void> {
    return this.authService.register(
      registerUserDto.email,
      registerUserDto.password,
    );
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description: 'Login with email and password to get a JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: TokenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input - email or password is missing or invalid',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  async login(@Body() loginUserDto: LoginUserDto): Promise<TokenResponseDto> {
    return this.authService.login(loginUserDto.email, loginUserDto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get the current user details based on JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getMe(@GetUser() user: User): Promise<UserResponseDto> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get('token-proxy/:endpoint')
  @ApiOperation({
    summary: 'API Token proxy for troubleshooting',
    description:
      'A helper endpoint for diagnostics and troubleshooting JWT token issues. ' +
      'This endpoint is mainly used by the helper page and is not required for ' +
      'normal Swagger UI operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Proxied response from the endpoint',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - token is missing or invalid',
  })
  async tokenProxy(
    @Param('endpoint') endpoint: string,
    @Req() req: Request,
  ): Promise<any> {
    console.log('Token proxy request received for endpoint:', endpoint);
    console.log('Request headers:', req.headers);
    console.log('Request query:', req.query);

    // Get token from multiple sources
    let token = req.query.token as string;

    // Check authorization header if no token in query
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization as string;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log(
          'Found token in Authorization header:',
          token.substring(0, 15) + '...',
        );
      }
    }

    // Check cookies if still no token
    if (!token && req.cookies) {
      token =
        req.cookies.swagger_authorization ||
        req.cookies.token ||
        req.cookies.access_token;

      if (token) {
        console.log('Found token in cookies:', token.substring(0, 15) + '...');
      }
    }

    if (!token) {
      console.error('No token found in request');
      throw new UnauthorizedException('Token is required');
    }

    // Validate the token first
    try {
      console.log('Validating token:', token.substring(0, 15) + '...');
      const payload = this.authService.verifyToken(token);
      console.log('Token validated successfully. Payload:', payload);

      // Try to find the user
      let user: User;
      try {
        user = await this.userRepository.findOne({
          where: { id: payload.sub },
        });

        if (!user) {
          console.error(`User not found for ID: ${payload.sub}`);
          throw new UnauthorizedException('User not found');
        }

        console.log(`Found user: ${user.email} (${user.id})`);

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          tokenPayload: payload,
        };
      } catch (dbError) {
        console.error('Database error when finding user:', dbError);
        throw new UnauthorizedException('Error retrieving user');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
