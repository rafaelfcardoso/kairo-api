import { PartialType } from '@nestjs/swagger';
import { CreateAppCategoryDto } from './create-app-category.dto';

export class UpdateAppCategoryDto extends PartialType(CreateAppCategoryDto) {}
