import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockItem } from '../entities/block-item.entity';
import { BlockList } from '../entities/block-list.entity';
import { CreateBlockItemDto } from '../dto/create-block-item.dto';
import { UpdateBlockItemDto } from '../dto/update-block-item.dto';

@Injectable()
export class BlockItemsService {
  constructor(
    @InjectRepository(BlockItem)
    private blockItemRepository: Repository<BlockItem>,
    @InjectRepository(BlockList)
    private blockListRepository: Repository<BlockList>,
  ) {}

  async findAll(blockListId: string, userId: string): Promise<BlockItem[]> {
    // First check if the block list exists and belongs to the user
    const blockList = await this.blockListRepository.findOne({
      where: { id: blockListId, userId },
    });

    if (!blockList) {
      throw new NotFoundException(
        `Block list with ID ${blockListId} not found`,
      );
    }

    // Find all items in the list
    return this.blockItemRepository.find({
      where: { blockListId },
      relations: ['category'],
    });
  }

  async findOne(
    id: string,
    blockListId: string,
    userId: string,
  ): Promise<BlockItem> {
    // First check if the block list exists and belongs to the user
    const blockList = await this.blockListRepository.findOne({
      where: { id: blockListId, userId },
    });

    if (!blockList) {
      throw new NotFoundException(
        `Block list with ID ${blockListId} not found`,
      );
    }

    // Find the item
    const blockItem = await this.blockItemRepository.findOne({
      where: { id, blockListId },
      relations: ['category'],
    });

    if (!blockItem) {
      throw new NotFoundException(`Block item with ID ${id} not found`);
    }

    return blockItem;
  }

  async create(
    blockListId: string,
    createBlockItemDto: CreateBlockItemDto,
    userId: string,
  ): Promise<BlockItem> {
    // First check if the block list exists and belongs to the user
    const blockList = await this.blockListRepository.findOne({
      where: { id: blockListId, userId },
    });

    if (!blockList) {
      throw new NotFoundException(
        `Block list with ID ${blockListId} not found`,
      );
    }

    // Create the block item
    const blockItem = this.blockItemRepository.create({
      ...createBlockItemDto,
      blockListId,
    });

    // Save the block item
    return this.blockItemRepository.save(blockItem);
  }

  async update(
    id: string,
    blockListId: string,
    updateBlockItemDto: UpdateBlockItemDto,
    userId: string,
  ): Promise<BlockItem> {
    // First check if the block list exists and belongs to the user
    const blockItem = await this.findOne(id, blockListId, userId);

    // Update only the allowed fields
    if (updateBlockItemDto.type !== undefined) {
      blockItem.type = updateBlockItemDto.type;
    }

    if (updateBlockItemDto.identifier !== undefined) {
      blockItem.identifier = updateBlockItemDto.identifier;
    }

    if (updateBlockItemDto.name !== undefined) {
      blockItem.name = updateBlockItemDto.name;
    }

    if (updateBlockItemDto.isActive !== undefined) {
      blockItem.isActive = updateBlockItemDto.isActive;
    }

    if (updateBlockItemDto.categoryId !== undefined) {
      blockItem.categoryId = updateBlockItemDto.categoryId;
    }

    // Save the changes
    return this.blockItemRepository.save(blockItem);
  }

  async remove(id: string, blockListId: string, userId: string): Promise<void> {
    // First check if the block list exists and belongs to the user
    const blockItem = await this.findOne(id, blockListId, userId);

    // Remove the block item
    await this.blockItemRepository.remove(blockItem);
  }

  async createBulk(
    blockListId: string,
    createBlockItemDtos: CreateBlockItemDto[],
    userId: string,
  ): Promise<BlockItem[]> {
    // First check if the block list exists and belongs to the user
    const blockList = await this.blockListRepository.findOne({
      where: { id: blockListId, userId },
    });

    if (!blockList) {
      throw new NotFoundException(
        `Block list with ID ${blockListId} not found`,
      );
    }

    // Create the block items
    const blockItems = createBlockItemDtos.map((dto) =>
      this.blockItemRepository.create({
        ...dto,
        blockListId,
      }),
    );

    // Save all items
    return this.blockItemRepository.save(blockItems);
  }
}
