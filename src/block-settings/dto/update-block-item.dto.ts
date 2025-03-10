import { PartialType } from '@nestjs/swagger';
import { CreateBlockItemDto } from './create-block-item.dto';

export class UpdateBlockItemDto extends PartialType(CreateBlockItemDto) {}
