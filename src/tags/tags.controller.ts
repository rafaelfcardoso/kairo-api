import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './tags.dto';
import { Tag } from './tags.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved tags successfully',
    type: [Tag],
  })
  async getTags(): Promise<Tag[]> {
    return this.tagsService.getTags();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tags by name' })
  @ApiQuery({ name: 'name', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Found matching tags',
    type: [Tag],
  })
  async searchTags(@Query('name') name: string): Promise<Tag[]> {
    return this.tagsService.findSimilarTags(name);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get tag usage statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved tag statistics successfully',
  })
  async getTagStats(): Promise<Array<{ tag: Tag; taskCount: number }>> {
    return this.tagsService.getTagStats();
  }

  @Get('most-used')
  @ApiOperation({ summary: 'Get most used tags' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved most used tags successfully',
  })
  async getMostUsedTags(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<Array<{ tag: Tag; taskCount: number }>> {
    return this.tagsService.getMostUsedTags(limit);
  }

  @Get('unused')
  @ApiOperation({ summary: 'Get unused tags' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved unused tags successfully',
    type: [Tag],
  })
  async getUnusedTags(): Promise<Tag[]> {
    return this.tagsService.getUnusedTags();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved tag successfully',
    type: Tag,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tag not found',
  })
  async getTagById(@Param('id', ParseUUIDPipe) id: string): Promise<Tag> {
    return this.tagsService.getTagById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tag created successfully',
    type: Tag,
  })
  async createTag(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagsService.createTag(createTagDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tag updated successfully',
    type: Tag,
  })
  async updateTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<Tag> {
    return this.tagsService.updateTag(id, updateTagDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Tag deleted successfully',
  })
  async deleteTag(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tagsService.deleteTag(id);
  }
} 