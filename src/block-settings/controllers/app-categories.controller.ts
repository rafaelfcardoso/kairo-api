import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AppCategoriesService } from '../services/app-categories.service';
import { CreateAppCategoryDto } from '../dto/create-app-category.dto';
import { UpdateAppCategoryDto } from '../dto/update-app-category.dto';
import { AppCategory } from '../entities/app-category.entity';

@ApiTags('App Categories')
@Controller('app-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppCategoriesController {
  constructor(private readonly appCategoriesService: AppCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all app categories' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of app categories',
    type: [AppCategory],
  })
  findAll(): Promise<AppCategory[]> {
    return this.appCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an app category by ID' })
  @ApiParam({ name: 'id', description: 'App category ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the app category',
    type: AppCategory,
  })
  @ApiResponse({ status: 404, description: 'App category not found' })
  findOne(@Param('id') id: string): Promise<AppCategory> {
    return this.appCategoriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new app category' })
  @ApiResponse({
    status: 201,
    description: 'The app category has been created',
    type: AppCategory,
  })
  @ApiResponse({
    status: 409,
    description: 'App category with this systemId already exists',
  })
  create(
    @Body() createAppCategoryDto: CreateAppCategoryDto,
  ): Promise<AppCategory> {
    return this.appCategoriesService.create(createAppCategoryDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an app category' })
  @ApiParam({ name: 'id', description: 'App category ID' })
  @ApiResponse({
    status: 200,
    description: 'The app category has been updated',
    type: AppCategory,
  })
  @ApiResponse({ status: 404, description: 'App category not found' })
  @ApiResponse({
    status: 409,
    description: 'App category with this systemId already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateAppCategoryDto: UpdateAppCategoryDto,
  ): Promise<AppCategory> {
    return this.appCategoriesService.update(id, updateAppCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an app category' })
  @ApiParam({ name: 'id', description: 'App category ID' })
  @ApiResponse({
    status: 200,
    description: 'The app category has been deleted',
  })
  @ApiResponse({ status: 404, description: 'App category not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete category with associated block items',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.appCategoriesService.remove(id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed default app categories' })
  @ApiResponse({
    status: 201,
    description: 'Default app categories have been seeded',
    type: [AppCategory],
  })
  seedDefaultCategories(): Promise<AppCategory[]> {
    return this.appCategoriesService.seedDefaultCategories();
  }
}
