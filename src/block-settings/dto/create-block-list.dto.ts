import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBlockItemDto } from './create-block-item.dto';

export class CreateBlockListDto {
  @ApiProperty({
    description: 'Name of the block list',
    example: 'Social Media',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the block list',
    example: 'Block all social media apps and websites',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the block list is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Initial block items to add to the list',
    type: [CreateBlockItemDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBlockItemDto)
  @IsOptional()
  items?: CreateBlockItemDto[];
}
