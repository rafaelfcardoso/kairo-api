import { Injectable } from '@nestjs/common';
import { TagsRepository } from './tags.repository';
import { CreateTagDto, UpdateTagDto } from './tags.dto';
import { Tag } from './tags.entity';

@Injectable()
export class TagsService {
  constructor(private tagsRepository: TagsRepository) {}

  async getTags(): Promise<Tag[]> {
    return this.tagsRepository.getTags();
  }

  async getTagById(id: string): Promise<Tag> {
    return this.tagsRepository.getTagById(id);
  }

  async createTag(createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagsRepository.createTag(createTagDto);
  }

  async updateTag(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    return this.tagsRepository.updateTag(id, updateTagDto);
  }

  async deleteTag(id: string): Promise<void> {
    await this.tagsRepository.deleteTag(id);
  }

  async getTagsByIds(ids: string[]): Promise<Tag[]> {
    return this.tagsRepository.getTagsByIds(ids);
  }

  async getTagStats(): Promise<Array<{ tag: Tag; taskCount: number }>> {
    return this.tagsRepository.getTagStats();
  }

  async findSimilarTags(name: string): Promise<Tag[]> {
    return this.tagsRepository.findSimilarTags(name);
  }

  async getMostUsedTags(
    limit: number = 5,
  ): Promise<Array<{ tag: Tag; taskCount: number }>> {
    const stats = await this.getTagStats();
    return stats.sort((a, b) => b.taskCount - a.taskCount).slice(0, limit);
  }

  async getUnusedTags(): Promise<Tag[]> {
    const stats = await this.getTagStats();
    return stats.filter((stat) => stat.taskCount === 0).map((stat) => stat.tag);
  }

  async getGoalTags(): Promise<Tag[]> {
    return this.tagsRepository.getGoalTags();
  }

  async toggleGoalStatus(id: string): Promise<Tag> {
    const tag = await this.getTagById(id);
    return this.tagsRepository.updateTag(id, { isGoal: !tag.isGoal });
  }

  /**
   * Count tags based on filter criteria
   * @param filters Object with filter criteria
   * @returns Number of tags matching the filters
   */
  async countTags(filters: Record<string, any>): Promise<number> {
    const query = this.tagsRepository.createQueryBuilder('tag');

    // Apply filters if provided
    if (filters.name) {
      query.andWhere('tag.name LIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.color) {
      query.andWhere('tag.color = :color', { color: filters.color });
    }

    return query.getCount();
  }
}
