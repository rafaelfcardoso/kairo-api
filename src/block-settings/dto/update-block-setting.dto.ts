import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsBoolean, IsOptional } from 'class-validator';
import { BlockType } from '../entities/block-setting.entity';

export class UpdateBlockSettingDto {
  @ApiProperty({
    enum: BlockType,
    description: 'Type of block (app or website)',
    example: BlockType.APP,
    required: false,
  })
  @IsEnum(BlockType)
  @IsOptional()
  type?: BlockType;

  @ApiProperty({
    description: 'Identifier for the app or website (bundle ID or domain)',
    example: 'com.example.app or example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  identifier?: string;

  @ApiProperty({
    description: 'Whether the block setting is active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
