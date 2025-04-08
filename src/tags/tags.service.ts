import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TagsRepository } from './tags.repository';
import { CreateTagDto, UpdateTagDto } from './tags.dto';
import { Tag } from './tags.entity';
import { ILike, In } from 'typeorm';
import { SecurityLoggerService } from '../common/services/security-logger.service';

@Injectable()
export class TagsService {
  constructor(
    private tagsRepository: TagsRepository,
    // private securityLogger: SecurityLoggerService, // Inject if logging needed
  ) {}

  private async checkTagOwnership(tagId: string, userId: string): Promise<Tag> {
    const tag = await this.tagsRepository.getTagById(tagId);
    if (!tag) {
      throw new NotFoundException(`Tag with ID "${tagId}" not found`);
    }
    if (tag.userId !== userId && !tag.isSystem) {
      throw new ForbiddenException('You do not own this tag');
    }
    return tag;
  }

  async getTags(userId: string): Promise<Tag[]> {
    return this.tagsRepository.getTags(userId);
  }

  async getTagById(id: string, userId: string): Promise<Tag> {
    return this.checkTagOwnership(id, userId);
  }

  async createTag(createTagDto: CreateTagDto, userId: string): Promise<Tag> {
    return this.tagsRepository.createTag(createTagDto, userId);
  }

  async updateTag(
    id: string,
    updateTagDto: UpdateTagDto,
    userId: string,
  ): Promise<Tag> {
    await this.checkTagOwnership(id, userId);
    return this.tagsRepository.updateTag(id, updateTagDto);
  }

  async deleteTag(id: string, userId: string): Promise<void> {
    await this.checkTagOwnership(id, userId);
    await this.tagsRepository.deleteTag(id);
  }

  async getTagsByIds(ids: string[], userId: string): Promise<Tag[]> {
    return this.tagsRepository.getTagsByIds(ids, userId);
  }

  async getTagStats(
    userId: string,
  ): Promise<Array<{ tag: Tag; taskCount: number }>> {
    return this.tagsRepository.getTagStats(userId);
  }

  async findSimilarTags(name: string, userId: string): Promise<Tag[]> {
    return this.tagsRepository.findSimilarTags(name, userId);
  }

  async getMostUsedTags(
    limit: number = 5,
    userId: string,
  ): Promise<Array<{ tag: Tag; taskCount: number }>> {
    const stats = await this.getTagStats(userId);
    return stats.sort((a, b) => b.taskCount - a.taskCount).slice(0, limit);
  }

  async getUnusedTags(userId: string): Promise<Tag[]> {
    const stats = await this.getTagStats(userId);
    return stats.filter((stat) => stat.taskCount === 0).map((stat) => stat.tag);
  }

  async countTags(
    filters: Record<string, any>,
    userId: string,
  ): Promise<number> {
    const userFilters = { ...filters, userId: userId };
    return this.tagsRepository.countTags(userFilters);
  }
}
