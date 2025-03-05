import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockSetting, BlockType } from './entities/block-setting.entity';
import { CreateBlockSettingDto } from './dto/create-block-setting.dto';
import { UpdateBlockSettingDto } from './dto/update-block-setting.dto';

@Injectable()
export class BlockSettingsService {
  constructor(
    @InjectRepository(BlockSetting)
    private blockSettingRepository: Repository<BlockSetting>,
  ) {}

  async findAll(userId: string): Promise<BlockSetting[]> {
    return this.blockSettingRepository.find({
      where: { userId },
    });
  }

  async findOne(id: string, userId: string): Promise<BlockSetting> {
    const blockSetting = await this.blockSettingRepository.findOne({
      where: { id, userId },
    });

    if (!blockSetting) {
      throw new NotFoundException(`Block setting with ID ${id} not found`);
    }

    return blockSetting;
  }

  async create(
    createBlockSettingDto: CreateBlockSettingDto,
    userId: string,
  ): Promise<BlockSetting> {
    const blockSetting = this.blockSettingRepository.create({
      ...createBlockSettingDto,
      userId,
    });

    return this.blockSettingRepository.save(blockSetting);
  }

  async update(
    id: string,
    updateBlockSettingDto: UpdateBlockSettingDto,
    userId: string,
  ): Promise<BlockSetting> {
    const blockSetting = await this.findOne(id, userId);

    // Update the block setting
    Object.assign(blockSetting, updateBlockSettingDto);

    return this.blockSettingRepository.save(blockSetting);
  }

  async remove(id: string, userId: string): Promise<void> {
    const blockSetting = await this.findOne(id, userId);
    await this.blockSettingRepository.remove(blockSetting);
  }
}
