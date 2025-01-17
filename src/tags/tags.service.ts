import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TagRepository } from './tags.repository';
import { CreateTagDto, UpdateTagDto } from './tags.dto';
import { Tag } from './tags.entity';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(TagRepository)
    private tagRepository: TagRepository,
  ) {}

  async getTags(): Promise<Tag[]> {
    return this.tagRepository.getTags();
  }

  async getTagById(id: string): Promise<Tag> {
    return this.tagRepository.getTagById(id);
  }

  async createTag(createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagRepository.createTag(createTagDto);
  }

  async updateTag(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    return this.tagRepository.updateTag(id, updateTagDto);
  }

  async deleteTag(id: string): Promise<void> {
    await this.tagRepository.deleteTag(id);
  }

  async getTagsByIds(ids: string[]): Promise<Tag[]> {
    return this.tagRepository.getTagsByIds(ids);
  }

  async getTagStats(): Promise<Array<{ tag: Tag; taskCount: number }>> {
    return this.tagRepository.getTagStats();
  }

  async findSimilarTags(name: string): Promise<Tag[]> {
    return this.tagRepository.findSimilarTags(name);
  }

  async getMostUsedTags(limit: number = 5): Promise<Array<{ tag: Tag; taskCount: number }>> {
    const stats = await this.getTagStats();
    return stats
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, limit);
  }

  async getUnusedTags(): Promise<Tag[]> {
    const stats = await this.getTagStats();
    return stats
      .filter(stat => stat.taskCount === 0)
      .map(stat => stat.tag);
  }
} 