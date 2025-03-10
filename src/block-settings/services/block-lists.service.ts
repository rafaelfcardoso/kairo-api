import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockList } from '../entities/block-list.entity';
import { BlockItem } from '../entities/block-item.entity';
import { CreateBlockListDto } from '../dto/create-block-list.dto';
import { UpdateBlockListDto } from '../dto/update-block-list.dto';

@Injectable()
export class BlockListsService {
  constructor(
    @InjectRepository(BlockList)
    private blockListRepository: Repository<BlockList>,
    @InjectRepository(BlockItem)
    private blockItemRepository: Repository<BlockItem>,
  ) {}

  async findAll(userId: string): Promise<BlockList[]> {
    return this.blockListRepository.find({
      where: { userId },
      relations: ['items', 'items.category'],
    });
  }

  async findOne(id: string, userId: string): Promise<BlockList> {
    const blockList = await this.blockListRepository.findOne({
      where: { id, userId },
      relations: ['items', 'items.category'],
    });

    if (!blockList) {
      throw new NotFoundException(`Block list with ID ${id} not found`);
    }

    return blockList;
  }

  async create(
    createBlockListDto: CreateBlockListDto,
    userId: string,
  ): Promise<BlockList> {
    // Create the block list
    const blockList = this.blockListRepository.create({
      ...createBlockListDto,
      userId,
      items: [],
    });

    // Save the block list first to get its ID
    const savedBlockList = await this.blockListRepository.save(blockList);

    // If items are provided, create them as well
    if (createBlockListDto.items && createBlockListDto.items.length > 0) {
      const items = createBlockListDto.items.map((itemDto) => ({
        ...itemDto,
        blockListId: savedBlockList.id,
      }));

      // Save all items
      const savedItems = await this.blockItemRepository.save(items);

      // Update the list with the items
      savedBlockList.items = savedItems;
    }

    return savedBlockList;
  }

  async update(
    id: string,
    updateBlockListDto: UpdateBlockListDto,
    userId: string,
  ): Promise<BlockList> {
    const blockList = await this.findOne(id, userId);

    // Update only the allowed fields
    if (updateBlockListDto.name !== undefined) {
      blockList.name = updateBlockListDto.name;
    }

    if (updateBlockListDto.description !== undefined) {
      blockList.description = updateBlockListDto.description;
    }

    if (updateBlockListDto.isActive !== undefined) {
      blockList.isActive = updateBlockListDto.isActive;
    }

    // Save the changes
    return this.blockListRepository.save(blockList);
  }

  async remove(id: string, userId: string): Promise<void> {
    const blockList = await this.findOne(id, userId);

    // This will cascade delete items due to our entity relationship
    await this.blockListRepository.remove(blockList);
  }

  async addItemsToList(
    id: string,
    itemIds: string[],
    userId: string,
  ): Promise<BlockList> {
    const blockList = await this.findOne(id, userId);

    // Get items by IDs
    const items = await this.blockItemRepository.findByIds(itemIds);

    // Add them to the list
    blockList.items = [...blockList.items, ...items];

    return this.blockListRepository.save(blockList);
  }

  async removeItemsFromList(
    id: string,
    itemIds: string[],
    userId: string,
  ): Promise<BlockList> {
    const blockList = await this.findOne(id, userId);

    // Filter out items with the specified IDs
    blockList.items = blockList.items.filter(
      (item) => !itemIds.includes(item.id),
    );

    return this.blockListRepository.save(blockList);
  }
}
