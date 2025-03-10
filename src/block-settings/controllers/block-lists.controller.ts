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
import { BlockListsService } from '../services/block-lists.service';
import { CreateBlockListDto } from '../dto/create-block-list.dto';
import { UpdateBlockListDto } from '../dto/update-block-list.dto';
import { BlockList } from '../entities/block-list.entity';

@ApiTags('Block Lists')
@Controller('block-lists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlockListsController {
  constructor(private readonly blockListsService: BlockListsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all block lists for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of block lists',
    type: [BlockList],
  })
  findAll(@GetUser() user: User): Promise<BlockList[]> {
    return this.blockListsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a block list by ID' })
  @ApiParam({ name: 'id', description: 'Block list ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the block list',
    type: BlockList,
  })
  @ApiResponse({ status: 404, description: 'Block list not found' })
  findOne(@Param('id') id: string, @GetUser() user: User): Promise<BlockList> {
    return this.blockListsService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new block list' })
  @ApiResponse({
    status: 201,
    description: 'The block list has been created',
    type: BlockList,
  })
  create(
    @Body() createBlockListDto: CreateBlockListDto,
    @GetUser() user: User,
  ): Promise<BlockList> {
    return this.blockListsService.create(createBlockListDto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a block list' })
  @ApiParam({ name: 'id', description: 'Block list ID' })
  @ApiResponse({
    status: 200,
    description: 'The block list has been updated',
    type: BlockList,
  })
  @ApiResponse({ status: 404, description: 'Block list not found' })
  update(
    @Param('id') id: string,
    @Body() updateBlockListDto: UpdateBlockListDto,
    @GetUser() user: User,
  ): Promise<BlockList> {
    return this.blockListsService.update(id, updateBlockListDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a block list' })
  @ApiParam({ name: 'id', description: 'Block list ID' })
  @ApiResponse({
    status: 200,
    description: 'The block list has been deleted',
  })
  @ApiResponse({ status: 404, description: 'Block list not found' })
  remove(@Param('id') id: string, @GetUser() user: User): Promise<void> {
    return this.blockListsService.remove(id, user.id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add items to a block list' })
  @ApiParam({ name: 'id', description: 'Block list ID' })
  @ApiResponse({
    status: 200,
    description: 'The items have been added to the block list',
    type: BlockList,
  })
  @ApiResponse({ status: 404, description: 'Block list not found' })
  addItemsToList(
    @Param('id') id: string,
    @Body() { itemIds }: { itemIds: string[] },
    @GetUser() user: User,
  ): Promise<BlockList> {
    return this.blockListsService.addItemsToList(id, itemIds, user.id);
  }

  @Delete(':id/items')
  @ApiOperation({ summary: 'Remove items from a block list' })
  @ApiParam({ name: 'id', description: 'Block list ID' })
  @ApiResponse({
    status: 200,
    description: 'The items have been removed from the block list',
    type: BlockList,
  })
  @ApiResponse({ status: 404, description: 'Block list not found' })
  removeItemsFromList(
    @Param('id') id: string,
    @Body() { itemIds }: { itemIds: string[] },
    @GetUser() user: User,
  ): Promise<BlockList> {
    return this.blockListsService.removeItemsFromList(id, itemIds, user.id);
  }
}
