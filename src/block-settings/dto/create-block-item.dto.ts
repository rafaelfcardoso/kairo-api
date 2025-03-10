import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { BlockItemType } from '../entities/block-item.entity';

export class CreateBlockItemDto {
  @ApiProperty({
    description: 'Type of the block item',
    enum: BlockItemType,
    example: 'app',
  })
  @IsEnum(BlockItemType)
  type: BlockItemType;

  @ApiProperty({
    description:
      'Identifier for the block item (bundle ID for apps, domain for websites, category ID for app categories)',
    example: 'com.facebook.Facebook or facebook.com',
  })
  @IsString()
  identifier: string;

  @ApiProperty({
    description: 'User-friendly name for the block item',
    example: 'Facebook',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Whether the block item is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Category ID (only for app_category type)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
