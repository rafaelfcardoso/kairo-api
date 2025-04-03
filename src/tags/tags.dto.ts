import { IsString, IsHexColor, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({
    example: 'Important',
    description: 'The name of the tag',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '#FF0000',
    description: 'The color of the tag in hex format',
  })
  @IsHexColor()
  color: string;

  @ApiProperty({
    example: 'For high-priority items',
    description: 'Optional description of the tag',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTagDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsHexColor()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
