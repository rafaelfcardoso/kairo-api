import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
  ApiPropertyOptions,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
