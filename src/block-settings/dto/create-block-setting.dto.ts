import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { BlockType } from '../entities/block-setting.entity';

export class CreateBlockSettingDto {
  @ApiProperty({
    enum: BlockType,
    description: 'Type of block (app or website)',
    example: BlockType.APP,
  })
  @IsEnum(BlockType)
  @IsNotEmpty()
  type: BlockType;

  @ApiProperty({
    description: 'Identifier for the app or website (bundle ID or domain)',
    example: 'com.example.app or example.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    description: 'Whether the block setting is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
