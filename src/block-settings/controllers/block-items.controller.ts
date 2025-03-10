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
import { GetUser } from '../../auth/get-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { BlockItemsService } from '../services/block-items.service';
import { CreateBlockItemDto } from '../dto/create-block-item.dto';
import { UpdateBlockItemDto } from '../dto/update-block-item.dto';
import { BlockItem } from '../entities/block-item.entity';

@ApiTags('Block Items')
@Controller('block-lists/:blockListId/items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlockItemsController {
  constructor(private readonly blockItemsService: BlockItemsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all block items for a block list' })
  @ApiParam({ name: 'blockListId', description: 'Block list ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of block items',
    type: [BlockItem],
  })
  @ApiResponse({ status: 404, description: 'Block list not found' })
  findAll(
    @Param('blockListId') blockListId: string,
    @GetUser() user: User,
  ): Promise<BlockItem[]> {
    return this.blockItemsService.findAll(blockListId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a block item by ID' })
  @ApiParam({ name: 'blockListId', description: 'Block list ID' })
  @ApiParam({ name: 'id', description: 'Block item ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the block item',
    type: BlockItem,
  })
  @ApiResponse({ status: 404, description: 'Block item not found' })
  findOne(
    @Param('id') id: string,
    @Param('blockListId') blockListId: string,
    @GetUser() user: User,
  ): Promise<BlockItem> {
    return this.blockItemsService.findOne(id, blockListId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new block item in a block list' })
  @ApiParam({ name: 'blockListId', description: 'Block list ID' })
  @ApiResponse({
    status: 201,
    description: 'The block item has been created',
    type: BlockItem,
  })
  @ApiResponse({ status: 404, description: 'Block list not found' })
  create(
    @Param('blockListId') blockListId: string,
    @Body() createBlockItemDto: CreateBlockItemDto,
    @GetUser() user: User,
  ): Promise<BlockItem> {
    return this.blockItemsService.create(
      blockListId,
      createBlockItemDto,
      user.id,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a block item' })
  @ApiParam({ name: 'blockListId', description: 'Block list ID' })
  @ApiParam({ name: 'id', description: 'Block item ID' })
  @ApiResponse({
    status: 200,
    description: 'The block item has been updated',
    type: BlockItem,
  })
  @ApiResponse({ status: 404, description: 'Block item not found' })
  update(
    @Param('id') id: string,
    @Param('blockListId') blockListId: string,
    @Body() updateBlockItemDto: UpdateBlockItemDto,
    @GetUser() user: User,
  ): Promise<BlockItem> {
    return this.blockItemsService.update(
      id,
      blockListId,
      updateBlockItemDto,
      user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a block item' })
  @ApiParam({ name: 'blockListId', description: 'Block list ID' })
  @ApiParam({ name: 'id', description: 'Block item ID' })
  @ApiResponse({
    status: 200,
    description: 'The block item has been deleted',
  })
  @ApiResponse({ status: 404, description: 'Block item not found' })
  remove(
    @Param('id') id: string,
    @Param('blockListId') blockListId: string,
    @GetUser() user: User,
  ): Promise<void> {
    return this.blockItemsService.remove(id, blockListId, user.id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple block items in a block list' })
  @ApiParam({ name: 'blockListId', description: 'Block list ID' })
  @ApiResponse({
    status: 201,
    description: 'The block items have been created',
    type: [BlockItem],
  })
  @ApiResponse({ status: 404, description: 'Block list not found' })
  createBulk(
    @Param('blockListId') blockListId: string,
    @Body() createBlockItemDtos: CreateBlockItemDto[],
    @GetUser() user: User,
  ): Promise<BlockItem[]> {
    return this.blockItemsService.createBulk(
      blockListId,
      createBlockItemDtos,
      user.id,
    );
  }
}
