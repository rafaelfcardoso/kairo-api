import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAppCategoryDto {
  @ApiProperty({
    description: 'System identifier for the app category',
    example: 'SOCIAL_NETWORKING',
  })
  @IsString()
  systemId: string;

  @ApiProperty({
    description: 'User-friendly name for the app category',
    example: 'Social Networking',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the app category',
    example: 'Apps that focus on social interaction',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the app category is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
