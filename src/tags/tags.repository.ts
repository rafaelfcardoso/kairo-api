import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, ILike, In, FindOptionsWhere } from 'typeorm';
import { Tag } from './tags.entity';
import { CreateTagDto, UpdateTagDto } from './tags.dto';

@Injectable()
export class TagsRepository {
  protected repository: Repository<Tag>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Tag);
  }

  async getTags(userId: string): Promise<Tag[]> {
    return this.repository.find({
      where: { userId: userId },
      relations: ['tasks'],
      order: { name: 'ASC' },
    });
  }

  async getTagById(id: string): Promise<Tag> {
    const tag = await this.repository.findOne({
      where: { id },
      relations: ['tasks'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID "${id}" not found`);
    }

    return tag;
  }

  async createTag(createTagDto: CreateTagDto, userId: string): Promise<Tag> {
    const tag = this.repository.create({
      ...createTagDto,
      userId: userId,
    });
    await this.repository.save(tag);
    return this.getTagById(tag.id);
  }

  async updateTag(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.getTagById(id);
    Object.assign(tag, updateTagDto);
    await this.repository.save(tag);
    return this.getTagById(id);
  }

  async deleteTag(id: string): Promise<void> {
    await this.getTagById(id);
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Tag with ID "${id}" not found during delete`,
      );
    }
  }

  async getTagsByIds(ids: string[], userId: string): Promise<Tag[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    const potentialTags = await this.repository.find({
      where: { id: In(ids) },
    });

    const accessibleTags = potentialTags.filter((tag) => tag.userId === userId);

    return accessibleTags;
  }

  async getTagStats(
    userId: string,
  ): Promise<Array<{ tag: Tag; taskCount: number }>> {
    const tags = await this.repository.find({
      where: { userId: userId },
      relations: ['tasks'],
    });

    return tags.map((tag) => ({
      tag,
      taskCount: tag.tasks.length,
    }));
  }

  async findSimilarTags(name: string, userId: string): Promise<Tag[]> {
    return this.repository.find({
      where: { name: ILike(`%${name}%`), userId: userId },
      relations: ['tasks'],
    });
  }

  async countTags(where: FindOptionsWhere<Tag>): Promise<number> {
    return this.repository.count({ where });
  }
}
